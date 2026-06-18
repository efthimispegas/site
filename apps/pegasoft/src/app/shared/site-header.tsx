import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { pegasoftBrand } from '@site/brand-system';

export function SiteHeader() {
  const bookingUrl = process.env['NEXT_PUBLIC_BOOKING_URL'] ?? '/contact';

  return (
    <header className="site-header">
      <Link className="brand-mark" href="/">
        <span aria-hidden="true">P</span>
        <strong>{pegasoftBrand.name}</strong>
      </Link>
      <nav aria-label="Primary navigation">
        {pegasoftBrand.nav.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <a className="header-cta" href={bookingUrl}>
        Book
        <ArrowUpRight aria-hidden="true" size={16} />
      </a>
    </header>
  );
}
