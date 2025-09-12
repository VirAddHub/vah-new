# Companies House API Integration

This integration provides live company search and profile lookup for the signup flow.

## Setup

### 1. Environment Variables

**Local Development** (`app/.env.local`):
```bash
COMPANIES_HOUSE_API_KEY=your_api_key_here
```

**Production** (Render Frontend Service):
```
COMPANIES_HOUSE_API_KEY = your_api_key_here
```

⚠️ **Security**: Never commit the API key to git or expose it to the client.

### 2. API Endpoints

The integration provides two BFF (Backend-for-Frontend) endpoints:

- `GET /api/bff/companies/search?q=query` - Search for companies
- `GET /api/bff/companies/[number]` - Get detailed company profile

### 3. Usage in Components

#### Option A: Using the Hook

```tsx
import { useCompaniesHouse } from '@/app/hooks/useCompaniesHouse';

function SignupForm() {
  const {
    isSearching,
    searchResults,
    selectedProfile,
    search,
    selectCompany,
  } = useCompaniesHouse();

  return (
    <div>
      <input 
        onChange={(e) => search(e.target.value)}
        placeholder="Search for your company..."
      />
      {/* Render search results and selected profile */}
    </div>
  );
}
```

#### Option B: Using the Pre-built Component

```tsx
import CompanySearchInput from '@/app/components/CompanySearchInput';

function SignupForm() {
  const handleCompanySelected = (profile) => {
    // Auto-fill form fields with company data
    setFormData({
      companyName: profile.company_name,
      companyNumber: profile.company_number,
      address: profile.address,
      // ... other fields
    });
  };

  return (
    <CompanySearchInput 
      onCompanySelected={handleCompanySelected}
      placeholder="Search for your company..."
    />
  );
}
```

#### Option C: Direct API Calls

```tsx
import { searchCompanies, fetchCompanyProfile } from '@/app/lib/companies-house';

// Search for companies
const results = await searchCompanies('monzo');

// Get detailed profile
const profile = await fetchCompanyProfile('09561709');
```

## Features

- **Debounced Search**: 300ms delay to avoid excessive API calls
- **Error Handling**: Graceful error handling with optional callbacks
- **Type Safety**: Full TypeScript support
- **Security**: API key kept server-side only
- **Caching**: No caching for search results (always fresh)
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Data Structure

### Search Results
```typescript
interface CompanySearchResult {
  company_number: string;
  title: string;
  address: string;
  status: string;
  kind: string;
}
```

### Company Profile
```typescript
interface CompanyProfile {
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
```

## Testing

### Local Testing
```bash
# Search companies
curl "http://localhost:3000/api/bff/companies/search?q=monzo"

# Get company profile
curl "http://localhost:3000/api/bff/companies/09561709"
```

### Direct API Testing
```bash
# Test with your API key
curl -u "$COMPANIES_HOUSE_API_KEY:" \
  "https://api.company-information.service.gov.uk/company/09561709"
```

## Security Notes

1. **Never expose the API key** to the client
2. **Rotate the key** if it was ever committed to git
3. **Rate limiting** is handled by the UI debouncing
4. **Input validation** is performed on both client and server

## Error Handling

The integration handles common error scenarios:

- Missing API key (500 error)
- Invalid search query (empty results)
- Company not found (404 error)
- API rate limiting (502 error)
- Network errors (graceful fallback)

All errors are logged and can be handled via the `onError` callback in the hook.
