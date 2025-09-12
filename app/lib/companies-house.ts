// Companies House API client utilities for signup flow

export interface CompanySearchResult {
  company_number: string;
  title: string;
  address: string;
  status: string;
  kind: string;
}

export interface CompanyProfile {
  company_name: string;
  company_number: string;
  company_status: string;
  date_of_creation: string;
  sic_codes: string[];
  address: {
    line1: string;
    line2: string;
    city: string;
    county: string;
    postcode: string;
    country: string;
  };
}

/**
 * Search for companies by name or company number
 * @param query Search term (company name or number)
 * @returns Array of matching companies
 */
export async function searchCompanies(query: string): Promise<CompanySearchResult[]> {
  if (!query.trim()) return [];
  
  const res = await fetch(`/api/bff/companies/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }
  
  const data = await res.json();
  return data.items || [];
}

/**
 * Fetch detailed company profile by company number
 * @param companyNumber Companies House company number
 * @returns Detailed company profile with address and SIC codes
 */
export async function fetchCompanyProfile(companyNumber: string): Promise<CompanyProfile> {
  const res = await fetch(`/api/bff/companies/${encodeURIComponent(companyNumber)}`);
  if (!res.ok) {
    throw new Error(`Profile lookup failed: ${res.status}`);
  }
  
  return res.json();
}

/**
 * Debounced search function for use in React components
 * @param query Search term
 * @param delay Debounce delay in milliseconds (default: 300)
 * @returns Promise that resolves to search results
 */
export function createDebouncedSearch(delay: number = 300) {
  let timeoutId: NodeJS.Timeout;
  
  return (query: string, callback: (results: CompanySearchResult[]) => void) => {
    clearTimeout(timeoutId);
    
    if (!query.trim()) {
      callback([]);
      return;
    }
    
    timeoutId = setTimeout(async () => {
      try {
        const results = await searchCompanies(query);
        callback(results);
      } catch (error) {
        console.error('Company search error:', error);
        callback([]);
      }
    }, delay);
  };
}
