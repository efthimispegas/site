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
        'Map how a request moves between people and tools. Repeated entry, missing context and unclear ownership show where a better connection could make everyday work easier.',
      ],
      [
        'Design the smallest useful connection',
        'Choose one workflow and define what success looks like for its users. Connect only the information it needs, with clear permissions and a visible recovery path when something fails.',
      ],
      [
        'Measure the whole journey',
        'A faster screen is useful only if the next step improves too. Review completion, mistakes and support needs across the workflow before extending the system.',
      ],
    ],
    [
      [
        'Ξεκινήστε από τις μεταβιβάσεις',
        'Χαρτογραφήστε πώς ένα αίτημα περνά ανάμεσα σε ανθρώπους και εργαλεία. Η επαναλαμβανόμενη καταχώριση, το χαμένο πλαίσιο και η ασαφής ευθύνη δείχνουν πού χρειάζεται καλύτερη σύνδεση.',
      ],
      [
        'Σχεδιάστε τη μικρότερη χρήσιμη σύνδεση',
        'Επιλέξτε μία ροή και ορίστε την επιτυχία για τους χρήστες της. Συνδέστε μόνο τις απαραίτητες πληροφορίες, με σαφή δικαιώματα και τρόπο ανάκαμψης.',
      ],
      [
        'Μετρήστε ολόκληρη τη διαδρομή',
        'Μια ταχύτερη οθόνη έχει αξία όταν βελτιώνεται και το επόμενο βήμα. Εξετάστε ολοκλήρωση, λάθη και ανάγκες υποστήριξης πριν επεκτείνετε το σύστημα.',
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
        'Identify a repetitive task with inputs you can inspect and results you can evaluate. A defined scope makes failures easier to notice and improvements easier to measure.',
      ],
      [
        'Keep people in control',
        'Decide which actions need review, how uncertainty is shown and how a person can correct the result. Treat permissions and data access as part of the product design.',
      ],
      [
        'Evaluate before extending',
        'Compare results against a simple baseline using representative examples. Track errors and recovery effort alongside time saved. Expand only when the evidence supports it.',
      ],
    ],
    [
      [
        'Επιλέξτε ένα οριοθετημένο πρόβλημα',
        'Εντοπίστε μια επαναλαμβανόμενη εργασία με εισόδους που μπορείτε να ελέγξετε και αποτελέσματα που μπορείτε να αξιολογήσετε.',
      ],
      [
        'Κρατήστε τον άνθρωπο στον έλεγχο',
        'Ορίστε ποιες ενέργειες απαιτούν έλεγχο, πώς εμφανίζεται η αβεβαιότητα και πώς διορθώνεται ένα αποτέλεσμα. Τα δικαιώματα αποτελούν μέρος του σχεδιασμού.',
      ],
      [
        'Αξιολογήστε πριν επεκτείνετε',
        'Συγκρίνετε τα αποτελέσματα με μια απλή βάση και αντιπροσωπευτικά παραδείγματα. Μετρήστε λάθη και προσπάθεια ανάκαμψης μαζί με τον χρόνο που εξοικονομείται.',
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
        'Use a readable hierarchy, concrete labels and feedback that explains what happened. Test the journey with a keyboard as well as a pointer.',
      ],
      [
        'Make motion earn its place',
        'Transitions can explain continuity and help people follow a change. Keep them interruptible, respect reduced motion and avoid making reading wait for decoration.',
      ],
      [
        'Verify the real experience',
        'Review the rendered product on different screens and connections. Source checks support this work, but only real interactions show whether the experience holds together.',
      ],
    ],
    [
      [
        'Κάντε σαφές το επόμενο βήμα',
        'Χρησιμοποιήστε ευανάγνωστη ιεραρχία, συγκεκριμένες ετικέτες και ανατροφοδότηση που εξηγεί τι συνέβη. Ελέγξτε τη διαδρομή και με πληκτρολόγιο.',
      ],
      [
        'Δώστε σκοπό στην κίνηση',
        'Οι μεταβάσεις μπορούν να εξηγούν τη συνέχεια μιας αλλαγής. Σεβαστείτε τη μειωμένη κίνηση και μην καθυστερείτε την ανάγνωση για διακόσμηση.',
      ],
      [
        'Ελέγξτε την πραγματική εμπειρία',
        'Εξετάστε το προϊόν σε διαφορετικές οθόνες και συνδέσεις. Μόνο οι πραγματικές αλληλεπιδράσεις δείχνουν αν η εμπειρία λειτουργεί ως σύνολο.',
      ],
    ],
  ),
];
