/** Disconnected browser contract. No default endpoint, fetch, storage, logs or live UI import. */
const fields = {
  General: ['name', 'email', 'company', 'message'],
  'Company owner': ['name', 'email', 'company', 'goals'],
  Investor: ['name', 'email', 'firm', 'interest'],
  Careers: ['name', 'email', 'mobile', 'role', 'links'],
};
const messages = {
  en: {
    unavailable:
      'Submissions are currently unavailable. Nothing has been sent.',
    invalid:
      'Check the required fields, privacy confirmation and PDF CV (up to 5 MB).',
    busy: 'Your submission is being processed. Please wait.',
    challenge: 'Verification was not completed. Please try again.',
    submitted: 'Thank you! Your submission has been received.',
    receipt_pending:
      'Your submission has been received, but the confirmation email is not confirmed. Retrying will check the same submission.',
    receipt_review:
      'Your submission has been received. The confirmation email needs review; please do not submit again.',
    uncertain:
      'We could not confirm receipt. Retry this same submission; do not create a new one.',
    review:
      'Receipt could not be confirmed and needs review. Please do not submit again.',
    conflict:
      'This submission cannot be safely retried. Please contact the team before starting another.',
  },
  el: {
    unavailable:
      'Οι υποβολές δεν είναι διαθέσιμες αυτή τη στιγμή. Δεν έχει σταλεί τίποτα.',
    invalid:
      'Έλεγξε τα υποχρεωτικά πεδία, την επιβεβαίωση απορρήτου και το βιογραφικό PDF (έως 5 MB).',
    busy: 'Η υποβολή σου βρίσκεται σε εξέλιξη. Περίμενε λίγο.',
    challenge: 'Η επαλήθευση δεν ολοκληρώθηκε. Δοκίμασε ξανά.',
    submitted: 'Ευχαριστούμε! Λάβαμε την υποβολή σου.',
    receipt_pending:
      'Λάβαμε την υποβολή σου, αλλά δεν επιβεβαιώθηκε το email επιβεβαίωσης. Η επανάληψη θα ελέγξει την ίδια υποβολή.',
    receipt_review:
      'Λάβαμε την υποβολή σου. Το email επιβεβαίωσης χρειάζεται έλεγχο· μην υποβάλεις ξανά.',
    uncertain:
      'Δεν μπορέσαμε να επιβεβαιώσουμε την παραλαβή. Επανάλαβε την ίδια υποβολή, χωρίς να δημιουργήσεις νέα.',
    review:
      'Η παραλαβή δεν επιβεβαιώθηκε και χρειάζεται έλεγχο. Μην υποβάλεις ξανά.',
    conflict:
      'Η υποβολή δεν μπορεί να επαναληφθεί με ασφάλεια. Επικοινώνησε με την ομάδα πριν ξεκινήσεις νέα.',
  },
};
const digest = async (bytes) =>
  Array.from(
    new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
async function snapshot(input) {
  input = { ...input, values: { ...input?.values } };
  if (
    !input ||
    !Object.hasOwn(fields, input.audience) ||
    !['en', 'el'].includes(input.language) ||
    input.privacyAccepted !== true ||
    typeof input.privacyVersion !== 'string' ||
    !input.privacyVersion ||
    input.privacyVersion.length > 250
  )
    throw Error('invalid');
  const values = {};
  for (const key of fields[input.audience]) {
    if (input.values?.[key] != null && typeof input.values[key] !== 'string')
      throw Error('invalid');
    const value = (input.values?.[key] || '').trim();
    const optional =
      ['mobile', 'links'].includes(key) ||
      (key === 'company' && input.audience === 'General');
    if (
      (!optional && !value) ||
      value.length >
        (['message', 'goals', 'interest', 'links'].includes(key) ? 5000 : 250)
    )
      throw Error('invalid');
    values[key] = value;
  }
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(values.email))
    throw Error('invalid');
  const cv = input.audience === 'Careers' ? input.cv : null;
  let cvHash = null;
  if (input.audience === 'Careers') {
    if (
      !cv ||
      cv.type !== 'application/pdf' ||
      !cv.name?.toLowerCase().endsWith('.pdf') ||
      !cv.size ||
      cv.size > 5000000 ||
      new globalThis.TextDecoder().decode(
        await cv.slice(0, 5).arrayBuffer(),
      ) !== '%PDF-'
    )
      throw Error('invalid');
    cvHash = await digest(await cv.arrayBuffer());
  }
  const data = {
    audience: input.audience,
    language: input.language,
    privacyVersion: String(input.privacyVersion),
    values,
    cv,
  };
  const fingerprint = await digest(
    new globalThis.TextEncoder().encode(
      JSON.stringify({ ...data, cv: cvHash }),
    ),
  );
  return { data, fingerprint };
}
export function createIntakeClient({
  enabled = false,
  challenge,
  send,
  now = () => Date.now(),
  uuid = () => globalThis.crypto.randomUUID(),
} = {}) {
  let current = null,
    busy = false;
  const outcome = (
    state,
    language,
    accepted = false,
    retryable = false,
    reference,
  ) =>
    Object.freeze({
      state,
      accepted,
      retryable,
      reference,
      message: messages[language === 'el' ? 'el' : 'en'][state],
    });
  return {
    /** Explicit new-submission action only; never call on an uncertain transport result. */
    startNewSubmission() {
      if (busy) return false;
      current = null;
      return true;
    },
    async submit(input) {
      const language = input?.language;
      if (
        !enabled ||
        typeof challenge !== 'function' ||
        typeof send !== 'function'
      )
        return outcome('unavailable', language);
      if (busy) return outcome('busy', language);
      busy = true;
      try {
        let saved;
        try {
          saved = await snapshot(input);
        } catch {
          return outcome('invalid', language);
        }
        if (!current || current.fingerprint !== saved.fingerprint)
          current = {
            fingerprint: saved.fingerprint,
            id: `${now()}_${uuid()}`,
          };
        if (current.terminal) return current.terminal;
        const retryOutcome = () =>
          current.accepted
            ? outcome(
                'receipt_pending',
                language,
                true,
                true,
                current.reference,
              )
            : outcome('uncertain', language, false, true);
        let token;
        try {
          token = await challenge({
            action: saved.data.audience === 'Careers' ? 'careers' : 'contact',
            language,
          });
        } catch {
          return current.accepted
            ? retryOutcome()
            : outcome('challenge', language, false, true);
        }
        if (
          typeof token !== 'string' ||
          !token ||
          token.length > 2048 ||
          token === current.lastToken
        )
          return current.accepted
            ? retryOutcome()
            : outcome('challenge', language, false, true);
        current.lastToken = token;
        const body = new globalThis.FormData();
        for (const [key, value] of Object.entries(saved.data.values))
          body.set(key, value);
        for (const [key, value] of Object.entries({
          audience: saved.data.audience,
          language: saved.data.language,
          privacyVersion: saved.data.privacyVersion,
          privacyAccepted: 'true',
          submissionId: current.id,
          turnstileToken: token,
        }))
          body.set(key, value);
        if (saved.data.cv) body.set('cv', saved.data.cv, saved.data.cv.name);
        let response, result;
        try {
          response = await send(body);
          result = await response.json();
        } catch {
          return retryOutcome();
        }
        const reference = /^[0-9a-f-]{36}$/.test(result?.reference || '')
          ? result.reference
          : undefined;
        if (current.accepted && ![201, 202].includes(response.status)) {
          if (
            [409, 410].includes(response.status) ||
            result?.code === 'delivery_review_required'
          ) {
            current.terminal = outcome(
              'receipt_review',
              language,
              true,
              false,
              current.reference,
            );
            return current.terminal;
          }
          return retryOutcome();
        }
        let value;
        if (response.status === 201 && result?.code === 'submitted')
          value = outcome('submitted', language, true, false, reference);
        else if (
          response.status === 202 &&
          result?.code === 'submitted_receipt_pending'
        ) {
          current.accepted = true;
          current.reference = reference;
          return retryOutcome();
        } else if (
          response.status === 202 &&
          result?.code === 'submitted_receipt_review_required'
        )
          value = outcome('receipt_review', language, true, false, reference);
        else if (
          response.status === 503 &&
          result?.code === 'delivery_review_required'
        )
          value = outcome('review', language, false, false, reference);
        else if ([409, 410].includes(response.status))
          value = outcome('conflict', language, false, false, reference);
        else return retryOutcome();
        current.terminal = value;
        return value;
      } finally {
        busy = false;
      }
    },
  };
}
