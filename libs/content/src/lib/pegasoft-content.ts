import type {
  ClientProductProject,
  ConceptLabStudy,
  FAQItem,
  PegasoftWorkItem,
  ServiceOffering,
} from './content-models';

export const serviceOfferings: ServiceOffering[] = [
  {
    slug: 'product-strategy-ux',
    title: 'Product strategy and UX architecture',
    summary:
      'Translate loose product intent into a usable roadmap, information architecture, and validated experience direction.',
    deliveryQualityProof:
      'Every engagement starts with decision logs, acceptance criteria, and a prototype plan before pixels get expensive.',
    deliverables: [
      'Discovery map',
      'Experience architecture',
      'Prototype plan',
      'Decision register',
    ],
    idealFor:
      'Founders and teams moving from idea, rebuild, or scattered roadmap into a buildable product shape.',
    outcomes: [
      'Sharper scope',
      'Reduced design churn',
      'Clearer release sequencing',
    ],
  },
  {
    slug: 'interface-systems',
    title: 'Interface systems',
    summary:
      'Design high-craft digital surfaces with component logic, interaction rules, and accessible visual systems.',
    deliveryQualityProof:
      'Design files and code foundations share the same tokens, spacing rules, and responsive constraints.',
    deliverables: [
      'Design language',
      'Component inventory',
      'Responsive screen set',
      'Accessibility notes',
    ],
    idealFor:
      'Products that need to feel premium without becoming fragile or hard to ship.',
    outcomes: [
      'Consistent UI',
      'Faster implementation',
      'Reusable product language',
    ],
  },
  {
    slug: 'delivery-quality',
    title: 'Delivery quality systems',
    summary:
      'Bring production discipline to product delivery with implementation plans, QA loops, and release readiness.',
    deliveryQualityProof:
      'Each milestone has quality gates for accessibility, performance, security posture, and stakeholder review.',
    deliverables: [
      'Implementation roadmap',
      'QA matrix',
      'Release checklist',
      'Production handoff',
    ],
    idealFor:
      'Teams who care about shipping beautifully and predictably, not just presenting beautifully.',
    outcomes: [
      'Fewer late surprises',
      'Cleaner releases',
      'More dependable delivery',
    ],
  },
  {
    slug: 'interactive-brand-platforms',
    title: 'Interactive brand platforms',
    summary:
      'Create memorable websites and brand experiences with restrained 3D, motion, and conversion-aware content.',
    deliveryQualityProof:
      'Motion and WebGL are progressive layers with static fallbacks, reduced-motion support, and measurable performance targets.',
    deliverables: [
      'Website experience',
      '3D or motion layer',
      'SEO/GEO foundation',
      'Analytics-ready CTA flow',
    ],
    idealFor:
      'Studios, product companies, and premium services that need a website with presence and proof.',
    outcomes: [
      'Distinctive first impression',
      'Crawlable content',
      'Qualified project calls',
    ],
  },
];

export const conceptLabStudies: ConceptLabStudy[] = [
  {
    slug: 'helios-ledger',
    title: 'Helios Ledger',
    label: 'Concept Lab',
    challenge:
      'Financial operators needed a calm way to inspect risk, liquidity, and approval queues without dashboard fatigue.',
    solution:
      'Pegasoft explored a quiet command surface with progressive disclosure, tactile status language, and board-level summaries.',
    artifacts: [
      'Product narrative',
      'Dashboard system',
      'Interaction prototype',
    ],
    tags: ['Fintech', 'Operations', 'Interface system'],
  },
  {
    slug: 'asteria-care',
    title: 'Asteria Care',
    label: 'Concept Lab',
    challenge:
      'Care teams needed patient coordination tools that felt humane while preserving operational urgency.',
    solution:
      'The concept pairs a soft triage model with strict escalation states and accessible care-plan timelines.',
    artifacts: ['Service blueprint', 'Care timeline', 'Mobile-first flow'],
    tags: ['Health', 'Service design', 'Accessibility'],
  },
  {
    slug: 'northline-ops',
    title: 'Northline Ops',
    label: 'Concept Lab',
    challenge:
      'A logistics team needed to understand exceptions across routes, assets, and customer commitments in one glance.',
    solution:
      'The prototype uses a mapless operations cockpit focused on exception gravity, accountable owners, and delivery confidence.',
    artifacts: [
      'Operations cockpit',
      'Exception model',
      'Delivery confidence matrix',
    ],
    tags: ['Logistics', 'B2B SaaS', 'Delivery quality'],
  },
];

export const clientProductProjects: ClientProductProject[] = [];

export const pegasoftFaq: FAQItem[] = [
  {
    question: 'What does Pegasoft build?',
    answer:
      'Pegasoft designs and delivers high-quality digital product solutions: strategy, UX architecture, interface systems, websites, and production-ready delivery plans.',
    topic: 'positioning',
    citationReady: true,
  },
  {
    question: 'Does Pegasoft publish speculative work?',
    answer:
      'Yes. Speculative studies are published as Concept Lab work and kept separate from real client or product portfolio entries.',
    topic: 'work taxonomy',
    citationReady: true,
  },
  {
    question: 'How does Pegasoft approach delivery quality?',
    answer:
      'Pegasoft defines acceptance criteria, QA loops, accessibility checks, and release readiness alongside design decisions.',
    topic: 'delivery',
    citationReady: true,
  },
];

export function getPegasoftWorkItems(): PegasoftWorkItem[] {
  const concepts = conceptLabStudies.map((study) => ({
    ...study,
    kind: 'concept' as const,
  }));
  const clientProducts = clientProductProjects
    .filter((project) => project.permissionStatus === 'approved')
    .map((project) => ({
      ...project,
      kind: 'client-product' as const,
    }));

  return [...clientProducts, ...concepts];
}

export function findPegasoftWorkBySlug(
  slug: string,
): PegasoftWorkItem | undefined {
  return getPegasoftWorkItems().find((item) => item.slug === slug);
}

export function hasPublishableClientProjects(): boolean {
  return clientProductProjects.some(
    (project) => project.permissionStatus === 'approved',
  );
}
