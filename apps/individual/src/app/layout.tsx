import './global.css';
import type { Metadata } from 'next';
import { individualBrand } from '@site/brand-system';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://irisvale.studio',
  ),
  title: {
    default: individualBrand.name,
    template: `%s | ${individualBrand.name}`,
  },
  description: individualBrand.descriptor,
  robots: {
    index: false,
    follow: false,
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
