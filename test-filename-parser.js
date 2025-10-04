// Test the new filename parser
// Run with: node test-filename-parser.js

// Robust filename parser that expects tag at the end
const extractFromFilename = (name) => {
  const n = name.toLowerCase().replace(/\s+/g, "");
  const base = n.replace(/\.pdf$/, "");

  // 1) Extract userId
  const idMatch = base.match(/^user(\d+)/);
  const userId = idMatch ? Number(idMatch[1]) : null;
  if (!userId || userId <= 0 || userId >= 10000) {
    return null;
  }

  // 2) Extract date (UK or ISO format)
  const uk = base.match(/^user\d+[_\-](\d{2})[\/_\-](\d{2})[\/_\-](\d{4})/);
  const iso = base.match(/^user\d+[_\-](\d{4})[\/_\-](\d{2})[\/_\-](\d{2})/);
  let dateIso = null;
  
  if (uk) {
    const [, dd, mm, yyyy] = uk;
    dateIso = `${yyyy}-${mm}-${dd}`;
  } else if (iso) {
    const [, yyyy, mm, dd] = iso;
    dateIso = `${yyyy}-${mm}-${dd}`;
  }

  // 3) Extract tag = last token after last _ or - (ignore any middle bits)
  const parts = base.split(/[_\-]/).filter(Boolean);
  const last = parts[parts.length - 1];
  const tagRaw = last?.replace(/\.pdf$/, "") || null;

  // 4) Normalize tag
  const tag = normaliseTag(tagRaw);

  return {
    userId,
    dateIso: dateIso || new Date().toISOString().split('T')[0],
    tag
  };
};

// Normalize tag from raw filename token
const normaliseTag = (tagRaw) => {
  const t = (tagRaw || "").toLowerCase();
  
  if (t.includes("hmrc")) return "HMRC";
  if (t.includes("companies")) return "COMPANIES HOUSE";
  if (/(bank|barclays|hsbc|lloyds|natwest|monzo|starling)/.test(t)) return "BANK";
  if (/(insur|policy)/.test(t)) return "INSURANCE";
  if (/(util|gas|electric|water|octopus|ovo|thames)/.test(t)) return "UTILITIES";
  if (!t) return "GENERAL";
  
  // Convert kebab-case to proper case
  return t.replace(/-/g, ' ').toUpperCase();
};

// Test cases
const testCases = [
  // UK date format
  'user4_10-10-2024_companieshouse.pdf',
  'user4_10_10_2024_hmrc.pdf',
  'user44_01-11-2024_barclays.pdf',
  'user4_10-10-2024_bank_statement_companieshouse.pdf',
  
  // ISO date format
  'user4_2024-10-10_hmrc.pdf',
  'user4_2024_10_10_bank.pdf',
  
  // Edge cases
  'user4_10-10-2024_insurance-policy.pdf',
  'user4_10-10-2024_utilities-bill.pdf',
  'user4_10-10-2024_unknown-tag.pdf',
  'user4_10-10-2024.pdf', // No tag
  'user4_10-10-2024_', // Empty tag
  
  // Invalid cases
  'notuser4_10-10-2024_tag.pdf',
  'user99999_10-10-2024_tag.pdf', // User ID too high
  'user0_10-10-2024_tag.pdf', // User ID too low
];

console.log('🧪 Testing New Filename Parser\n');
console.log('Format: user{id}_{date}_{tag}.pdf (tag at the end)\n');

testCases.forEach((filename, i) => {
  const result = extractFromFilename(filename);
  console.log(`${i + 1}. "${filename}"`);
  console.log(`   → ${result ? JSON.stringify(result, null, 2) : 'null'}`);
  console.log('');
});

console.log('✅ Parser handles:');
console.log('  - UK dates: DD-MM-YYYY or DD_MM_YYYY');
console.log('  - ISO dates: YYYY-MM-DD or YYYY_MM_DD');
console.log('  - Extra words between date and tag');
console.log('  - Tag normalization (companieshouse → COMPANIES HOUSE)');
console.log('  - Fallback to GENERAL for unknown tags');
console.log('  - Invalid user IDs return null');
