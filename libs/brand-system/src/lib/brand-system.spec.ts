import {
  buildCanonicalUrl,
  buildPageTitle,
  createMetadata,
} from './brand-system';

describe('brand system metadata helpers', () => {
  it('builds stable page titles', () => {
    expect(buildPageTitle('Services', 'Pegasoft')).toBe('Services | Pegasoft');
    expect(buildPageTitle('Pegasoft', 'Pegasoft')).toBe('Pegasoft');
  });

  it('normalizes canonical URLs', () => {
    expect(buildCanonicalUrl('work', 'https://example.com')).toBe(
      'https://example.com/work',
    );
  });

  it('creates metadata with canonical and Open Graph fields', () => {
    expect(
      createMetadata({
        title: 'Pegasoft',
        description: 'Digital product solutions',
        siteUrl: 'https://example.com',
      }).openGraph.type,
    ).toBe('website');
  });
});
