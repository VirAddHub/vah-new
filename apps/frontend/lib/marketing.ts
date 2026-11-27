export const SITE_URL = 'https://virtualaddresshub.co.uk';
export const services = [
  {
    slug: 'virtual-office-london',
    title: 'London virtual office',
    eyebrow: 'A business presence',
    intro: 'A London address for your business. The freedom to work elsewhere.',
    body: 'A virtual office gives your business an address and a way to receive correspondence without renting a desk. Our subscription brings address services and online mail management together.',
    example:
      'For a remote consultancy, your business correspondence can arrive in London while you manage it online.',
    detail:
      'This is an address and mail-handling service. It does not include workspace, meeting rooms, telephone answering or walk-in facilities.',
    visual: 'address',
  },
  {
    slug: 'business-address-london',
    title: 'London business address',
    eyebrow: 'Everyday business',
    intro: 'Put your business address on your business correspondence.',
    body: 'Use your approved London correspondence address on your website, invoices and business materials. Keep incoming business letters organised in one place instead of directing them to your home.',
    example:
      'A freelancer can use a consistent correspondence address on client invoices and receive letters through their online account.',
    detail:
      'The service is for letters. Parcels and bulky items are not accepted. Address use starts only after the required checks and approval.',
    visual: 'address',
  },
  {
    slug: 'registered-office-address',
    title: 'Registered office address',
    eyebrow: 'Your company’s official address',
    intro: 'An official London address for your company correspondence.',
    body: 'A registered office is the address used for official company correspondence. For eligible companies registered in England and Wales, our London address can serve this purpose once your account is approved.',
    example:
      'A company founder can choose a service address instead of placing their home address on new registered-office filings.',
    detail:
      'Your registered office must be appropriate and in the same UK jurisdiction as your company. Changing an address does not automatically remove it from historic public documents.',
    visual: 'privacy',
  },
  {
    slug: 'directors-service-address',
    title: 'Director’s service address',
    eyebrow: 'Keep work and home separate',
    intro: 'A public correspondence address for your role as a director.',
    body: 'A director’s service address is where correspondence about their company role can be sent. It is different from the usual residential address supplied privately to Companies House.',
    example:
      'An eligible director can use the approved service address for new filings while keeping their usual residential address separate.',
    detail:
      'This service does not remove existing information from the public register or replace required identity checks. You remain responsible for accurate company filings.',
    visual: 'privacy',
  },
  {
    slug: 'mail-scanning',
    title: 'Digital mail scanning',
    eyebrow: 'From letterbox to browser',
    intro: 'Your business post, ready to read wherever you work.',
    body: 'Incoming letters are received and scanned, with documents made available through your secure customer dashboard. Read and download available scans without waiting for the original to reach you.',
    example:
      'Check a scanned business letter while working remotely, then decide whether you need its physical original.',
    detail:
      'Mail access depends on account standing, subscription and required verification. Not every item can be scanned; restrictions and retention rules apply.',
    visual: 'mail',
  },
  {
    slug: 'mail-forwarding',
    title: 'Business mail forwarding',
    eyebrow: 'When you need the original',
    intro: 'Read it online. Request the original when you need it.',
    body: 'Use your customer account to request eligible physical letters. Forwarding is separate from viewing a digital scan and is subject to the item’s availability and retention window.',
    example:
      'After reading a scan, request an eligible original letter for your records at your delivery address.',
    detail:
      'Current terms include UK forwarding of HMRC and Companies House letters; other UK letters cost £2 per item. International forwarding is quoted on request. Parcels are not accepted.',
    visual: 'mail',
  },
] as const;
// Homepage answers are projections of the central Help Centre content.
export { homepageHelp } from './help-content';

/** Questions people most often write in about, answered on the Contact page (also marked up for Google). */
export const contactFaq = [
  { q: 'How quickly will you reply?', a: 'Every message is answered the same working day, Monday to Friday, 9am to 6pm UK time. Messages sent later are answered the next working day.' },
  { q: 'Where is the address?', a: 'By Tower Bridge on the south bank, London SE1. You receive the full address once your account is approved.' },
  { q: 'How fast is post scanned?', a: 'Letters are opened and scanned the same working day they arrive. We email you as soon as a scan is in your dashboard.' },
  { q: 'Can I use the address as my registered office?', a: 'Yes. Limited companies and LLPs in England and Wales can use it as their registered office, and directors can use it as their service address, once the account is approved.' },
  { q: 'How do I cancel?', a: 'You can cancel at any time with 30 days’ notice. Download any scans you want to keep before your service ends.' },
  { q: 'I already have an account. Where is my post?', a: 'Sign in and open Mail. Every scanned letter is there to read or download, and you can ask for originals from the same page.' },
];

/** Pricing questions, answered on the Pricing page (also marked up for Google). */
export const pricingFaq = [
  { q: 'What is included in the price?', a: 'The London SE1 address, its use as your registered office and director’s service address, same-day scanning of every letter, and your online dashboard. There is no limit on the number of letters.' },
  { q: 'What does forwarding cost?', a: 'HMRC and Companies House letters are forwarded free within the UK. Other UK letters are £2 each. International forwarding is quoted when you ask. Originals are kept for 30 days.' },
  { q: 'Do you accept parcels?', a: 'No. The service handles letters only, so please use another address for deliveries.' },
  { q: 'When can I start using the address?', a: 'Once you have paid, verified your identity and we have approved your account. We email you the full address as soon as it is ready to use.' },
  { q: 'Can I cancel?', a: 'Yes, at any time with 30 days’ notice. Download any scans you want to keep before your service ends.' },
];

/** FAQPage structured data for a list of questions and answers. */
export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}
