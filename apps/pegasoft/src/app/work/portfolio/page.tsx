import type { Metadata } from 'next';
import { clientProductProjects } from '@site/content';
import { SiteHeader } from '../../shared/site-header';

export const metadata: Metadata = {
  title: 'Client Product Portfolio',
  description:
    'Approved Pegasoft client and product work. Empty until publish permission and project assets are available.',
};

export default function PortfolioPage() {
  const approvedProjects = clientProductProjects.filter(
    (project) => project.permissionStatus === 'approved',
  );

  return (
    <main className="subpage">
      <SiteHeader />
      <section className="subpage-hero">
        <p className="eyebrow">Client Product Portfolio</p>
        <h1>Real client and product work will live here.</h1>
        <p>
          Pegasoft only publishes client/product entries after permission,
          source assets, and outcome details are ready.
        </p>
      </section>
      <section className="empty-state" aria-live="polite">
        {approvedProjects.length === 0 ? (
          <>
            <h2>No approved portfolio entries yet.</h2>
            <p>
              This is intentional. Until the proof is real, the portfolio stays
              quiet.
            </p>
          </>
        ) : (
          approvedProjects.map((project) => (
            <article className="work-card" key={project.slug}>
              <span>{project.industry}</span>
              <h2>{project.productName}</h2>
              <p>{project.problem}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
