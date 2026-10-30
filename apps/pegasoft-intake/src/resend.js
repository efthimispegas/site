/** No SDK, logs, attachments, or alternate transport. Provider bodies stay private. */
export async function sendResend(message, key, env, fetcher = fetch) {
  if (
    env.PEGASOFT_RESEND_API_URL !== 'https://api.resend.com/emails' ||
    !env.RESEND_API_KEY
  )
    throw Error('provider_unconfigured');
  const result = await fetcher(env.PEGASOFT_RESEND_API_URL, {
    method: 'POST',
    // Workers supports manual, not error; non-2xx (including redirects) fail below.
    redirect: 'manual',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(8000),
  });
  if (!result.ok) throw Error('provider_unconfirmed');
  const body = await result.json();
  if (typeof body.id !== 'string' || !body.id || body.id.length > 128)
    throw Error('provider_unconfirmed');
  return body.id;
}

/** Proposed human receipt copy; final wording remains an activation review gate. */
export function receipt(language, careers) {
  if (language === 'el')
    return {
      subject: careers
        ? 'Το βιογραφικό σου έφτασε στην Pegasoft'
        : 'Το μήνυμά σου έφτασε στην Pegasoft',
      text: careers
        ? 'Ευχαριστούμε που θέλεις να γίνεις μέρος της Pegasoft! Λάβαμε την αίτησή σου και η ομάδα μας θα την εξετάσει. Αν θέλεις να προσθέσεις κάτι, μπορείς να απαντήσεις σε αυτό το email.\n\nΗ ομάδα της Pegasoft'
        : 'Ευχαριστούμε που επικοινώνησες με την Pegasoft! Το μήνυμά σου έφτασε στην ομάδα μας. Αν θέλεις να προσθέσεις κάτι, απάντησε σε αυτό το email.\n\nΗ ομάδα της Pegasoft',
    };
  return {
    subject: careers
      ? 'Your application has landed at Pegasoft'
      : 'Your message has landed at Pegasoft',
    text: careers
      ? 'Thanks for wanting to build with Pegasoft! We’ve received your application, and our team will take a look. Anything else you’d like to share? Just reply to this email.\n\nThe Pegasoft team'
      : 'Thanks for reaching out to Pegasoft! Your message has landed with our team. Anything else you’d like to share? Just reply to this email.\n\nThe Pegasoft team',
  };
}
