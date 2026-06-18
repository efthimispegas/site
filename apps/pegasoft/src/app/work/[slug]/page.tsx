import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findPegasoftWorkBySlug, getPegasoftWorkItems } from '@site/content';
import { SiteHeader } from '../../shared/site-header';

interface WorkDetailPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getPegasoftWorkItems().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: WorkDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = findPegasoftWorkBySlug(slug);

  if (!item) {
    return {};
  }

  return {
    title: item.kind === 'concept' ? item.title : item.productName,
    description: item.kind === 'concept' ? item.challenge : item.problem,
  };
}

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { slug } = await params;
  const item = findPegasoftWorkBySlug(slug);

  if (!item) {
    notFound();
  }

  const title = item.kind === 'concept' ? item.title : item.productName;
  const summary = item.kind === 'concept' ? item.solution : item.problem;
  const listItems =
    item.kind === 'concept' ? item.artifacts : item.deliveryScope;

  return (
    <main className="subpage">
      <SiteHeader />
      <article className="case-study">
        <p className="eyebrow">
          {item.kind === 'concept' ? item.label : 'Client Product Portfolio'}
        </p>
        <h1>{title}</h1>
        <p>{summary}</p>
        <ul className="artifact-list">
          {listItems.map((artifact) => (
            <li key={artifact}>{artifact}</li>
          ))}
        </ul>
      </article>
    </main>
  );
}
