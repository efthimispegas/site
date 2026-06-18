import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findIndividualProjectBySlug, individualProjects } from '@site/content';
import { IndividualHeader } from '../../shared/individual-header';

interface IndividualWorkPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return individualProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: IndividualWorkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = findIndividualProjectBySlug(slug);
  return project
    ? {
        title: project.title,
        description: project.summary,
      }
    : {};
}

export default async function IndividualWorkPage({
  params,
}: IndividualWorkPageProps) {
  const { slug } = await params;
  const project = findIndividualProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <main className="individual-subpage">
      <IndividualHeader />
      <article className="project-detail">
        <p className="eyebrow">{project.serviceType}</p>
        <h1>{project.title}</h1>
        <p>{project.summary}</p>
        <ul>
          {project.artifacts.map((artifact) => (
            <li key={artifact}>{artifact}</li>
          ))}
        </ul>
      </article>
    </main>
  );
}
