import Link from 'next/link';
import { individualBrand } from '@site/brand-system';

export function IndividualHeader() {
  return (
    <header className="individual-header">
      <Link href="/" className="identity-link">
        {individualBrand.name}
      </Link>
      <nav aria-label="Primary navigation">
        {individualBrand.nav.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <Link href="/contact" className="header-link">
        Contact
      </Link>
    </header>
  );
}
