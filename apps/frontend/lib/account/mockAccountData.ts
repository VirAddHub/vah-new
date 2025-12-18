import { AccountPageData } from './types';

/**
 * Temporary mock data for account page
 * TODO: Replace with real API fetch from /api/bff/account
 */
export const mockAccountData: AccountPageData = {
  subscription: {
    plan_name: "Digital Mailbox Plan",
    price_label: "£9.99",
    billing_period: "monthly",
    status: "active"
  },
  contact: {
    first_name: "",
    last_name: "",
    email: "",
    phone: ""
  },
  forwarding_address: null,
  business_address: null,
  owners: [],
  invoices: []
};
