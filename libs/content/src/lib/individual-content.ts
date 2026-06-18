import type { IndividualProject } from './content-models';

export const individualProfile = {
  name: 'Iris Vale',
  title: 'Independent product designer and brand systems partner',
  location: 'Europe / remote',
  availability: 'Available for selective freelance collaborations',
  disclosure:
    'Invented v1 persona for the individual app scaffold. Replace with real identity, work, and credentials before public launch.',
  email: 'hello@irisvale.studio',
  statement:
    'I shape digital products that feel exact, useful, and quietly memorable.',
  bio: 'Iris Vale is a provisional individual brand direction for a senior freelancer who blends product design, brand systems, and production-minded delivery.',
  skills: [
    'Product UX',
    'Brand systems',
    'Interaction direction',
    'Design-to-build handoff',
  ],
};

export const individualProjects: IndividualProject[] = [
  {
    slug: 'signal-room',
    title: 'Signal Room',
    role: 'Product design lead',
    serviceType: 'Concept portfolio piece',
    summary:
      'A focused operations workspace for small teams that need status, intent, and action in the same view.',
    artifacts: ['UX model', 'Interface direction', 'Component kit'],
    availabilityForHire: true,
  },
  {
    slug: 'atelier-index',
    title: 'Atelier Index',
    role: 'Brand systems designer',
    serviceType: 'Concept portfolio piece',
    summary:
      'A refined identity and editorial web system for a boutique creative practice.',
    artifacts: ['Visual identity', 'Landing system', 'Motion notes'],
    availabilityForHire: true,
  },
  {
    slug: 'north-star-stack',
    title: 'North Star Stack',
    role: 'Design partner',
    serviceType: 'Concept portfolio piece',
    summary:
      'A modular product narrative and site architecture for a technical founder brand.',
    artifacts: ['Messaging hierarchy', 'Page system', 'CTA journey'],
    availabilityForHire: true,
  },
];

export function findIndividualProjectBySlug(
  slug: string,
): IndividualProject | undefined {
  return individualProjects.find((project) => project.slug === slug);
}
