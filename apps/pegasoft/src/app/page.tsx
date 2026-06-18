import { pegasoftBrand } from '@site/brand-system';
import { pegasoftFaq, serviceOfferings } from '@site/content';
import { PegasoftHome } from './shared/pegasoft-home';

export default function Index() {
  const siteUrl =
    process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://pegasoft.studio';
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'Pegasoft',
    url: siteUrl,
    description: pegasoftBrand.descriptor,
    areaServed: 'Europe',
    serviceType: serviceOfferings.map((service) => service.title),
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pegasoftFaq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <main id="top">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
      <PegasoftHome />
    </main>
  );
}
