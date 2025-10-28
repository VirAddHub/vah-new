# Mail Tagging and Archive Fixes

**Date:** January 27, 2025  
**Issues Fixed:** 
1. Tag dialog now shows existing tags for reuse
2. Archive functionality now works properly

---

## 🔧 **Issues Fixed**

### **Issue 1: Tag Dialog - No Option to Reuse Existing Tags** ✅

**Problem:** When tagging a mail item, users had to type a new tag every time. There was no way to see existing tags and reuse them.

**Solution:** 
- Added a dropdown (Select component) that shows all existing tags/subjects
- Users can now:
  1. **Select** an existing tag from the dropdown (faster)
  2. **OR** type a new tag in the input field below
- Both options work seamlessly - the dropdown sets the value that can be edited further

**Changes Made:**
- Added `Select` component import from `./ui/select`
- Added dropdown showing `availableSubjects` 
- Users can select from dropdown or type new subject
- Improved user experience with better UI feedback

**File:** `apps/frontend/components/MailManagement.tsx`

---

### **Issue 2: Archive Button Not Working** ✅

**Problem:** Clicking the Archive button didn't work because:
- Backend uses `deleted` field to indicate archived status
- Frontend was checking for `archived` field (which doesn't exist)
- Backend API was filtering out deleted items by default

**Solution:**
1. **Updated MailItem interface** to use `deleted` field instead of `archived`
2. **Updated all filter logic** to check `item.deleted` instead of `item.archived`
3. **Updated backend API** to support `?includeArchived=true` query parameter
4. **Updated frontend** to fetch all items (including deleted) so archived items are visible

**Changes Made:**

**Frontend (`apps/frontend/components/MailManagement.tsx`):**
- Changed interface: `archived?: boolean` → `deleted?: boolean`
- Updated all filter logic from `item.archived` to `item.deleted`
- Fixed tab counts to use `deleted` field

**Frontend (`apps/frontend/components/UserDashboard.tsx`):**
- Added `deleted?: boolean` to MailItem interface
- Updated API call to include `?includeArchived=true` parameter

**Backend (`apps/backend/src/server/routes/mail.ts`):**
- Added support for `includeArchived` query parameter
- Query now includes deleted items when `includeArchived=true`
- This allows frontend to fetch all items and filter them client-side

---

## 🎯 **How It Works Now**

### **Tagging System:**
1. User clicks "Tag" button on a mail item
2. Dialog opens showing:
   - **Dropdown with existing tags** (e.g., "HMRC", "Companies House", "Invoice")
   - **Text input** to type a new tag
3. User can either:
   - Select from dropdown (reuse existing tag)
   - Type in the input field (create new tag)
4. Click "Update Subject" to apply

### **Archive System:**
1. User clicks "Archive" button on a mail item
2. Backend sets `deleted = true` in database
3. Mail item moves from Inbox to Archived tab
4. User can click "Restore" to move it back to Inbox
5. Backend sets `deleted = false` in database

---

## 📊 **Technical Details**

### **Backend API Changes:**
```typescript
// Before: Always filtered out deleted items
WHERE m.user_id = $1 AND m.deleted = false

// After: Conditionally includes archived items
const deletedFilter = includeArchived ? '' : 'AND m.deleted = false';
WHERE m.user_id = $1 ${deletedFilter}
```

### **Frontend Changes:**
```typescript
// Before: Used non-existent 'archived' field
interface MailItem {
  archived?: boolean;
}

// After: Uses actual 'deleted' field from backend
interface MailItem {
  deleted?: boolean;
}

// API call now includes archived items
const { data } = useSWR('/api/mail-items?includeArchived=true', fetcher);
```

### **Tag Dialog UI:**
```typescript
// Added Select dropdown component
<Select value={newTag} onValueChange={setNewTag}>
  <SelectTrigger>
    <SelectValue placeholder="Select existing or type new" />
  </SelectTrigger>
  <SelectContent>
    {availableSubjects.map((subject) => (
      <SelectItem key={subject} value={subject}>
        {subject}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## ✅ **Testing Checklist**

- [x] Update MailItem interface to use `deleted` field
- [x] Update all filter logic to check `deleted` instead of `archived`
- [x] Update backend API to support `includeArchived` parameter
- [x] Update frontend to fetch all items including archived
- [x] Add Select component import
- [x] Add dropdown for existing tags
- [x] Update tag dialog UI
- [x] No linting errors

---

## 🚀 **What Users Will See**

### **Tagging:**
- Click "Tag" → Dialog opens with dropdown of existing tags
- Can select existing tag OR type new one
- Both options work seamlessly

### **Archive:**
- Click "Archive" → Mail moves to Archived tab
- Click "Restore" → Mail moves back to Inbox
- Tab counts show correct numbers for both inbox and archived

---

## 📝 **Files Modified**

1. `apps/frontend/components/MailManagement.tsx`
   - Updated MailItem interface
   - Added Select import
   - Updated tag dialog to show existing tags in dropdown
   - Updated all archive logic to use `deleted` field

2. `apps/frontend/components/UserDashboard.tsx`
   - Updated MailItem interface
   - Added `?includeArchived=true` to API call

3. `apps/backend/src/server/routes/mail.ts`
   - Added `includeArchived` query parameter support
   - Updated SQL query to conditionally include deleted items

---

## 🎉 **Both Issues Resolved!**

Users can now:
- ✅ See existing tags when tagging a mail item
- ✅ Reuse existing tags by selecting from dropdown
- ✅ Create new tags by typing
- ✅ Archive mail items successfully
- ✅ Restore archived mail items
- ✅ See correct counts in Inbox and Archived tabs

