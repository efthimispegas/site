export const pegasoftBrand = {
  name: 'Pegasoft',
  descriptor: 'Design and delivery quality digital product solutions',
  shortDescriptor: 'Digital product solutions',
  bookingLabel: 'Book a client call',
  nav: [
    { href: '/services', label: 'Services' },
    { href: '/work', label: 'Work' },
    { href: '/studio', label: 'Studio' },
  ],
  colors: {
    ink: '#111111',
    paper: '#f8f5ee',
    porcelain: '#ffffff',
    gold: '#c7a45b',
    lapis: '#284b8f',
    signal: '#6bd6c3',
  },
} as const;

export const individualBrand = {
  name: 'Iris Vale',
  descriptor: 'Independent product design and brand systems',
  bookingLabel: 'Start a collaboration',
  nav: [
    { href: '/work', label: 'Work' },
    { href: '/services', label: 'Services' },
    { href: '/about', label: 'About' },
  ],
} as const;

export interface MetadataInput {
  title: string;
  description: string;
  path?: string;
  siteUrl?: string;
}

export function getSiteUrl(fallback = 'https://pegasoft.studio'): string {
  return process.env['NEXT_PUBLIC_SITE_URL'] ?? fallback;
}

export function buildCanonicalUrl(path = '/', siteUrl = getSiteUrl()): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, siteUrl).toString();
}

export function buildPageTitle(title: string, siteName: string): string {
  return title === siteName ? title : `${title} | ${siteName}`;
}

export function createMetadata({
  title,
  description,
  path = '/',
  siteUrl,
}: MetadataInput) {
  return {
    title,
    description,
    alternates: {
      canonical: buildCanonicalUrl(path, siteUrl),
    },
    openGraph: {
      title,
      description,
      url: buildCanonicalUrl(path, siteUrl),
      type: 'website',
    },
  };
}
