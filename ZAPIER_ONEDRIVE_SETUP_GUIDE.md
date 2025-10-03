# 🔧 Zapier OneDrive Webhook Setup Guide

## 🚨 **Current Issue**
Your Zapier webhook is sending placeholder data instead of real OneDrive file information:
- `name: "(unnamed)"` ❌
- `path: "/"` ❌

## ✅ **Solution: Fix Zapier OneDrive Trigger**

### **Step 1: Check OneDrive Trigger Configuration**

1. **Open your Zapier workflow**
2. **Click on the OneDrive trigger step**
3. **Verify the trigger is set to:**
   - **Trigger:** "New File in Folder" or "New File"
   - **Folder:** The folder where you upload files (e.g., "Scanned_Mail")

### **Step 2: Fix Webhook Payload Mapping**

In your **Webhook step**, ensure these fields are properly mapped:

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

### **Step 3: Test with Real File Upload**

1. **Upload a test file** with the correct naming pattern:
   - `user22_10_02_2025.pdf` ✅
   - `user44_12_04_2022.pdf` ✅

2. **Check Zapier logs** to see if real data is being sent

3. **Monitor webhook response** - should return `200 OK` with success message

## 🎯 **Expected Webhook Response**

When working correctly, you should see:

```json
{
  "ok": true,
  "action": "created_or_updated",
  "mailItemId": 123,
  "userId": 22,
  "userName": "Sarah Johnson",
  "itemId": "01U3TMRMFMGLHIDSGEEJBY5KYA6V7J4ARH", // pragma: allowlist secret
  "subject": "user22_10_02_2025.pdf",
  "status": "received",
  "message": "File \"user22_10_02_2025.pdf\" added to Sarah's inbox"
}
```

## 🔍 **Debugging Steps**

### **Check Zapier Data**
1. **Test the OneDrive trigger** - does it detect new files?
2. **Check field mapping** - are the correct OneDrive fields selected?
3. **Test webhook** - does it receive real data?

### **Check Webhook Logs**
The webhook now provides detailed error messages:
- **Placeholder data detected** → Fix Zapier mapping
- **Missing userId** → Add userId to payload or use correct filename pattern
- **User not found** → Verify user exists in database

## 📋 **Filename Pattern Requirements**

The webhook extracts user ID from filenames using this pattern:
- `user22_10_02_2025.pdf` → User ID: 22
- `user44_12_04_2022.pdf` → User ID: 44
- `user39_12_03_1990.pdf` → User ID: 39

**Format:** `user{ID}_{day}_{month}_{year}.pdf`

## 🚀 **Next Steps**

1. **Fix Zapier configuration** using the steps above
2. **Test with real file upload** (`user22_10_02_2025.pdf`)
3. **Check user dashboard** - file should appear in Sarah's inbox
4. **Verify file can be viewed/downloaded** from the frontend

## 📞 **Need Help?**

If you're still getting placeholder data:
1. **Check Zapier trigger setup** - ensure it's detecting real files
2. **Verify field mapping** - ensure OneDrive fields are properly selected
3. **Test with different file types** - try uploading a simple text file first
4. **Check Zapier logs** - look for any error messages in the workflow

The webhook is now ready to handle real OneDrive files once Zapier is properly configured! 🎯

## 🚨 **Current Issue**
Your Zapier webhook is sending placeholder data instead of real OneDrive file information:
- `name: "(unnamed)"` ❌
- `path: "/"` ❌

## ✅ **Solution: Fix Zapier OneDrive Trigger**

### **Step 1: Check OneDrive Trigger Configuration**

1. **Open your Zapier workflow**
2. **Click on the OneDrive trigger step**
3. **Verify the trigger is set to:**
   - **Trigger:** "New File in Folder" or "New File"
   - **Folder:** The folder where you upload files (e.g., "Scanned_Mail")

### **Step 2: Fix Webhook Payload Mapping**

In your **Webhook step**, ensure these fields are properly mapped:

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

### **Step 3: Test with Real File Upload**

1. **Upload a test file** with the correct naming pattern:
   - `user22_10_02_2025.pdf` ✅
   - `user44_12_04_2022.pdf` ✅

2. **Check Zapier logs** to see if real data is being sent

3. **Monitor webhook response** - should return `200 OK` with success message

## 🎯 **Expected Webhook Response**

When working correctly, you should see:

```json
{
  "ok": true,
  "action": "created_or_updated",
  "mailItemId": 123,
  "userId": 22,
  "userName": "Sarah Johnson",
  "itemId": "01U3TMRMFMGLHIDSGEEJBY5KYA6V7J4ARH", // pragma: allowlist secret
  "subject": "user22_10_02_2025.pdf",
  "status": "received",
  "message": "File \"user22_10_02_2025.pdf\" added to Sarah's inbox"
}
```

## 🔍 **Debugging Steps**

### **Check Zapier Data**
1. **Test the OneDrive trigger** - does it detect new files?
2. **Check field mapping** - are the correct OneDrive fields selected?
3. **Test webhook** - does it receive real data?

### **Check Webhook Logs**
The webhook now provides detailed error messages:
- **Placeholder data detected** → Fix Zapier mapping
- **Missing userId** → Add userId to payload or use correct filename pattern
- **User not found** → Verify user exists in database

## 📋 **Filename Pattern Requirements**

The webhook extracts user ID from filenames using this pattern:
- `user22_10_02_2025.pdf` → User ID: 22
- `user44_12_04_2022.pdf` → User ID: 44
- `user39_12_03_1990.pdf` → User ID: 39

**Format:** `user{ID}_{day}_{month}_{year}.pdf`

## 🚀 **Next Steps**

1. **Fix Zapier configuration** using the steps above
2. **Test with real file upload** (`user22_10_02_2025.pdf`)
3. **Check user dashboard** - file should appear in Sarah's inbox
4. **Verify file can be viewed/downloaded** from the frontend

## 📞 **Need Help?**

If you're still getting placeholder data:
1. **Check Zapier trigger setup** - ensure it's detecting real files
2. **Verify field mapping** - ensure OneDrive fields are properly selected
3. **Test with different file types** - try uploading a simple text file first
4. **Check Zapier logs** - look for any error messages in the workflow

The webhook is now ready to handle real OneDrive files once Zapier is properly configured! 🎯
