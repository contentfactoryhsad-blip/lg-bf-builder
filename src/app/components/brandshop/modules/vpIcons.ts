// Value Props icon registry — the 36 "Type=Line black" variants of the Figma
// "Icons" component set (494:2438). Each SVG is the full 96×96 component frame
// (whitespace padding preserved), downloaded to /store-modules/vp-icons/.
// Rendering the frame at 120×120 reproduces the Figma module layout exactly.

export interface VpIcon {
  slug: string; // filename (without .svg) under /store-modules/vp-icons/
  name: string; // Figma variant name — shown + searched in the picker
}

export const VP_ICON_LIST: VpIcon[] = [
  { slug: 'membership', name: 'Membership' },
  { slug: 'vip', name: 'VIP' },
  { slug: 'loyalty', name: 'Loyalty' },
  { slug: 'newsletter', name: 'Newsletter' },
  { slug: 'event', name: 'Event' },
  { slug: 'vip-event', name: 'VIP Event' },
  { slug: 'membership-event', name: 'Membership Event' },
  { slug: 'coupon', name: 'Coupon' },
  { slug: 'welcome-coupon', name: 'Welcome Coupon' },
  { slug: 'membership-coupon', name: 'Membership Coupon' },
  { slug: 'vip-coupon', name: 'VIP Coupon' },
  { slug: 'newsletter-coupon', name: 'Newsletter Coupon' },
  { slug: 'percentage', name: 'Percentage' },
  { slug: 'discount', name: 'Discount' },
  { slug: 'pre-order', name: 'Pre-order' },
  { slug: 'obs-only', name: 'OBS Only' },
  { slug: 'finance', name: 'Finance' },
  { slug: 'zero-interest-payment', name: 'Zero-interest Payment' },
  { slug: 'point', name: 'Point' },
  { slug: 'mileage', name: 'Mileage' },
  { slug: 'delivery', name: 'Delivery' },
  { slug: 'free-delivery', name: 'Free Delivery' },
  { slug: 'scheduled-delivery', name: 'Scheduled Delivery' },
  { slug: 'next-day-delivery', name: 'Next-Day Delivery' },
  { slug: 'fast-delivery', name: 'Fast Delivery' },
  { slug: 'return', name: 'Return' },
  { slug: 'free-return', name: 'Free Return' },
  { slug: 'trade-in-program', name: 'Trade-In Program' },
  { slug: 'one-to-one-care', name: '1:1 Care' },
  { slug: 'installation', name: 'Installation' },
  { slug: 'free-installation', name: 'Free Installation' },
  { slug: 'vip-installation', name: 'VIP Installation' },
  { slug: 'disposal', name: 'Disposal' },
  { slug: 'free-disposal', name: 'Free Disposal' },
  { slug: 'warranty', name: 'Warranty' },
  { slug: '2-year-warranty', name: '2-Year Warranty' },
];

export function vpIconSrc(slug: string): string {
  return `/store-modules/vp-icons/${slug}.svg`;
}
