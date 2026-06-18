import { serviceOfferings } from '@site/content';

export function GET() {
  const siteUrl =
    process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://pegasoft.studio';
  const lines = [
    '# Pegasoft',
    '> Design and delivery quality digital product solutions for teams that need premium product craft and dependable execution.',
    '',
    '## Main sections',
    `- Home -> ${siteUrl}: Pegasoft positioning, quality promise, and booking CTA.`,
    `- Services -> ${siteUrl}/services: Product strategy, interface systems, delivery quality, and interactive brand platforms.`,
    `- Work -> ${siteUrl}/work: Honest separation between Concept Lab studies and approved client/product portfolio work.`,
    `- Studio -> ${siteUrl}/studio: Studio principles and delivery quality stance.`,
    '',
    '## Service facts',
    ...serviceOfferings.map(
      (service) => `- ${service.title}: ${service.summary}`,
    ),
    '',
    '## Content policy',
    '- Concept Lab work is speculative and clearly labeled.',
    '- Client Product Portfolio entries require publish permission and source assets.',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
