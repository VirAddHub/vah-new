// src/content/content.ts
// Centralized content management - DO NOT EDIT without approval
// This file contains all marketing copy, claims, and numbers

export const copy = {
  brand: {
    name: "VirtualAddressHub",
    shortName: "VAH",
    tagline: "Professional London Business Address & Mail Forwarding"
  },
  
  hero: {
    title: "Professional London Business Address & Mail Forwarding",
    subtitle: "Get a prestigious London business address for your company registration. Secure digital mail scanning, forwarding, and virtual office services.",
    ctaPrimary: "Secure My London Address — Start Today",
    ctaSecondary: "See Plans"
  },
  
  about: {
    title: "About Us",
    subtitle: "We empower UK businesses with a secure, compliant London presence – without the traditional office. Whether you're launching a start-up, working from home, or operating from abroad, we simplify compliance, protect your privacy, and manage your official post professionally.",
    
    whatWeDo: {
      title: "What We Do",
      description: "VirtualAddressHub provides a London-based virtual address service built on legal compliance, digital convenience, and total transparency. Every subscription includes:",
      points: [
        "Registered Office & Director's Address: Use our central London address with Companies House and HMRC.",
        "Business Address for Everyday Use: Ideal for banks, websites, invoicing, and formal correspondence.",
        "Same-Day Mail Scanning: All incoming post is scanned and uploaded to your dashboard the same day it arrives.",
        "Secure Digital Access: View, download, tag, or delete your scanned letters – anytime, anywhere.",
        "Optional Mail Forwarding: HMRC and Companies House letters are forwarded free. All other mail can be forwarded for just £2 per item (covering postage & handling).",
        "Built-In Compliance: Fully GDPR-compliant and AML-supervised – your data is protected, always.",
        "No Lock-In, No Nonsense: Cancel anytime. No hidden charges, no long-term contracts."
      ]
    },
    
    whyWeExist: {
      title: "Why We Exist",
      description: "Too many founders face risks – fines, exposure, or legal complications – by using their home address, or by overpaying for outdated services. We created VirtualAddressHub as a modern, no-fuss alternative:",
      points: [
        "Fully compliant: With all UK laws, including new Companies House rules.",
        "Fairly priced: No surprises, no mark-ups.",
        "Fast to set up: With secure ID checks and instant dashboard access.",
        "Made for modern businesses: Designed for remote-first operations and digital convenience."
      ]
    },
    
    whoWeSupport: {
      title: "Who We Support",
      points: [
        "UK start-ups and growing companies",
        "Remote founders, freelancers & consultants",
        "International entrepreneurs expanding to the UK",
        "Agencies, tradespeople, digital nomads, and side hustlers",
        "Anyone needing a legitimate, compliant UK business address – minus the office overhead."
      ]
    },
    
    compliance: {
      title: "Our Compliance Promise",
      description: "We take your privacy, security, and legal standing seriously. That's why VirtualAddressHub is:",
      points: [
        "Supervised by HMRC for Anti-Money Laundering (AML).",
        "Registered with the ICO (UK GDPR compliance).",
        "Run by a UK private limited company.",
        "Based in London, with a real, staffed mail-handling location."
      ]
    },
    
    stats: {
      title: "Our Performance",
      uptime: "99.9%",
      activeUsers: "1000+",
      mailProcessed: "50,000+"
    },
    
    contact: {
      title: "Got Questions? Speak to Our UK Team.",
      description: "We're not a call centre; we're a small, dedicated UK team who understands what it's like to run lean, modern businesses. Need help or want to chat before signing up? We're here to help.",
      email: "support@virtualaddresshub.co.uk"
    }
  },
  
  pricing: {
    title: "Simple, Transparent Pricing",
    subtitle: "One plan. Everything you need for a compliant, professional London presence— with same-day digital mail and full control from your dashboard.",
    
    plans: {
      basic: {
        name: "Virtual Mailbox",
        description: "London Business Address + Same-Day Digital Mail",
        monthlyPrice: "£9.99",
        annualPrice: "£89.99",
        annualSavings: "25%",
        features: [
          "Central London business address",
          "Same-day mail scanning",
          "Digital dashboard access",
          "Free HMRC & Companies House forwarding",
          "£2 forwarding for other mail",
          "GDPR compliant",
          "Cancel anytime"
        ]
      }
    }
  },
  
  features: {
    included: [
      "Central London business address",
      "Same-day mail scanning", 
      "Digital dashboard access",
      "Free HMRC & Companies House forwarding",
      "£2 forwarding for other mail",
      "GDPR compliant",
      "Cancel anytime"
    ]
  },
  
  legal: {
    privacyPolicy: "/privacy",
    termsOfService: "/terms", 
    kycPolicy: "/kyc-policy"
  }
};

// Freeze the object to prevent runtime mutation
Object.freeze(copy);

// Export individual sections for easier imports
export const { brand, hero, about, pricing, features, legal } = copy;
