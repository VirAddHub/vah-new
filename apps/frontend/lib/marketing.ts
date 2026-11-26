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
export const faqs = [
  [
    'What is a virtual office?',
    'An address and mail-handling service for a business that works elsewhere. Our service does not include desks, meeting rooms or a staffed location for your customers to visit.',
  ],
  [
    'What does the subscription include?',
    'Business correspondence, registered office and director’s service address use where eligible, plus digital mail scanning and online mail management. Physical forwarding has separate conditions and charges.',
  ],
  [
    'When can I start using the address?',
    'After payment, required identity and business checks, and account approval. Payment alone does not authorise address use or unlock restricted mail.',
  ],
  [
    'Can I keep my home address private?',
    'Using a separate service or registered office address can avoid publishing your home address on new filings. It does not automatically remove information already on the public register.',
  ],
  [
    'Can I receive original letters?',
    'Yes, you can request eligible originals through your account, subject to forwarding charges, availability and retention rules. Parcels and bulky items are not accepted.',
  ],
  [
    'Why do I need identity verification?',
    'We verify customers and required business owners before approving address use. Follow the checks requested during onboarding; these are separate from any Companies House verification obligations.',
  ],
  [
    'How much does a London virtual office cost?',
    'Our current monthly and annual subscription prices appear in the pricing section and on the plans page. If pricing is unavailable, please contact our team before choosing a subscription.',
  ],
  [
    'Can I use the address on my website and invoices?',
    'Once approved, you can use the business correspondence address for your eligible business. Check the terms and any requirements that apply to your own business.',
  ],
  [
    'Can I cancel my subscription?',
    'The current terms specify 30 days’ notice. Review the terms before choosing a monthly or annual subscription, including renewal and cancellation conditions.',
  ],
  [
    'Can I use it for Google Business Profile?',
    'A virtual mailing address where your business does not operate is not eligible as a Google Business Profile location. Do not describe our address as your walk-in business premises.',
  ],
  [
    'What happens to my mail when I cancel?',
    'The terms require you to stop using the address and scanning stops. Update senders and your company records, and contact support about outstanding originals before the service ends.',
  ],
] as const;
