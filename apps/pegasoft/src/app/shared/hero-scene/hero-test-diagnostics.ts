/**
 * Compile-time switch for the isolated S7 diagnostics build. It is deliberately
 * false in an ordinary production build, so URL test controls and applied-frame
 * records do not ship with the public artifact.
 */
export const HERO_TEST_DIAGNOSTICS =
  process.env.NEXT_PUBLIC_HERO_TEST_DIAGNOSTICS === '1';
