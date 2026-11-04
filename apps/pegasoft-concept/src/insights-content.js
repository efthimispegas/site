/** Original review copy. Approval/publication and live LinkedIn ingestion are separate gates. */
export const insightCategories = [
  ['all', 'All articles', 'Όλα τα άρθρα'],
  ['systems', 'Product systems', 'Συστήματα προϊόντων'],
  ['ai', 'AI & automation', 'AI & αυτοματισμοί'],
  ['engineering', 'Design & engineering', 'Σχεδιασμός & μηχανική'],
];
const article = (
  slug,
  category,
  title,
  greekTitle,
  summary,
  greekSummary,
  sections,
  greekSections,
) => ({
  slug,
  category,
  title: { en: title, el: greekTitle },
  summary: { en: summary, el: greekSummary },
  sections: { en: sections, el: greekSections },
  author: 'Pegasoft',
  originalSource: { name: 'Pegasoft', url: null, publishedAt: null },
  status: 'review',
  date: { systems: '2026-11-03', ai: '2026-11-02', engineering: '2026-11-01' }[
    category
  ],
});
export const insightArticles = [
  article(
    'connected-product-systems',
    'systems',
    'Build the connections. Improve the whole system.',
    'Συνδέουμε τα μέρη. Βελτιώνουμε το σύνολο.',
    'A useful digital product connects the people, information and decisions around it.',
    'Ένα χρήσιμο ψηφιακό προϊόν συνδέει ανθρώπους, πληροφορίες και αποφάσεις.',
    [
      [
        'Start with the handoffs',
        'Map how a request moves between people and tools. Repeated entry, missing context and unclear ownership show where a better connection could make everyday work easier.\n\nConsider a service request that begins in an email and ends in a completed appointment. Someone checks availability, someone confirms the details, and someone records the outcome. Draw those steps before choosing an integration. At each boundary, ask what the next person needs to know, which information they can trust and how they notice that the request is waiting for them.\n\nThe map should include exceptions as well as the usual route. A customer may change a date, a message may arrive twice or a colleague may be away. Make ownership visible in those cases. A shared status and a clear next action can be more useful than another dashboard, especially when the underlying tools already do their individual jobs well.',
      ],
      [
        'Design the smallest useful connection',
        'Choose one workflow and define what success looks like for its users. Connect only the information it needs, with clear permissions and a visible recovery path when something fails.\n\nBegin with a connection that people can explain in one sentence: when a request is confirmed, the responsible colleague receives the agreed details. List the minimum fields needed for that handoff and decide which system owns each one. Avoid copying every available field merely because it is easy to transfer. Fewer dependencies make the connection easier to understand and maintain.\n\nDesign the failure path alongside the happy path. A delayed connection should show that work is pending rather than silently suggesting completion. Retrying should not create a second appointment or send the same instruction twice. Let the person responsible inspect the original request, correct a mistake and resume the process without reconstructing its history from several separate tools.',
      ],
      [
        'Measure the whole journey',
        'A faster screen is useful only if the next step improves too. Review completion, mistakes and support needs across the workflow before extending the system.\n\nChoose a small set of observations that cover the complete task. How long does a request wait between steps? How often must someone ask for information again? Can a person tell whether the process is finished? These questions help distinguish a quicker interaction from a better service. Record a baseline before changing the workflow so later comparisons have a useful starting point.\n\nReview ordinary requests together with difficult ones. A connection that saves time most days may still create substantial recovery work when an input is missing. Talk with the people handling those exceptions, revise the handoff and repeat the observation. Extend the system when the smaller connection is understandable and useful, with a clear owner who can keep it working as the surrounding process changes.',
      ],
    ],
    [
      [
        'Ξεκινήστε από τις μεταβιβάσεις',
        'Χαρτογραφήστε πώς ένα αίτημα περνά ανάμεσα σε ανθρώπους και εργαλεία. Η επαναλαμβανόμενη καταχώριση, το χαμένο πλαίσιο και η ασαφής ευθύνη δείχνουν πού χρειάζεται καλύτερη σύνδεση.\n\nΣκεφτείτε ένα αίτημα εξυπηρέτησης που ξεκινά από ένα email και καταλήγει σε ολοκληρωμένο ραντεβού. Κάποιος ελέγχει τη διαθεσιμότητα, κάποιος επιβεβαιώνει τις λεπτομέρειες και κάποιος καταγράφει το αποτέλεσμα. Σχεδιάστε αυτά τα βήματα πριν επιλέξετε διασύνδεση. Σε κάθε μετάβαση, εξετάστε τι χρειάζεται να γνωρίζει ο επόμενος άνθρωπος, ποιες πληροφορίες είναι αξιόπιστες και πώς ενημερώνεται ότι το αίτημα περιμένει τη δική του ενέργεια.\n\nΟ χάρτης χρειάζεται να περιλαμβάνει και τις εξαιρέσεις. Ένας πελάτης μπορεί να αλλάξει ημερομηνία, ένα μήνυμα να φτάσει δύο φορές ή ένας συνάδελφος να απουσιάζει. Κάντε σαφή την ευθύνη σε αυτές τις περιπτώσεις. Μια κοινή κατάσταση και ένα κατανοητό επόμενο βήμα μπορεί να είναι πιο χρήσιμα από έναν επιπλέον πίνακα πληροφοριών, ιδιαίτερα όταν τα υπάρχοντα εργαλεία καλύπτουν ήδη τις επιμέρους ανάγκες.',
      ],
      [
        'Σχεδιάστε τη μικρότερη χρήσιμη σύνδεση',
        'Επιλέξτε μία ροή και ορίστε την επιτυχία για τους χρήστες της. Συνδέστε μόνο τις απαραίτητες πληροφορίες, με σαφή δικαιώματα και τρόπο ανάκαμψης.\n\nΞεκινήστε με μια σύνδεση που εξηγείται σε μία πρόταση: όταν επιβεβαιώνεται ένα αίτημα, ο υπεύθυνος συνάδελφος λαμβάνει τις συμφωνημένες λεπτομέρειες. Καταγράψτε τα ελάχιστα απαραίτητα πεδία και ορίστε ποιο σύστημα αποτελεί την πηγή για το καθένα. Μη μεταφέρετε κάθε διαθέσιμη πληροφορία μόνο επειδή αυτό είναι τεχνικά εύκολο. Οι λιγότερες εξαρτήσεις κάνουν τη σύνδεση πιο κατανοητή και τη συντήρησή της ευκολότερη.\n\nΣχεδιάστε την αντιμετώπιση αποτυχιών μαζί με την κανονική ροή. Μια καθυστέρηση πρέπει να εμφανίζεται ως εκκρεμότητα και να μη δίνει λανθασμένη εντύπωση ολοκλήρωσης. Η επανάληψη μιας προσπάθειας δεν πρέπει να δημιουργεί δεύτερο ραντεβού ή να στέλνει ξανά την ίδια οδηγία. Ο υπεύθυνος χρειάζεται να βλέπει το αρχικό αίτημα, να διορθώνει ένα λάθος και να συνεχίζει χωρίς να ανασυνθέτει όλο το ιστορικό.',
      ],
      [
        'Μετρήστε ολόκληρη τη διαδρομή',
        'Μια ταχύτερη οθόνη έχει αξία όταν βελτιώνεται και το επόμενο βήμα. Εξετάστε ολοκλήρωση, λάθη και ανάγκες υποστήριξης πριν επεκτείνετε το σύστημα.\n\nΕπιλέξτε λίγες παρατηρήσεις που καλύπτουν ολόκληρη την εργασία. Πόσο περιμένει ένα αίτημα ανάμεσα στα βήματα; Πόσο συχνά ζητούνται ξανά οι ίδιες πληροφορίες; Μπορεί κάποιος να καταλάβει ότι η διαδικασία τελείωσε; Αυτές οι ερωτήσεις διαχωρίζουν μια γρηγορότερη αλληλεπίδραση από μια καλύτερη υπηρεσία. Καταγράψτε την αρχική κατάσταση πριν αλλάξετε τη ροή, ώστε οι επόμενες συγκρίσεις να έχουν συγκεκριμένο σημείο αναφοράς.\n\nΕξετάστε μαζί τις συνηθισμένες και τις δύσκολες περιπτώσεις. Μια διασύνδεση μπορεί να εξοικονομεί χρόνο καθημερινά, αλλά να απαιτεί πολλή χειροκίνητη εργασία όταν λείπει μια είσοδος. Συζητήστε με όσους διαχειρίζονται αυτές τις εξαιρέσεις, διορθώστε τη μετάβαση και επαναλάβετε την παρατήρηση. Επεκτείνετε το σύστημα όταν η μικρή σύνδεση είναι χρήσιμη και κατανοητή, με σαφή υπεύθυνο που μπορεί να τη διατηρεί λειτουργική καθώς αλλάζει η διαδικασία.',
      ],
    ],
  ),
  article(
    'purposeful-ai',
    'ai',
    'Give AI a purpose before giving it a workflow.',
    'Δώστε στην AI σκοπό πριν της δώσετε μια ροή.',
    'Start with a clear problem, a useful baseline and a human who owns the outcome.',
    'Ξεκινήστε με σαφές πρόβλημα, σημείο αναφοράς και άνθρωπο υπεύθυνο για το αποτέλεσμα.',
    [
      [
        'Choose a bounded problem',
        'Identify a repetitive task with inputs you can inspect and results you can evaluate. A defined scope makes failures easier to notice and improvements easier to measure.\n\nA useful starting point might be sorting incoming requests into a few known categories. Describe what belongs in each category and collect examples that are ambiguous or incomplete. Decide when the system should abstain. A visible queue for uncertain cases helps people understand the limits of the workflow before they depend on it.\n\nKeep the first evaluation small enough to inspect every result. Note why an answer was useful or misleading, rather than recording only whether it looked plausible. Those notes become a practical guide for deciding what to change next.',
      ],
      [
        'Keep people in control',
        'Decide which actions need review, how uncertainty is shown and how a person can correct the result. Treat permissions and data access as part of the product design.\n\nReview belongs where a decision creates a meaningful consequence. A suggested response can remain editable; sending it to a customer is a separate action. Show the source information alongside the suggestion so the reviewer can check it without searching through another application. Make rejection and correction easy to find.\n\nAccess should follow the task. A workflow that classifies requests does not automatically need permission to alter customer records. Give people a clear way to stop the process and understand which actions have already happened.',
      ],
      [
        'Evaluate before extending',
        'Compare results against a simple baseline using representative examples. Track errors and recovery effort alongside time saved. Expand only when the evidence supports it.\n\nBuild an evaluation set that includes common requests, unusual wording, missing information and conflicting instructions. Keep those examples separate from the material used to adjust the workflow. Compare the result with a simple manual process so the team can see where the new approach helps and where it adds work.\n\nRecord both the quality of the answer and the effort needed to repair it. Repeat the evaluation after meaningful changes. A successful demonstration is a useful beginning, while a repeatable pattern across representative cases is stronger evidence for the next step.',
      ],
    ],
    [
      [
        'Επιλέξτε ένα οριοθετημένο πρόβλημα',
        'Εντοπίστε μια επαναλαμβανόμενη εργασία με εισόδους που μπορείτε να ελέγξετε και αποτελέσματα που μπορείτε να αξιολογήσετε.\n\nΈνα χρήσιμο πρώτο βήμα μπορεί να είναι η ταξινόμηση εισερχόμενων αιτημάτων σε λίγες γνωστές κατηγορίες. Περιγράψτε τι ανήκει σε κάθε κατηγορία και συγκεντρώστε ασαφή ή ελλιπή παραδείγματα. Ορίστε πότε το σύστημα πρέπει να απέχει. Μια ορατή λίστα αβέβαιων περιπτώσεων βοηθά τους ανθρώπους να κατανοήσουν τα όρια πριν βασιστούν στη ροή.\n\nΚρατήστε την πρώτη αξιολόγηση αρκετά μικρή ώστε να εξετάζεται κάθε αποτέλεσμα. Καταγράψτε γιατί μια απάντηση ήταν χρήσιμη ή παραπλανητική. Οι σημειώσεις αυτές προσφέρουν πρακτική βάση για την επόμενη αλλαγή.',
      ],
      [
        'Κρατήστε τον άνθρωπο στον έλεγχο',
        'Ορίστε ποιες ενέργειες απαιτούν έλεγχο, πώς εμφανίζεται η αβεβαιότητα και πώς διορθώνεται ένα αποτέλεσμα. Τα δικαιώματα αποτελούν μέρος του σχεδιασμού.\n\nΟ ανθρώπινος έλεγχος χρειάζεται εκεί όπου μια απόφαση έχει ουσιαστική συνέπεια. Μια προτεινόμενη απάντηση παραμένει επεξεργάσιμη, ενώ η αποστολή της στον πελάτη αποτελεί ξεχωριστή ενέργεια. Εμφανίστε τις αρχικές πληροφορίες δίπλα στην πρόταση, ώστε ο έλεγχος να μη χρειάζεται αναζήτηση σε άλλη εφαρμογή. Κάντε την απόρριψη και τη διόρθωση εύκολες.\n\nΤα δικαιώματα πρέπει να ακολουθούν την εργασία. Η ταξινόμηση αιτημάτων δεν απαιτεί αυτόματα δυνατότητα αλλαγής στοιχείων πελατών. Δώστε σαφή τρόπο διακοπής της διαδικασίας και εικόνα των ενεργειών που έχουν ήδη ολοκληρωθεί.',
      ],
      [
        'Αξιολογήστε πριν επεκτείνετε',
        'Συγκρίνετε τα αποτελέσματα με μια απλή βάση και αντιπροσωπευτικά παραδείγματα. Μετρήστε λάθη και προσπάθεια ανάκαμψης μαζί με τον χρόνο που εξοικονομείται.\n\nΔημιουργήστε ένα σύνολο αξιολόγησης με συνηθισμένα αιτήματα, ασυνήθιστη διατύπωση, ελλιπείς πληροφορίες και αντικρουόμενες οδηγίες. Κρατήστε αυτά τα παραδείγματα χωριστά από το υλικό με το οποίο βελτιώνεται η ροή. Συγκρίνετε το αποτέλεσμα με μια απλή χειροκίνητη διαδικασία, ώστε η ομάδα να βλέπει πού υπάρχει βοήθεια και πού προστίθεται εργασία.\n\nΚαταγράψτε την ποιότητα της απάντησης και την προσπάθεια διόρθωσής της. Επαναλάβετε την αξιολόγηση μετά από ουσιαστικές αλλαγές. Μια επιτυχημένη επίδειξη είναι αρχή, ενώ η συνέπεια σε αντιπροσωπευτικές περιπτώσεις αποτελεί ισχυρότερη βάση για επέκταση.',
      ],
    ],
  ),
  article(
    'digital-craft',
    'engineering',
    'Digital craft is how the details work together.',
    'Η ψηφιακή ποιότητα βρίσκεται στη σύνδεση των λεπτομερειών.',
    'Design decisions become stronger when accessibility, performance and engineering are considered together.',
    'Οι σχεδιαστικές αποφάσεις γίνονται ισχυρότερες όταν προσβασιμότητα, απόδοση και μηχανική εξετάζονται μαζί.',
    [
      [
        'Make the next step clear',
        'Use a readable hierarchy, concrete labels and feedback that explains what happened. Test the journey with a keyboard as well as a pointer.\n\nStart with the question a person is trying to answer on each screen. Put the information needed for that decision close to the action. A button label should explain its result, and a completed action should leave a clear confirmation. When something fails, preserve the information already entered and show a practical recovery step.\n\nWalk through the same path without a mouse. Check the order of focus, the visibility of the focused control and whether opening a dialog leaves a clear route back. These details shape whether the experience feels predictable.',
      ],
      [
        'Make motion earn its place',
        'Transitions can explain continuity and help people follow a change. Keep them interruptible, respect reduced motion and avoid making reading wait for decoration.\n\nA transition can show that an item moved, a panel opened or a view is ready. Choose a duration that makes that relationship legible, then test repeated use. Decorative motion should not obscure a control or keep a person waiting to continue a task they already understand.\n\nOffer a calm experience when reduced motion is requested. Preserve the information and the available actions while removing movement that is unnecessary for understanding. Test the preference both before the page opens and while the page is already in use.',
      ],
      [
        'Verify the real experience',
        'Review the rendered product on different screens and connections. Source checks support this work, but only real interactions show whether the experience holds together.\n\nA layout can fit at one width and fail when a translated label wraps onto a second line. Review long titles, empty states, narrow screens and enlarged text. Watch the page while images and fonts load, and check that content does not move away from the pointer at the moment someone tries to act.\n\nKeep evidence tied to the version under review. A screenshot explains a visual state; an interaction check explains a behavior. Together they help a team discuss a concrete result and decide what remains to improve before release.',
      ],
    ],
    [
      [
        'Κάντε σαφές το επόμενο βήμα',
        'Χρησιμοποιήστε ευανάγνωστη ιεραρχία, συγκεκριμένες ετικέτες και ανατροφοδότηση που εξηγεί τι συνέβη. Ελέγξτε τη διαδρομή και με πληκτρολόγιο.\n\nΞεκινήστε από την ερώτηση που προσπαθεί να απαντήσει ο άνθρωπος σε κάθε οθόνη. Τοποθετήστε τις απαραίτητες πληροφορίες κοντά στην ενέργεια. Η ετικέτα ενός κουμπιού πρέπει να εξηγεί το αποτέλεσμα και η ολοκλήρωση να αφήνει σαφή επιβεβαίωση. Σε μια αποτυχία, διατηρήστε όσα έχουν ήδη συμπληρωθεί και προτείνετε πρακτικό επόμενο βήμα.\n\nΑκολουθήστε την ίδια διαδρομή χωρίς ποντίκι. Ελέγξτε τη σειρά εστίασης, την ορατότητα του ενεργού στοιχείου και τον τρόπο επιστροφής από ένα παράθυρο διαλόγου. Αυτές οι λεπτομέρειες κάνουν την εμπειρία προβλέψιμη.',
      ],
      [
        'Δώστε σκοπό στην κίνηση',
        'Οι μεταβάσεις μπορούν να εξηγούν τη συνέχεια μιας αλλαγής. Σεβαστείτε τη μειωμένη κίνηση και μην καθυστερείτε την ανάγνωση για διακόσμηση.\n\nΜια μετάβαση μπορεί να δείξει ότι μετακινήθηκε ένα στοιχείο, άνοιξε ένα πλαίσιο ή είναι έτοιμη μια νέα προβολή. Επιλέξτε διάρκεια που κάνει τη σχέση κατανοητή και δοκιμάστε την επαναλαμβανόμενη χρήση. Η διακοσμητική κίνηση δεν πρέπει να καλύπτει χειριστήρια ούτε να καθυστερεί μια εργασία που ο χρήστης ήδη γνωρίζει.\n\nΠροσφέρετε ήρεμη εμπειρία όταν ζητείται μειωμένη κίνηση. Διατηρήστε πληροφορίες και ενέργειες, αφαιρώντας τη μη απαραίτητη μετακίνηση. Ελέγξτε την προτίμηση πριν από το άνοιγμα της σελίδας αλλά και ενώ αυτή χρησιμοποιείται.',
      ],
      [
        'Ελέγξτε την πραγματική εμπειρία',
        'Εξετάστε το προϊόν σε διαφορετικές οθόνες και συνδέσεις. Μόνο οι πραγματικές αλληλεπιδράσεις δείχνουν αν η εμπειρία λειτουργεί ως σύνολο.\n\nΜια διάταξη μπορεί να λειτουργεί σε ένα πλάτος και να αποτυγχάνει όταν μια μεταφρασμένη ετικέτα πιάνει δεύτερη γραμμή. Εξετάστε μεγάλους τίτλους, κενές καταστάσεις, στενές οθόνες και μεγαλύτερο κείμενο. Παρατηρήστε τη φόρτωση εικόνων και γραμματοσειρών και βεβαιωθείτε ότι το περιεχόμενο δεν απομακρύνεται τη στιγμή που κάποιος προσπαθεί να το επιλέξει.\n\nΣυνδέστε τα στοιχεία ελέγχου με τη συγκεκριμένη έκδοση. Ένα στιγμιότυπο εξηγεί μια οπτική κατάσταση και μια δοκιμή αλληλεπίδρασης μια συμπεριφορά. Μαζί δίνουν στην ομάδα συγκεκριμένη βάση συζήτησης για όσα απομένουν πριν από την έκδοση.',
      ],
    ],
  ),
];
