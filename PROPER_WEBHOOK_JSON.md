# 🎯 **Proper Zapier Webhook JSON Payload**

## ✅ **Correct Webhook Payload**

Use this **exact JSON structure** in your Zapier webhook step:

```json
{
  "event": "created",
  "itemId": "{{OneDrive File ID}}",
  "name": "{{OneDrive File Name}}",
  "path": "{{OneDrive File Path}}",
  "size": "{{OneDrive File Size}}",
  "mimeType": "{{OneDrive File MIME Type}}",
  "webUrl": "{{OneDrive File Web URL}}",
  "lastModifiedDateTime": "{{OneDrive File Last Modified}}"
}
```

## 🔧 **Zapier Field Mapping**

In your **Zapier Webhook step**, map these fields:

| **Webhook Field** | **Zapier Source** | **Example Value** |
|------------------|-------------------|-------------------|
| `event` | Static text | `"created"` |
| `itemId` | `{{OneDrive File ID}}` | `"01U3TMRMFMGLHIDSGEEJBY5KYA6V7J4ARH // pragma: allowlist secret"` | <!-- pragma: allowlist secret -->
| `name` | `{{OneDrive File Name}}` | `"user22_10_02_2025.pdf"` |
| `path` | `{{OneDrive File Path}}` | `"/Documents/Scanned_Mail/user22_10_02_2025.pdf"` |
| `size` | `{{OneDrive File Size}}` | `1106032` |
| `mimeType` | `{{OneDrive File MIME Type}}` | `"application/pdf"` |
| `webUrl` | `{{OneDrive File Web URL}}` | `"https://virtualaddresshubcouk-my.sharepoint.com/personal/ops_virtualaddresshub_co_uk/Documents/Scanned_Mail/user22_10_02_2025.pdf"` |
| `lastModifiedDateTime` | `{{OneDrive File Last Modified}}` | `"2025-10-02T23:45:00.000Z"` |

## 🚨 **Common Mistakes to Avoid**

### ❌ **DON'T Use These:**
```json
{
  "name": "(unnamed)",           // ❌ Placeholder text
  "path": "/",                   // ❌ Placeholder text
  "itemId": "↳ OneDrive • ID"   // ❌ Zapier placeholder
}
```

### ✅ **DO Use These:**
```json
{
  "name": "user22_10_02_2025.pdf",                    // ✅ Real filename
  "path": "/Documents/Scanned_Mail/user22_10_02_2025.pdf", // ✅ Real path
  "itemId": "01U3TMRMFMGLHIDSGEEJBY5KYA6V7J4ARH // pragma: allowlist secret"      // ✅ Real OneDrive ID
}
```

## 🎯 **Test Payload**

For testing, use this **minimal valid payload**:

```json
{
  "event": "created",
  "itemId": "test123",
  "name": "user22_10_02_2025.pdf",
  "path": "/Documents/Scanned_Mail/user22_10_02_2025.pdf"
}
```

## 🔍 **Expected Response**

When working correctly, you should get:

```json
{
  "ok": true,
  "action": "created_or_updated",
  "mailItemId": 123,
  "userId": 22,
  "userName": "Sarah Johnson",
  "itemId": "test123",
  "subject": "user22_10_02_2025.pdf",
  "status": "received",
  "message": "File \"user22_10_02_2025.pdf\" added to Sarah's inbox"
}
```

## 🚀 **Quick Test Steps**

1. **Copy the JSON payload** above
2. **Paste into Zapier webhook** step
3. **Map the OneDrive fields** correctly
4. **Test with file upload** `user22_10_02_2025.pdf`
5. **Check webhook response** - should be `200 OK`

## 📋 **Filename Pattern**

The webhook extracts user ID from filenames:
- `user22_10_02_2025.pdf` → User ID: 22
- `user44_12_04_2022.pdf` → User ID: 44
- `user39_12_03_1990.pdf` → User ID: 39

**Format:** `user{ID}_{day}_{month}_{year}.pdf`

---

**Use this exact JSON structure and your webhook will work perfectly!** 🎯
