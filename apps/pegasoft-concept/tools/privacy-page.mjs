const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ],
  );
export function privacyConfig(env) {
  const approved = env.PEGASOFT_PRIVACY_APPROVED === 'true',
    version = env.PEGASOFT_PRIVACY_VERSION || 'draft',
    path = env.PEGASOFT_PRIVACY_PATH || '/privacy/';
  const company = env.PEGASOFT_COMPANY_LEGAL_NAME || '',
    address = env.PEGASOFT_COMPANY_REGISTERED_ADDRESS || '',
    email = env.PEGASOFT_PRIVACY_EMAIL || '';
  if (
    !/^\/[a-z0-9-]{1,60}\/$/.test(path) ||
    !/^[a-zA-Z0-9._-]{1,100}$/.test(version) ||
    [company, address, email].some((v) => v.length > 500)
  )
    throw Error('Invalid public privacy configuration');
  if (
    approved &&
    (!company || !address || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
  )
    throw Error('Approved privacy page requires verified controller details');
  if (env.PEGASOFT_ANALYTICS_ENABLED === 'true')
    throw Error(
      'Analytics requires its separate privacy and implementation gate',
    );
  return { approved, version, path, company, address, email };
}
const copy = {
  en: {
    title: 'Privacy notice',
    draft: 'Draft for owner review — not approved for form activation.',
    back: 'Back to Pegasoft',
    switch: 'Ελληνικά',
    pending: 'Pending configuration',
    status:
      'Contact will be activated first after end-to-end qualification. Careers applications remain unavailable until private CV processing is verified. Sections below describe the intended processing when each form is enabled.',
    sections: [
      [
        'Who is responsible',
        'The controller is identified below. Use the privacy contact for enquiries about this notice or your personal data. This address is a privacy contact; no separate Data Protection Officer appointment is represented.',
      ],
      [
        'What the site processes',
        'Hosting and security services process network and request details such as IP address, browser information and requested pages to serve and protect the site. The page uses graphics and animations in your browser. No optional analytics, advertising pixels, session replay or marketing measurement are currently implemented.',
      ],
      [
        'Contact forms',
        'General enquiries collect name, email, optional company and message. Company-owner enquiries collect name, business email, company/website and project goals. Investor enquiries collect name, email, firm and interest. We use these details to understand and answer your request and send an acknowledgement. Required fields are marked; without them we cannot process the online request. Do not include sensitive or unnecessary third-party information.',
      ],
      [
        'Careers and CVs — unavailable until separately qualified',
        'The planned application fields are name, email, optional mobile, role of interest, a PDF CV up to 5 MB, and optional work/profile links. Only the account owner reviews files through private storage. CVs remain quarantined and are not included in notification emails or public download links. No talent pool, onward recruitment sharing or automated candidate decisions are part of this launch. Do not include sensitive or irrelevant data in your CV.',
      ],
      [
        'Purposes and proposed legal bases',
        'Responding to a prospective contract or an application may involve steps requested before a contract (GDPR Article 6(1)(b)). General business correspondence and proportionate abuse prevention are proposed legitimate-interest purposes (Article 6(1)(f)). The form checkbox acknowledges this notice; it is not blanket consent for marketing, analytics or unrelated use. The owner must confirm the appropriate basis for each activity before activation.',
      ],
      [
        'Providers, recipients and international processing',
        'Cloudflare provides hosting, challenge checks, private file storage and delivery/admission state. Security checks use technical browser/network information. Resend sends notifications and receipts; message content includes enquiry details but no CV file. The mailbox is currently the owner’s Gmail account. Only authorised personnel may access submissions; service providers also process data to deliver their services. Resend stores messages/logs in the US, even with an Ireland sending region. Its published terms describe transfer safeguards. Google/Cloudflare processing may also involve other countries; applicable account terms and safeguards must be confirmed before launch.',
      ],
      [
        'Retention and deletion',
        'The agreed application/CV storage period is 30 days. Website-intake mailbox copies also have a 30-day policy, with notification automation and owner-managed correspondence/download cleanup treated separately. Resend’s current plan keeps message/log data for 30 days and backups for seven days. These schedules do not promise simultaneous deletion of every provider copy. Private delivery/abuse records use opaque references and keyed hashes, normally for 30 days; unresolved security or storage incidents may require a limited hold until reviewed. Actual scheduled deletion and recovery must be qualified before forms are enabled.',
      ],
      [
        'Browser storage and preferences',
        'Language and cookie-preference choices are stored locally until you clear them or their supported version changes. Form drafts, selected CVs and retry state remain in page memory; they are not placed in local/session storage or analytics. Reloading may lose that draft and retry state. Essential verification/security processing cannot be disabled by rejecting optional cookies. The current accept/reject controls do not activate any absent analytics or marketing category.',
      ],
      [
        'External links and public business content',
        'Work/profile, social and other external links lead to independent sites with their own notices. We do not automatically fetch applicants’ linked profiles. Published testimonials and business contact details are intended to use approved content; contact us to request a correction or raise a concern about personal information shown on the site.',
      ],
      [
        'Your choices and rights',
        'Depending on the circumstances, you may request access, correction, erasure, restriction, portability or object to processing. Where processing relies on consent, it can be withdrawn without affecting earlier lawful processing. You can complain to the Hellenic Data Protection Authority (dpa.gr) or your competent authority. We may request proportionate identity verification. We do not make contractual or employment decisions solely by automated processing; security checks may temporarily block a request.',
      ],
      [
        'Future analytics and changes',
        'Analytics is a separately gated activity. Before adding it, we will review its purpose, provider, data, access, retention and applicable consent requirements, update this notice/cookie controls and obtain the required approvals. No future provider or tracking plan is presented as active today. Material changes will carry a new notice version.',
      ],
      [
        'Review gates',
        'This is the full review draft. Confirm controller details, each legal basis, security-log retention, mailbox/provider terms and international safeguards, notification/correspondence retention operation, and private CV access/deletion before the respective activation. Contact qualification and Careers qualification are separate; analytics remains a future gate.',
      ],
    ],
  },
  el: {
    title: 'Ενημέρωση απορρήτου',
    draft: 'Προσχέδιο για έλεγχο — δεν έχει εγκριθεί για ενεργοποίηση φορμών.',
    back: 'Επιστροφή στην Pegasoft',
    switch: 'English',
    pending: 'Εκκρεμεί ρύθμιση',
    status:
      'Η επικοινωνία θα ενεργοποιηθεί πρώτη, μετά τον πλήρη έλεγχο της ροής. Οι αιτήσεις εργασίας παραμένουν μη διαθέσιμες έως την επαλήθευση της ιδιωτικής διαχείρισης βιογραφικών. Οι ενότητες περιγράφουν την προβλεπόμενη επεξεργασία όταν ενεργοποιηθεί κάθε φόρμα.',
    sections: [
      [
        'Υπεύθυνος επεξεργασίας',
        'Ο υπεύθυνος επεξεργασίας αναφέρεται παρακάτω. Για την παρούσα ενημέρωση ή τα προσωπικά σας δεδομένα χρησιμοποιήστε το στοιχείο επικοινωνίας απορρήτου. Πρόκειται για σημείο επικοινωνίας· δεν δηλώνεται διορισμός ξεχωριστού Υπευθύνου Προστασίας Δεδομένων.',
      ],
      [
        'Δεδομένα κατά την επίσκεψη',
        'Η φιλοξενία και η προστασία του ιστοτόπου περιλαμβάνουν τεχνικά δεδομένα δικτύου και αιτημάτων, όπως διεύθυνση IP, πληροφορίες προγράμματος περιήγησης και ζητούμενες σελίδες. Τα γραφικά και οι κινήσεις εκτελούνται στο πρόγραμμα περιήγησης. Δεν έχει υλοποιηθεί προαιρετική ανάλυση επισκεψιμότητας, διαφημιστικά pixels, καταγραφή συνεδριών ή μέτρηση marketing.',
      ],
      [
        'Φόρμες επικοινωνίας',
        'Τα γενικά αιτήματα περιλαμβάνουν όνομα, email, προαιρετική εταιρεία και μήνυμα. Τα αιτήματα ιδιοκτήτη εταιρείας περιλαμβάνουν όνομα, επαγγελματικό email, εταιρεία/ιστοσελίδα και στόχους έργου. Τα επενδυτικά αιτήματα περιλαμβάνουν όνομα, email, οργανισμό και ενδιαφέρον. Τα χρησιμοποιούμε για να κατανοήσουμε και να απαντήσουμε στο αίτημα και να στείλουμε επιβεβαίωση. Τα υποχρεωτικά πεδία επισημαίνονται· χωρίς αυτά δεν μπορεί να διεκπεραιωθεί η ηλεκτρονική υποβολή. Μην συμπεριλαμβάνετε ευαίσθητα ή περιττά στοιχεία τρίτων.',
      ],
      [
        'Αιτήσεις εργασίας και βιογραφικά — διαθέσιμα μετά από ξεχωριστή επαλήθευση',
        'Προβλέπονται όνομα, email, προαιρετικό κινητό, θέση ενδιαφέροντος, βιογραφικό PDF έως 5 MB και προαιρετικοί σύνδεσμοι εργασιών/προφίλ. Μόνο ο ιδιοκτήτης του λογαριασμού εξετάζει αρχεία μέσω ιδιωτικής αποθήκευσης. Τα βιογραφικά παραμένουν σε καραντίνα και δεν περιλαμβάνονται σε email ειδοποιήσεων ή δημόσιους συνδέσμους λήψης. Δεν προβλέπονται δεξαμενή υποψηφίων, διαβίβαση για άλλες προσλήψεις ή αυτοματοποιημένες αποφάσεις υποψηφίων. Αποφύγετε ευαίσθητες ή άσχετες πληροφορίες στο βιογραφικό.',
      ],
      [
        'Σκοποί και προτεινόμενες νομικές βάσεις',
        'Για αιτήματα πιθανής σύμβασης ή αίτησης μπορεί να απαιτούνται προσυμβατικά μέτρα κατόπιν αιτήματός σας (άρθρο 6§1β ΓΚΠΔ). Η γενική επαγγελματική αλληλογραφία και η αναλογική προστασία από κατάχρηση προτείνονται ως έννομα συμφέροντα (άρθρο 6§1στ). Το πεδίο αποδοχής επιβεβαιώνει ότι διαβάσατε την ενημέρωση· δεν είναι γενική συγκατάθεση για marketing, analytics ή άλλες χρήσεις. Η κατάλληλη βάση ανά δραστηριότητα χρειάζεται επιβεβαίωση πριν από την ενεργοποίηση.',
      ],
      [
        'Πάροχοι, αποδέκτες και διεθνής επεξεργασία',
        'Η Cloudflare παρέχει φιλοξενία, ελέγχους επαλήθευσης, ιδιωτική αποθήκευση αρχείων και κατάσταση αποστολής/ορίων. Οι έλεγχοι χρησιμοποιούν τεχνικά στοιχεία δικτύου και περιήγησης. Η Resend αποστέλλει ειδοποιήσεις και επιβεβαιώσεις με στοιχεία του αιτήματος, χωρίς αρχείο βιογραφικού. Το γραμματοκιβώτιο είναι προσωρινά ο λογαριασμός Gmail του ιδιοκτήτη. Πρόσβαση έχουν μόνο εξουσιοδοτημένα πρόσωπα· οι πάροχοι επεξεργάζονται επίσης δεδομένα για τις υπηρεσίες τους. Η Resend αποθηκεύει μηνύματα/αρχεία καταγραφής στις ΗΠΑ ακόμη και με περιοχή αποστολής την Ιρλανδία. Οι δημοσιευμένοι όροι της περιγράφουν εγγυήσεις διαβίβασης. Η Google και η Cloudflare ενδέχεται επίσης να επεξεργάζονται δεδομένα σε άλλες χώρες· οι όροι και οι εγγυήσεις του συγκεκριμένου λογαριασμού χρειάζονται επιβεβαίωση.',
      ],
      [
        'Χρόνοι διατήρησης και διαγραφή',
        'Ο συμφωνημένος χρόνος αποθήκευσης αιτήσεων/βιογραφικών είναι 30 ημέρες. Ισχύει επίσης πολιτική 30 ημερών για αντίγραφα email υποβολών, με διαφορετική διαχείριση της αυτόματης διαγραφής ειδοποιήσεων και του καθαρισμού αλληλογραφίας/λήψεων από τον ιδιοκτήτη. Το τρέχον πλάνο της Resend διατηρεί μηνύματα/καταγραφές για 30 ημέρες και αντίγραφα ασφαλείας για επτά ημέρες. Δεν εγγυάται ταυτόχρονη διαγραφή κάθε αντιγράφου παρόχου. Οι εγγραφές αποστολής/κατάχρησης χρησιμοποιούν αδιαφανείς αναφορές και κατακερματισμούς με κλειδί, συνήθως για 30 ημέρες· εκκρεμή περιστατικά ασφάλειας ή αποθήκευσης μπορεί να απαιτούν περιορισμένη διατήρηση έως τον έλεγχο. Η πραγματική διαγραφή και ανάκτηση χρειάζονται επαλήθευση πριν από την ενεργοποίηση.',
      ],
      [
        'Τοπική αποθήκευση και προτιμήσεις',
        'Η γλώσσα και οι επιλογές cookies αποθηκεύονται τοπικά μέχρι να τις διαγράψετε ή να αλλάξει η υποστηριζόμενη έκδοση. Προσχέδια, επιλεγμένα βιογραφικά και κατάσταση επανάληψης παραμένουν μόνο στη μνήμη της σελίδας, όχι σε local/session storage ή analytics. Η ανανέωση μπορεί να τα χάσει. Η απόρριψη προαιρετικών cookies δεν απενεργοποιεί απαραίτητους ελέγχους ασφάλειας/επαλήθευσης. Τα τρέχοντα κουμπιά αποδοχής/απόρριψης δεν ενεργοποιούν ανύπαρκτες κατηγορίες analytics ή marketing.',
      ],
      [
        'Εξωτερικοί σύνδεσμοι και δημόσιο περιεχόμενο',
        'Σύνδεσμοι εργασιών/προφίλ, κοινωνικών δικτύων και άλλων ιστοτόπων υπόκεινται στις δικές τους ενημερώσεις. Δεν ανακτούμε αυτόματα τα συνδεδεμένα προφίλ υποψηφίων. Οι δημοσιευμένες μαρτυρίες και τα επαγγελματικά στοιχεία προορίζονται να χρησιμοποιούν εγκεκριμένο περιεχόμενο· επικοινωνήστε για διόρθωση ή θέμα προσωπικών δεδομένων που εμφανίζονται στον ιστότοπο.',
      ],
      [
        'Επιλογές και δικαιώματα',
        'Ανάλογα με τις προϋποθέσεις, μπορείτε να ζητήσετε πρόσβαση, διόρθωση, διαγραφή, περιορισμό, φορητότητα ή να αντιταχθείτε στην επεξεργασία. Όπου απαιτείται συγκατάθεση, μπορείτε να την ανακαλέσετε χωρίς να επηρεάζεται η προηγούμενη νόμιμη επεξεργασία. Μπορείτε να απευθυνθείτε στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (dpa.gr) ή στην αρμόδια αρχή σας. Μπορεί να ζητηθεί αναλογική επαλήθευση ταυτότητας. Δεν λαμβάνονται συμβατικές ή εργασιακές αποφάσεις αποκλειστικά αυτόματα· έλεγχοι ασφάλειας μπορεί να αποκλείσουν προσωρινά ένα αίτημα.',
      ],
      [
        'Μελλοντικά analytics και αλλαγές',
        'Τα analytics αποτελούν ξεχωριστή δραστηριότητα υπό έγκριση. Πριν προστεθούν θα εξεταστούν σκοπός, πάροχος, δεδομένα, πρόσβαση, διατήρηση και τυχόν απαιτήσεις συγκατάθεσης, θα ενημερωθούν η παρούσα σελίδα/ρυθμίσεις cookies και θα ληφθούν οι εγκρίσεις. Δεν παρουσιάζεται μελλοντικός πάροχος ή παρακολούθηση ως ήδη ενεργός. Οι ουσιώδεις αλλαγές θα έχουν νέα έκδοση ενημέρωσης.',
      ],
      [
        'Εκκρεμότητες ελέγχου',
        'Πλήρες προσχέδιο για έλεγχο. Πριν από κάθε ενεργοποίηση απαιτούνται επιβεβαίωση στοιχείων υπευθύνου, νομικών βάσεων, διατήρησης τεχνικών καταγραφών, όρων γραμματοκιβωτίου/παρόχων και διεθνών εγγυήσεων, πρακτικής διαγραφής αλληλογραφίας και ιδιωτικής πρόσβασης/διαγραφής βιογραφικών. Η επαλήθευση Contact διαφέρει από την επαλήθευση Careers· τα analytics παραμένουν μελλοντικό στάδιο.',
      ],
    ],
  },
};
export function renderPrivacy(
  language,
  settings,
  { origin = '', styles = ['/src/privacy.css'] } = {},
) {
  const c = copy[language] || copy.en,
    p = settings;
  const details = [
    p.company || c.pending,
    p.address || c.pending,
    p.email || c.pending,
  ]
    .map(escape)
    .join('<br>');
  const sections = c.sections
    .map(
      ([title, text], i) =>
        `<section><h2>${escape(title)}</h2>${i === 0 ? `<p>${details}</p>` : ''}<p>${escape(text)}</p></section>`,
    )
    .join('');
  return `<!doctype html><html lang="${language}" data-color-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${p.approved ? 'index, follow' : 'noindex, nofollow'}"><meta name="privacy-version" content="${escape(p.version)}"><title>${escape(c.title)} · Pegasoft</title>${origin ? `<link rel="canonical" href="${escape(origin)}/${language}${p.path}">` : ''}${styles.map((href) => `<link rel="stylesheet" href="${escape(href)}">`).join('')}</head><body class="insights-page privacy-page"><main class="layout-container"><nav><a href="/${language}/">${escape(c.back)}</a><a href="/${language === 'el' ? 'en' : 'el'}${p.path}" lang="${language === 'el' ? 'en' : 'el'}">${escape(c.switch)}</a></nav><h1>${escape(c.title)}</h1>${p.approved ? '' : `<p class="draft layout-panel">${escape(c.draft)}</p><p>${escape(c.status)}</p>`}<p>${escape(p.version)}</p>${sections}</main></body></html>`;
}
