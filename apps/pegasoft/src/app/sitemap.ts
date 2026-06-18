import type { MetadataRoute } from 'next';
import { getPegasoftWorkItems } from '@site/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl =
    process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://pegasoft.studio';
  const staticRoutes = [
    '',
    '/services',
    '/work',
    '/work/concepts',
    '/work/portfolio',
    '/studio',
    '/contact',
    '/privacy',
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      lastModified: new Date(),
    })),
    ...getPegasoftWorkItems().map((item) => ({
      url: `${siteUrl}/work/${item.slug}`,
      lastModified: new Date(),
    })),
  ];
}
