/** Public editorial content only. Never add private addresses, customer data or credentials. */
export interface HelpArticle {
  slug: string;
  category: string;
  title: string;
  summary: string;
  paragraphs: string[];
  steps: string[];
  links: { label: string; href: string }[];
  homepage: boolean;
}
export const helpCategories = [
  {
    id: 'getting-started',
    title: 'Getting started',
    description: 'From choosing your subscription to account approval.',
  },
  {
    id: 'business-address',
    title: 'Your London business address',
    description: 'Understand permitted uses and keep your records current.',
  },
  {
    id: 'digital-mail',
    title: 'Digital mail management',
    description: 'Find, read and download your business correspondence.',
  },
  {
    id: 'forwarding',
    title: 'Original letters & forwarding',
    description: 'Availability, requests, restrictions and charges.',
  },
  {
    id: 'billing',
    title: 'Billing & subscriptions',
    description: 'Payments, invoices, renewals and cancellation.',
  },
  {
    id: 'verification',
    title: 'Identity verification',
    description: 'Understand the checks and your next step.',
  },
  {
    id: 'account',
    title: 'Managing your account',
    description: 'Your details, sign-in and account security.',
  },
  {
    id: 'international',
    title: 'International customers',
    description: 'Eligibility and requirements when you work overseas.',
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Help when something does not work as expected.',
  },
];
export const helpArticles: HelpArticle[] = [
  {
    slug: 'what-is-a-virtual-office',
    category: 'getting-started',
    title: 'What is a virtual office?',
    summary:
      'A business address and mail-handling service for people who work elsewhere. It gives your business a Central London presence without renting an office.',
    paragraphs: [
      'The subscription does not provide desks, meeting rooms, telephone answering or a walk-in location for your customers. Do not describe the address as premises where your business physically operates.',
    ],
    steps: [],
    links: [
      {
        label: 'Explore our services',
        href: '/services',
      },
    ],
    homepage: true,
  },
  {
    slug: 'subscription-inclusions',
    category: 'getting-started',
    title: 'What does my subscription include?',
    summary:
      'Business correspondence, eligible registered office and director’s service address use, plus digital mail scanning and online mail management—all in one subscription.',
    paragraphs: [
      'Monthly and annual billing provide the same core service. Optional physical forwarding has separate conditions and charges. Parcels and bulky items are not accepted.',
    ],
    steps: [],
    links: [
      {
        label: 'Current subscription prices',
        href: '/pricing',
      },
      {
        label: 'Forwarding conditions and charges',
        href: '/help/forwarding-charges',
      },
    ],
    homepage: true,
  },
  {
    slug: 'create-an-account',
    category: 'getting-started',
    title: 'How do I create an account and get started?',
    summary: 'Choose your billing option, create your account and complete the setup requirements.',
    paragraphs: [],
    steps: [
      'Open Pricing and choose monthly or annual billing.',
      'Provide the account and business information requested during sign-up.',
      'Complete payment and the required identity and business checks.',
      'Check your account for outstanding requirements and approval before using the address.',
    ],
    links: [
      {
        label: 'Compare subscriptions',
        href: '/pricing',
      },
      {
        label: 'See the customer journey',
        href: '/how-it-works',
      },
    ],
    homepage: false,
  },
  {
    slug: 'address-activation',
    category: 'getting-started',
    title: 'When can I start using the address?',
    summary:
      'After successful payment, required identity and business checks, and account approval. The complete address is then available in your account.',
    paragraphs: [
      'Payment alone does not authorise address use. If your account shows an outstanding requirement, follow that instruction before updating your website, invoices or company records. An administrative suspension must be resolved separately from payment.',
    ],
    steps: [],
    links: [
      {
        label: 'Open your account',
        href: '/account',
      },
      {
        label: 'Verification help',
        href: '/help/verification-problems',
      },
    ],
    homepage: true,
  },
  {
    slug: 'registered-office',
    category: 'business-address',
    title: 'Can I register my company using your address?',
    summary:
      'Eligible companies can use the Central London address as their registered office once their account is approved. Check that it is suitable for your company’s jurisdiction before subscribing.',
    paragraphs: [
      'A registered office is the official address for company correspondence. A director’s service address is for correspondence to the director; it does not replace their residential details where those are separately required.',
      'You are responsible for making and maintaining company filings. Subscription approval does not automatically update Companies House.',
    ],
    steps: [],
    links: [
      {
        label: 'Registered office guide',
        href: '/registered-office-address',
      },
      {
        label: 'Director’s service address guide',
        href: '/directors-service-address',
      },
    ],
    homepage: true,
  },
  {
    slug: 'home-address-privacy',
    category: 'business-address',
    title: 'Can I keep my home address private?',
    summary:
      'Using a separate business, registered office or service address helps keep your residential address off new business correspondence and eligible public filings.',
    paragraphs: [
      'It does not automatically remove information already published on the public register. You may still need to provide your residential address privately for verification or other requirements.',
    ],
    steps: [],
    links: [
      {
        label: 'Director’s service address guide',
        href: '/directors-service-address',
      },
    ],
    homepage: true,
  },
  {
    slug: 'permitted-address-use',
    category: 'business-address',
    title: 'Can I use the address on my website and invoices?',
    summary:
      'Once approved, you can use it for your eligible business correspondence, website and invoices, subject to the service terms.',
    paragraphs: [
      'Do not use it as a residential address, for personal post, parcels or bulky items, or to misrepresent where your business operates. Illegal or fraudulent activity, high-risk financial services and unregulated investments are prohibited by the current terms.',
      'A business address does not guarantee acceptance by a bank or another provider. Check their requirements before applying.',
    ],
    steps: [],
    links: [
      {
        label: 'Read permitted uses and restrictions',
        href: '/terms',
      },
      {
        label: 'Ask about your business',
        href: '/contact',
      },
    ],
    homepage: true,
  },
  {
    slug: 'update-company-address',
    category: 'business-address',
    title: 'How do I update my company address?',
    summary:
      'Obtain the complete approved address from your account, then update the relevant company records and senders.',
    paragraphs: [],
    steps: [
      'Wait until your account has completed all requirements and address access is approved.',
      'Use the address displayed in your account; do not copy a promotional example.',
      'Make the required company filings yourself or through your adviser.',
      'Tell relevant clients and suppliers your approved correspondence address.',
    ],
    links: [
      {
        label: 'Open your account',
        href: '/account',
      },
      {
        label: 'Registered office guide',
        href: '/registered-office-address',
      },
    ],
    homepage: false,
  },
  {
    slug: 'digital-mail',
    category: 'digital-mail',
    title: 'How does digital mail management work?',
    summary:
      'Eligible business letters are received, scanned and made available in your customer dashboard. You can view and download available correspondence online.',
    paragraphs: [
      'Some correspondence may have restrictions. A letter cannot be viewed until its scan is available and your account has the required access. No guaranteed upload or delivery time is stated here.',
    ],
    steps: [],
    links: [
      {
        label: 'View and download a scan',
        href: '/help/read-download-mail',
      },
    ],
    homepage: true,
  },
  {
    slug: 'read-download-mail',
    category: 'digital-mail',
    title: 'How do I view or download a scanned letter?',
    summary: 'Use the Mail area of your customer dashboard to open available correspondence.',
    paragraphs: [],
    steps: [
      'Sign in and open Mail.',
      'Select the letter you want to read.',
      'Choose Open scan to view it, or Download to save a copy.',
      'If the scan is unavailable or access is restricted, check your account requirements before trying again.',
    ],
    links: [
      {
        label: 'Open Mail',
        href: '/mail',
      },
      {
        label: 'Unable to access mail',
        href: '/help/mail-access',
      },
    ],
    homepage: false,
  },
  {
    slug: 'mail-notifications',
    category: 'digital-mail',
    title: 'How do mail notifications work?',
    summary:
      'Mail notification emails help you know when correspondence has been added. Your dashboard is the place to check available scans.',
    paragraphs: [
      'Check your junk folder and the email address recorded in Account settings if an expected notification is missing. Email delivery can fail or be delayed; a missing email does not necessarily mean a letter is missing.',
      'If the dashboard shows mail but notifications keep failing, contact support. Never send your password or verification documents with a support enquiry.',
    ],
    steps: [],
    links: [
      {
        label: 'Open Mail',
        href: '/mail',
      },
      {
        label: 'Account settings',
        href: '/account/settings',
      },
      {
        label: 'Contact support',
        href: '/contact',
      },
    ],
    homepage: false,
  },
  {
    slug: 'originals-retention',
    category: 'digital-mail',
    title: 'What happens to original letters and digital scans?',
    summary:
      'Physical originals and digital scans have different retention arrangements. Request an eligible original promptly if you need it.',
    paragraphs: [
      'The current forwarding window excludes letters aged 30 days or more. Do not assume an original is still available after that window.',
      'The terms describe a 30-day scan retention period after termination, but retention does not guarantee access from a restricted or closed account. Download important available scans while your account is active, and contact support about any remaining correspondence before service ends.',
    ],
    steps: [],
    links: [
      {
        label: 'Request an original',
        href: '/help/request-forwarding',
      },
      {
        label: 'Read the current service terms',
        href: '/terms',
      },
    ],
    homepage: false,
  },
  {
    slug: 'request-forwarding',
    category: 'forwarding',
    title: 'How do I request an original letter?',
    summary:
      'You can request forwarding of an eligible original from the Mail area, subject to availability and the forwarding window.',
    paragraphs: [],
    steps: [
      'Check that your forwarding address is complete and current in your account.',
      'Open Mail and select the letter.',
      'Use the forwarding control and review the request details before submitting.',
      'Check the request status in your account. A request is not confirmation of dispatch.',
    ],
    links: [
      {
        label: 'Open Mail',
        href: '/mail',
      },
      {
        label: 'Manage addresses',
        href: '/account/addresses',
      },
      {
        label: 'Check charges and restrictions',
        href: '/help/forwarding-charges',
      },
    ],
    homepage: false,
  },
  {
    slug: 'forwarding-charges',
    category: 'forwarding',
    title: 'What does physical forwarding cost?',
    summary:
      'Eligible HMRC and Companies House letters are forwarded within the UK at no additional charge. Other UK letters cost £2 per item. International forwarding is quoted on request.',
    paragraphs: [
      'Check the destination, eligibility and current terms before requesting an original. Parcels and bulky items are not accepted. No delivery time is guaranteed.',
      'Letters aged 30 days or more cannot be forwarded under the current window. Contact support if you need to confirm an original’s availability or an international arrangement.',
    ],
    steps: [],
    links: [
      {
        label: 'Service and forwarding terms',
        href: '/terms',
      },
      {
        label: 'Contact support',
        href: '/contact',
      },
    ],
    homepage: false,
  },
  {
    slug: 'subscription-prices',
    category: 'billing',
    title: 'Where can I find monthly and annual prices?',
    summary:
      'The Pricing page displays current monthly and annual amounts, billing frequency and any calculated annual saving.',
    paragraphs: [
      'Both options include the same core service. Review the amount and terms at checkout. If a price is unavailable, do not rely on an old screenshot or an earlier Help Centre price.',
    ],
    steps: [],
    links: [
      {
        label: 'See current pricing',
        href: '/pricing',
      },
    ],
    homepage: false,
  },
  {
    slug: 'manage-billing',
    category: 'billing',
    title: 'How do I update my payment details?',
    summary: 'Use Manage billing in your account’s Billing area to open the secure payment portal.',
    paragraphs: [],
    steps: [
      'Sign in and open Account → Billing.',
      'Select Manage billing.',
      'Follow the portal instructions to update the payment method.',
      'Return to your account and check its billing status. If the portal is unavailable, contact support.',
    ],
    links: [
      {
        label: 'Open Billing',
        href: '/account/billing',
      },
      {
        label: 'Contact support',
        href: '/contact',
      },
    ],
    homepage: false,
  },
  {
    slug: 'failed-payments',
    category: 'billing',
    title: 'What happens if a payment fails?',
    summary:
      'A failed payment can restrict service. Check Billing and follow the payment instructions shown in your account.',
    paragraphs: [
      'Use Manage billing to update your payment method where available. If you are asked to complete payment, follow that account action instead.',
      'Settling a payment does not bypass identity or business checks, and does not remove an administrative suspension. Contact support if access remains restricted after you have completed the displayed requirements.',
    ],
    steps: [],
    links: [
      {
        label: 'Open Billing',
        href: '/account/billing',
      },
      {
        label: 'Unable to access mail',
        href: '/help/mail-access',
      },
    ],
    homepage: false,
  },
  {
    slug: 'cancel-subscription',
    category: 'billing',
    title: 'Can I cancel my subscription?',
    summary:
      'Yes. Review the current cancellation terms and the date shown in your billing portal before confirming. Contact support if you need help with the notice period or service end date.',
    paragraphs: [
      'The published terms specify 30 days’ notice. The account’s billing interface describes cancellation at the end of the paid period. If those dates differ, ask support to confirm the applicable end date rather than assuming immediate cancellation.',
    ],
    steps: [
      'Open Account → Billing and select Manage billing.',
      'Review the cancellation option and effective date shown before confirming.',
      'Update company records and senders, and stop using the address when the service ends. Contact support about outstanding mail in advance.',
    ],
    links: [
      {
        label: 'Open Billing',
        href: '/account/billing',
      },
      {
        label: 'Cancellation terms',
        href: '/terms',
      },
      {
        label: 'Confirm your end date with support',
        href: '/contact',
      },
    ],
    homepage: true,
  },
  {
    slug: 'invoices-renewals',
    category: 'billing',
    title: 'Where are my invoices and renewal details?',
    summary: 'Your account’s Billing area shows subscription information and available invoices.',
    paragraphs: [],
    steps: [
      'Open Account → Billing.',
      'Review the displayed subscription status and next billing date or service end date.',
      'Use the available invoice download link to save a copy.',
      'If an invoice or payment is missing, contact support rather than submitting the same payment again.',
    ],
    links: [
      {
        label: 'Open Billing',
        href: '/account/billing',
      },
    ],
    homepage: false,
  },
  {
    slug: 'why-verification',
    category: 'verification',
    title: 'Why is identity verification required?',
    summary:
      'We need to verify customers and required business owners before approving address use. Follow the identity and business checks requested during setup.',
    paragraphs: [
      'These checks are separate from any Companies House verification obligations. Paying for a subscription does not replace verification or approval.',
    ],
    steps: [],
    links: [
      {
        label: 'Complete your verification',
        href: '/account/verification',
      },
      {
        label: 'Verification information',
        href: '/help/verification-documents',
      },
    ],
    homepage: true,
  },
  {
    slug: 'verification-documents',
    category: 'verification',
    title: 'What information do I need for verification?',
    summary:
      'Follow the secure verification flow for the documents and business information required for your application.',
    paragraphs: [
      'Be ready to provide accurate personal and business details and the identification or address evidence requested. Requirements may depend on your circumstances; the verification screen gives the applicable instructions.',
      'Required business owners may also need to complete checks. Do not email identity documents, passwords or security codes to support.',
    ],
    steps: [],
    links: [
      {
        label: 'Open verification',
        href: '/account/verification',
      },
    ],
    homepage: false,
  },
  {
    slug: 'verification-problems',
    category: 'verification',
    title: 'My verification is incomplete or unsuccessful. What next?',
    summary: 'Check the status and instructions in Account → Verification.',
    paragraphs: [],
    steps: [
      'Read whether your check is in review, needs more information, or requires support.',
      'If the page requests another attempt, follow the document instructions and ensure images and details are clear and accurate.',
      'Check whether any required business-owner checks are still outstanding.',
      'If the check is rejected or you cannot continue, contact support. Do not assume another payment will resolve it.',
    ],
    links: [
      {
        label: 'Open verification',
        href: '/account/verification',
      },
      {
        label: 'Contact support',
        href: '/contact',
      },
    ],
    homepage: false,
  },
  {
    slug: 'update-profile',
    category: 'account',
    title: 'How do I update my personal or company details?',
    summary:
      'Account settings contains your personal details, email and password controls. Business details are managed separately.',
    paragraphs: [],
    steps: [
      'Open Account → Settings for the available profile, email and password controls.',
      'Follow any confirmation instructions when changing your email address.',
      'Open Businesses for company information. If a detail cannot be edited, contact support.',
    ],
    links: [
      {
        label: 'Account settings',
        href: '/account/settings',
      },
      {
        label: 'Business details',
        href: '/account/businesses',
      },
    ],
    homepage: false,
  },
  {
    slug: 'password-login',
    category: 'account',
    title: 'How do I reset my password or solve a login problem?',
    summary: 'Use the password reset option on the login page if you cannot sign in.',
    paragraphs: [],
    steps: [
      'Open Log in and choose the password reset option.',
      'Enter the email address associated with your account and follow the instructions.',
      'Check your inbox and junk folder. If a reset link is expired, request a new one.',
      'Contact support if you still cannot access your account. Do not share your password or reset link.',
    ],
    links: [
      {
        label: 'Log in',
        href: '/login',
      },
      {
        label: 'Contact support',
        href: '/contact',
      },
    ],
    homepage: false,
  },
  {
    slug: 'account-security',
    category: 'account',
    title: 'How can I keep my account secure?',
    summary:
      'Use a unique password, keep access to your email account secure and sign out on shared devices.',
    paragraphs: [
      'Use Account settings to change your password when signed in. If you suspect someone else has accessed your account, contact support promptly. Never share passwords, reset links or verification codes.',
    ],
    steps: [],
    links: [
      {
        label: 'Account settings',
        href: '/account/settings',
      },
      {
        label: 'Privacy information',
        href: '/privacy',
      },
    ],
    homepage: false,
  },
  {
    slug: 'international-customers',
    category: 'international',
    title: 'Are international customers accepted?',
    summary:
      'You may apply from outside the UK, subject to supported jurisdictions, required verification and business eligibility. Approval is not guaranteed.',
    paragraphs: [
      'The terms restrict applications from high-risk or restricted jurisdictions. Ask about your circumstances before subscribing if you are unsure.',
      'The service is a business address, not evidence of UK residence or a visa entitlement. Check your own tax, banking and company requirements independently.',
    ],
    steps: [],
    links: [
      {
        label: 'Eligibility and service terms',
        href: '/terms',
      },
      {
        label: 'Ask about eligibility',
        href: '/contact',
      },
    ],
    homepage: true,
  },
  {
    slug: 'mail-access',
    category: 'troubleshooting',
    title: 'Why can’t I access my mail or business address?',
    summary: 'Check the requirements and account status shown in your dashboard before retrying.',
    paragraphs: [
      'Access can depend on payment, an active subscription, identity and business checks, and approval. Administrative restrictions are handled separately; making a payment does not lift a suspension.',
      'Complete the action displayed in your account. If everything appears complete but access is still blocked, contact support with a description of the problem—without passwords or sensitive documents.',
    ],
    steps: [],
    links: [
      {
        label: 'Open your account',
        href: '/account',
      },
      {
        label: 'Billing help',
        href: '/help/failed-payments',
      },
      {
        label: 'Verification help',
        href: '/help/verification-problems',
      },
    ],
    homepage: false,
  },
  {
    slug: 'missing-mail',
    category: 'troubleshooting',
    title: 'What if a letter is missing or unexpected?',
    summary:
      'Check Mail and its filters first. If expected correspondence is missing, confirm with the sender that it was sent to your approved address.',
    paragraphs: [
      'Contact support with the sender’s name and approximate posting date where known. Avoid sending sensitive letter contents in an initial enquiry. Delivery and scanning times are not guaranteed here.',
      'If a letter appears to belong to someone else, do not forward or share it. Contact support so it can be investigated.',
    ],
    steps: [],
    links: [
      {
        label: 'Open Mail',
        href: '/mail',
      },
      {
        label: 'Contact support',
        href: '/contact',
      },
      {
        label: 'Missing notification emails',
        href: '/help/mail-notifications',
      },
    ],
    homepage: false,
  },
  {
    slug: 'contact-support',
    category: 'troubleshooting',
    title: 'How do I contact support?',
    summary: 'Use the contact page for account, mail or billing questions you cannot resolve here.',
    paragraphs: [
      'Describe what you were trying to do and the message you saw. Do not include payment card details, passwords, reset links or identity documents.',
      'For an account-specific problem, use the email address associated with your account where possible. No response-time guarantee is stated here.',
    ],
    steps: [],
    links: [
      {
        label: 'Contact support',
        href: '/contact',
      },
    ],
    homepage: false,
  },
];
export const homepageHelp = [
  'what-is-a-virtual-office',
  'subscription-inclusions',
  'registered-office',
  'home-address-privacy',
  'address-activation',
  'permitted-address-use',
  'why-verification',
  'cancel-subscription',
  'international-customers',
  'digital-mail',
].map((slug) => helpArticles.find((article) => article.slug === slug)!);
export function searchHelp(query: string, category = 'all'): HelpArticle[] {
  const words = query.toLocaleLowerCase('en-GB').trim().split(/\s+/).filter(Boolean);
  return helpArticles.filter((article) => {
    if (category !== 'all' && article.category !== category) return false;
    const text = [
      article.title,
      article.summary,
      ...article.paragraphs,
      ...article.steps,
      ...article.links.map((link) => link.label),
      helpCategories.find((c) => c.id === article.category)?.title,
    ]
      .join(' ')
      .toLocaleLowerCase('en-GB');
    return words.every((word) => text.includes(word));
  });
}
