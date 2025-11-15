# 📋 Mailroom Filename Cheat Sheet

## Quick Reference

When scanning mail, rename files using this format:

```
userId_date_tag.pdf
```

**Example:** `42_2025-11-15_companies-house.pdf`

---

## 📅 Date Formats

You can use **either** format:

- **UK Format:** `DD-MM-YYYY` or `DD_MM_YYYY`
  - ✅ `42_15-11-2025_hmrc.pdf`
  - ✅ `42_15_11_2025_barclays.pdf`

- **ISO Format:** `YYYY-MM-DD` or `YYYY_MM_DD`
  - ✅ `42_2025-11-15_hmrc.pdf`
  - ✅ `42_2025_11_15_barclays.pdf`

---

## 🏷️ Tag Options

The **last part** of the filename (before `.pdf`) is the tag. Use these keywords:

### 🟢 **HMRC** (Free Forwarding)
Use any of these in the filename:
- `hmrc`
- `hmrc-vat`
- `hmrc-tax`
- `vat`
- `tax`
- `corporation-tax` or `ct`
- `self-assessment` or `sa`
- `paye`
- `income-tax`

**Examples:**
- `42_2025-11-15_hmrc.pdf`
- `42_2025-11-15_vat.pdf`
- `42_2025-11-15_corporation-tax.pdf`
- `42_2025-11-15_hmrc-vat.pdf`

**Result:** Tagged as `hmrc` → **Free forwarding** ✅

---

### 🟢 **Companies House** (Free Forwarding)
Use any of these:
- `companies-house` or `companieshouse`
- `companies`
- `ch`
- `co-house`

**Examples:**
- `42_2025-11-15_companies-house.pdf`
- `42_2025-11-15_companieshouse.pdf`
- `42_2025-11-15_ch.pdf`

**Result:** Tagged as `companies_house` → **Free forwarding** ✅

---

### 🟡 **Bank Statements**
Use any of these:
- `bank`
- `barclays`
- `hsbc`
- `lloyds`
- `natwest`
- `monzo`
- `starling`
- `halifax`
- `santander`
- `nationwide`
- `first-direct`
- `tsb`
- `rbs`

**Examples:**
- `42_2025-11-15_barclays.pdf`
- `42_2025-11-15_bank.pdf`
- `42_2025-11-15_hsbc.pdf`

**Result:** Tagged as `bank` → Standard forwarding (£2 fee)

---

### 🔵 **Insurance**
Use any of these:
- `insurance`
- `insur`
- `policy`
- `premium`
- `cover`

**Examples:**
- `42_2025-11-15_insurance.pdf`
- `42_2025-11-15_policy.pdf`

**Result:** Tagged as `insurance` → Standard forwarding (£2 fee)

---

### 🟣 **Utilities**
Use any of these:
- `utilities` or `util`
- `gas`
- `electric`
- `water`
- `octopus`
- `ovo`
- `thames`
- `british-gas`
- `edf`
- `e-on`
- `npower`
- `scottish-power`

**Examples:**
- `42_2025-11-15_utilities.pdf`
- `42_2025-11-15_british-gas.pdf`
- `42_2025-11-15_electric.pdf`

**Result:** Tagged as `utilities` → Standard forwarding (£2 fee)

---

### ⚪ **Other / General**
If it doesn't match any category above, use:
- `other`
- `general`
- Or any descriptive word (will be converted to slug)

**Examples:**
- `42_2025-11-15_other.pdf`
- `42_2025-11-15_general.pdf`
- `42_2025-11-15_invoice.pdf`

**Result:** Tagged as `other` → Standard forwarding (£2 fee)

---

## 💡 Tips

1. **Be specific:** Use the actual sender name when possible (e.g., `barclays` instead of just `bank`)
2. **Use hyphens or underscores:** Both work (`companies-house` or `companies_house`)
3. **Extra words are OK:** The system takes the **last token** as the tag
   - ✅ `42_2025-11-15_bank_statement_companieshouse.pdf` → tag = `companieshouse`
4. **Case doesn't matter:** `HMRC`, `hmrc`, `Hmrc` all work
5. **Free forwarding tags:** Only `hmrc` and `companies_house` are free - everything else is £2

---

## 🔄 Workflow

1. **Scan** → PDF lands in staging folder
2. **Rename** → `userId_date_tag.pdf` (use the cheat sheet above)
3. **Move** → Drop into client's OneDrive mailbox folder
4. **Done!** → System automatically:
   - Creates mail item in dashboard
   - Sets correct tag (for free forwarding rules)
   - Sets human-readable title
   - User sees it in their inbox

---

## ❓ Common Questions

**Q: What if I'm not sure what tag to use?**  
A: Use `other` or `general`. The user can change it later in the dashboard.

**Q: Can I use multiple words?**  
A: Yes! Use hyphens or underscores: `corporation-tax`, `self-assessment`, `companies-house`

**Q: What if I make a mistake?**  
A: The user can update the tag in the dashboard using the "Tag" button.

**Q: Which tags are free for forwarding?**  
A: Only `hmrc` and `companies_house`. Everything else charges £2.

---

## 📝 Examples

| Mail Type | Filename Example | Tag | Forwarding Cost |
|-----------|------------------|-----|-----------------|
| HMRC VAT Return | `42_2025-11-15_hmrc-vat.pdf` | `hmrc` | **FREE** ✅ |
| Companies House Confirmation | `42_2025-11-15_companies-house.pdf` | `companies_house` | **FREE** ✅ |
| Barclays Statement | `42_2025-11-15_barclays.pdf` | `bank` | £2 |
| British Gas Bill | `42_2025-11-15_british-gas.pdf` | `utilities` | £2 |
| Insurance Policy | `42_2025-11-15_insurance.pdf` | `insurance` | £2 |
| Unknown Invoice | `42_2025-11-15_other.pdf` | `other` | £2 |

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0

