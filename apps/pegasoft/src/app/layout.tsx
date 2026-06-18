import './global.css';
import type { Metadata } from 'next';
import { pegasoftBrand } from '@site/brand-system';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://pegasoft.studio',
  ),
  title: {
    default: 'Pegasoft',
    template: '%s | Pegasoft',
  },
  description: pegasoftBrand.descriptor,
  openGraph: {
    title: 'Pegasoft',
    description: pegasoftBrand.descriptor,
    siteName: 'Pegasoft',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
