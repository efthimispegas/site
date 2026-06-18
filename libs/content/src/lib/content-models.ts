export type PermissionStatus = 'approved' | 'pending' | 'internal-only';

export interface ServiceOffering {
  slug: string;
  title: string;
  summary: string;
  deliveryQualityProof: string;
  deliverables: string[];
  idealFor: string;
  outcomes: string[];
}

export interface ConceptLabStudy {
  slug: string;
  title: string;
  label: 'Concept Lab';
  challenge: string;
  solution: string;
  artifacts: string[];
  tags: string[];
}

export interface ClientProductProject {
  slug: string;
  clientName: string;
  productName: string;
  permissionStatus: PermissionStatus;
  industry: string;
  problem: string;
  deliveryScope: string[];
  outcomes: string[];
  assets: string[];
  testimonial?: string;
}

export interface IndividualProject {
  slug: string;
  title: string;
  role: string;
  serviceType: string;
  summary: string;
  artifacts: string[];
  availabilityForHire: boolean;
}

export interface FAQItem {
  question: string;
  answer: string;
  topic: string;
  citationReady: boolean;
}

export type PegasoftWorkItem =
  | (ConceptLabStudy & { kind: 'concept' })
  | (ClientProductProject & { kind: 'client-product' });
