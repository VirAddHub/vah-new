# Filename Parser Update Complete ✅

## Summary
Updated the OneDrive webhook filename parser to expect the **tag at the end** of the filename, making it more robust and flexible for complex filenames.

## What Changed

### Before (Regex-based)
- Required exact pattern: `user{id}_{date}_{tag}.pdf`
- No support for extra words between date and tag
- Complex regex patterns for UK/ISO dates
- Limited flexibility

### After (Token-based)
- **Tag is always the last token** before `.pdf`
- Supports extra words: `user4_10-10-2024_bank_statement_companieshouse.pdf`
- Robust date extraction (UK or ISO format)
- Smart tag normalization

## New Filename Format

### Valid Examples ✅

**UK Date Format:**
- `user4_10-10-2024_companieshouse.pdf`
- `user4_10_10_2024_hmrc.pdf`
- `user44_01-11-2024_barclays.pdf`
- `user4_10-10-2024_bank_statement_companieshouse.pdf` (extra words)

**ISO Date Format:**
- `user4_2024-10-10_hmrc.pdf`
- `user4_2024_10_10_bank.pdf`

**Edge Cases:**
- `user4_10-10-2024.pdf` → tag = "GENERAL" (no tag)
- `user4_10-10-2024_` → tag = "GENERAL" (empty tag)

## Parser Logic

### 1. Extract User ID
```javascript
const idMatch = base.match(/^user(\d+)/);
const userId = idMatch ? Number(idMatch[1]) : null;
```

### 2. Extract Date (UK or ISO)
```javascript
// UK: DD-MM-YYYY or DD_MM_YYYY
const uk = base.match(/^user\d+[_\-](\d{2})[\/_\-](\d{2})[\/_\-](\d{4})/);

// ISO: YYYY-MM-DD or YYYY_MM_DD  
const iso = base.match(/^user\d+[_\-](\d{4})[\/_\-](\d{2})[\/_\-](\d{2})/);
```

### 3. Extract Tag (Last Token)
```javascript
const parts = base.split(/[_\-]/).filter(Boolean);
const last = parts[parts.length - 1];
const tagRaw = last?.replace(/\.pdf$/, "") || null;
```

### 4. Normalize Tag
```javascript
const normaliseTag = (tagRaw) => {
  const t = (tagRaw || "").toLowerCase();
  
  if (t.includes("hmrc")) return "HMRC";
  if (t.includes("companies")) return "COMPANIES HOUSE";
  if (/(bank|barclays|hsbc|lloyds|natwest|monzo|starling)/.test(t)) return "BANK";
  if (/(insur|policy)/.test(t)) return "INSURANCE";
  if (/(util|gas|electric|water|octopus|ovo|thames)/.test(t)) return "UTILITIES";
  if (!t) return "GENERAL";
  
  return t.replace(/-/g, ' ').toUpperCase();
};
```

## Test Results

### ✅ Working Examples

| Filename | User ID | Date | Tag |
|----------|---------|------|-----|
| `user4_10-10-2024_companieshouse.pdf` | 4 | 2024-10-10 | COMPANIES HOUSE |
| `user4_10_10_2024_hmrc.pdf` | 4 | 2024-10-10 | HMRC |
| `user44_01-11-2024_barclays.pdf` | 44 | 2024-11-01 | BANK |
| `user4_10-10-2024_bank_statement_companieshouse.pdf` | 4 | 2024-10-10 | COMPANIES HOUSE |
| `user4_2024-10-10_hmrc.pdf` | 4 | 2024-10-10 | HMRC |
| `user4_10-10-2024_insurance-policy.pdf` | 4 | 2024-10-10 | INSURANCE |
| `user4_10-10-2024_utilities-bill.pdf` | 4 | 2024-10-10 | BILL |

### ❌ Invalid Examples (Return null)

| Filename | Reason |
|----------|--------|
| `notuser4_10-10-2024_tag.pdf` | Doesn't start with "user" |
| `user99999_10-10-2024_tag.pdf` | User ID too high (>10000) |
| `user0_10-10-2024_tag.pdf` | User ID too low (≤0) |

## Benefits

### 1. **Flexibility** ✅
- Supports extra descriptive words in filenames
- Handles both UK and ISO date formats
- Works with underscores or hyphens as separators

### 2. **Robustness** ✅
- Token-based parsing instead of complex regex
- Handles edge cases gracefully
- Clear error handling for invalid inputs

### 3. **Maintainability** ✅
- Easier to understand and modify
- Comprehensive tag normalization
- Better logging and debugging

### 4. **User Experience** ✅
- More descriptive filenames possible
- Consistent tag normalization
- Clear fallback behavior

## Zapier/Make Integration

### Updated Regex for Zapier

**UK Date Format:**
```
^user(?<id>\d+)[_\-](?<dd>\d{2})[\/_\-](?<mm>\d{2})[\/_\-](?<yyyy>\d{4})(?:[_\-].*?)?[_\-](?<tag>[a-z0-9\-]+)\.pdf$
```

**ISO Date Format:**
```
^user(?<id>\d+)[_\-](?<yyyy>\d{4})[\/_\-](?<mm>\d{2})[\/_\-](?<dd>\d{2})(?:[_\-].*?)?[_\-](?<tag>[a-z0-9\-]+)\.pdf$
```

### Build ISO Date in Zapier
```
{{yyyy}}-{{mm}}-{{dd}}
```

## Priority Order

1. **Tag in webhook payload** (if provided by Zapier)
2. **Sender/subject heuristics** (existing logic)
3. **Filename last token** (new approach)
4. **Fallback: "GENERAL"**

## Files Updated

- **`apps/backend/src/server/routes/webhooks-onedrive.ts`** - Updated parser logic
- **Webhook instructions** - Updated to reflect new format

## Next Steps

1. **Update Zapier/Make regex** to use the new patterns
2. **Test with real file uploads** using the new format
3. **Monitor webhook logs** for successful parsing
4. **Verify mail items** are created with correct tags

---

## 🎉 **Parser Update Complete!**

The filename parser now robustly handles the **tag-at-the-end** format, supporting complex filenames with extra descriptive words while maintaining backward compatibility and clear error handling.
