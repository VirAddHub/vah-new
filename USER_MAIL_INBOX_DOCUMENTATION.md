# User Mail Inbox Section Documentation

## Overview

The user mail inbox section is a comprehensive mail management interface that allows users to view, organize, tag, archive, and forward their mail items. It features a responsive design with distinct layouts for desktop and mobile devices.

**Location:** `apps/frontend/app/(dashboard)/mail/page-content.tsx`

---

## Architecture

### Main Component Structure

```
MailInboxPage (page-content.tsx)
├── Header Section
│   ├── Title + Item Count
│   └── Search Bar
├── Tag Filter Indicator (when active)
├── Tabs Navigation
│   ├── Inbox Tab
│   ├── Archived Tab
│   └── Tags Tab
└── Content Area
    ├── Mail List View (default)
    └── Mail Detail View (when item selected)
```

### Key Components

1. **MailInboxPage** (`page-content.tsx`) - Main container component
2. **MailDetail** (`components/dashboard/user/MailDetail.tsx`) - Individual mail item detail view
3. **MailList** (`components/dashboard/user/MailList.tsx`) - Mail list wrapper (legacy, not used in current implementation)
4. **CreatableTagSelect** - Tag selection/creation component
5. **TagDot** - Visual tag indicator component

---

## Desktop Implementation

### Layout Structure

```tsx
<div className="w-full -mx-4 md:mx-0 px-4 md:px-0">
  {/* Header */}
  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8 gap-4">
    <h1>Mail</h1>
    <span>{inboxCount} items</span>
    <SearchBar />
  </div>

  {/* Tabs */}
  <Tabs>
    <TabsList>
      <TabsTrigger>Inbox · {inboxCount}</TabsTrigger>
      <TabsTrigger>Archived · {archivedCount}</TabsTrigger>
      <TabsTrigger>Tags · {tagsCount}</TabsTrigger>
    </TabsList>
  </Tabs>

  {/* Content */}
  {selectedMailDetail ? <MailDetail /> : <MailList />}
</div>
```

### Desktop Mail List Item

**Layout:**
- **Left:** Icon (Building2/FileText/Landmark) + Sender Name + Subject (if different)
- **Right:** Tag Selector + Archive/Unarchive Button + Date

**Styling:**
```tsx
<div className="hidden md:flex items-center gap-4 flex-1 min-w-0">
  {/* Icon */}
  <Icon className="h-5 w-5" />
  
  {/* Sender/Subject */}
  <div className="flex-1 min-w-0">
    <p className="text-[15px] font-semibold">{senderName}</p>
    {subject && <p className="text-sm text-neutral-500">{subject}</p>}
  </div>
</div>

{/* Actions */}
<div className="hidden md:flex items-center gap-4 flex-shrink-0">
  <CreatableTagSelect />
  <Button>Archive</Button>
  <span className="text-xs text-neutral-500">{date}</span>
</div>
```

### Desktop Mail Detail View

**Layout:**
- Back button (top left)
- Title + Received date
- Action buttons (View Scan, Archive/Unarchive, Request Forwarding)
- PDF preview embedded in card
- Full-width layout, replaces list view in-place

**Styling:**
```tsx
<div className="w-full md:relative fixed inset-0 md:inset-auto bg-white md:bg-transparent z-50 md:z-auto">
  <div className="p-4 md:p-0">
    <MailDetail item={selectedMailDetail} />
  </div>
</div>
```

### Desktop Tags View

**Layout:**
- Grouped by tag with collapsible sections
- Each group shows:
  - Tag header with color dot + count
  - Collapse/expand button
  - List of mail items under that tag
- "Manage Tags" button at top right

**Styling:**
```tsx
<div className="space-y-6">
  {groupedByTag.map(({ tag, items, count }) => (
    <div>
      {/* Tag Header */}
      <div className="sticky top-0 z-10 bg-white py-2 border-b">
        <button onClick={toggleCollapse}>
          <ChevronDown />
        </button>
        <TagDot tag={tag} />
        <h2>{getTagLabel(tag)}</h2>
        <span>{count} items</span>
      </div>
      
      {/* Mail Items */}
      {!isCollapsed && (
        <div className="space-y-2">
          {items.map(item => <MailItemCard />)}
        </div>
      )}
    </div>
  ))}
</div>
```

---

## Mobile Implementation

### Layout Structure

```tsx
<div className="w-full -mx-4 px-4">
  {/* Header - Stacked */}
  <div className="flex flex-col gap-4">
    <h1 className="text-2xl">Mail</h1>
    <SearchBar className="w-full" />
  </div>

  {/* Tabs - Sticky at top */}
  <Tabs>
    <div className="sticky top-[56px] z-20 bg-white -mx-4 px-4 pb-3 border-b">
      <TabsList className="flex-1">
        <TabsTrigger className="flex-1">Inbox</TabsTrigger>
        <TabsTrigger className="flex-1">Archived</TabsTrigger>
        <TabsTrigger className="flex-1">Tags</TabsTrigger>
      </TabsList>
    </div>
  </Tabs>

  {/* Content */}
  {selectedMailDetail ? (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <MailDetail />
    </div>
  ) : (
    <MailList />
  )}
</div>
```

### Mobile Mail List Item

**Layout:**
- **Single Row:** Icon + Sender Name (with tag dot if tagged) + Date
- Compact, no subject line shown
- Full-width clickable area

**Styling:**
```tsx
<div className="flex items-center gap-3 flex-1 min-w-0 md:hidden">
  {/* Icon */}
  <Icon className="h-5 w-5" />
  
  {/* Sender + Tag */}
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2">
      <p className="text-[15px] truncate">{senderName}</p>
      {tag && <TagDot tag={tag} />}
    </div>
  </div>
  
  {/* Date */}
  <span className="text-xs text-neutral-500 whitespace-nowrap">{date}</span>
</div>
```

### Mobile Mail Detail View

**Layout:**
- Full-screen overlay (`fixed inset-0`)
- Back button at top
- Title + date
- Action buttons stacked vertically
- PDF preview below
- Scrollable content

**Styling:**
```tsx
<div className="fixed inset-0 bg-white z-50 overflow-y-auto">
  <div className="p-4 pb-8">
    <button onClick={onBack}>
      <ArrowLeft /> Back to Inbox
    </button>
    
    <h1>{title}</h1>
    <p>Received {formatTime(created_at)}</p>
    
    {/* Actions - Stacked */}
    <div className="flex flex-col gap-2.5">
      <Button className="w-full">View Scan</Button>
      <Button variant="outline" className="w-full">Archive</Button>
      <Button variant="outline" className="w-full">Request Forwarding</Button>
    </div>
    
    {/* PDF Preview */}
    <div className="rounded-lg border bg-neutral-50 p-4">
      <object data={miniViewerUrl} type="application/pdf" />
    </div>
  </div>
</div>
```

### Mobile Tags View

**Layout:**
- Tag headers are sticky (`sticky top-[56px]`)
- Collapsible groups
- Same mail item layout as inbox (compact)
- No tag selector or archive buttons visible (actions hidden)

---

## Key Features

### 1. Search Functionality

**Implementation:**
```tsx
<Input
  placeholder="Search mail..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

**Search Fields:**
- Subject
- Sender name
- Tag
- Received date

**Filtering Logic:**
```tsx
const filteredItems = useMemo(() => {
  let items = mailItems;
  
  // Filter by tab (inbox/archived/tags)
  if (activeTab === 'archived') {
    items = items.filter(item => item.deleted);
  } else if (activeTab === 'inbox') {
    items = items.filter(item => !item.deleted);
    if (selectedTagFilter) {
      items = items.filter(item => item.tag === selectedTagFilter);
    }
  }
  
  // Apply search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    items = items.filter(item =>
      item.subject?.toLowerCase().includes(query) ||
      item.sender_name?.toLowerCase().includes(query) ||
      item.tag?.toLowerCase().includes(query) ||
      item.received_date?.toLowerCase().includes(query)
    );
  }
  
  return items;
}, [mailItems, activeTab, searchQuery, selectedTagFilter]);
```

### 2. Tag Management

**Features:**
- Create new tags via `CreatableTagSelect`
- Filter inbox by tag (click tag header in Tags tab)
- Rename tags (bulk operation)
- Merge tags (bulk operation)
- Delete tags (removes from all active items)

**Tag Display:**
- Color-coded dots (`TagDot` component)
- Human-readable labels (converts `my_tag` → `My Tag`)
- Predefined tag labels (HMRC, Companies House, Bank, etc.)

**Tag Operations:**
```tsx
// Rename
POST /api/bff/tags/rename
{ from: "old_tag", to: "new_tag" }

// Merge
POST /api/bff/tags/merge
{ source: "tag1", target: "tag2" }

// Delete
POST /api/bff/tags/delete
{ tag: "tag_to_delete" }
```

### 3. Archive/Unarchive

**Implementation:**
- Archive: `DELETE /api/bff/mail-items/{id}`
- Unarchive: `POST /api/bff/mail-items/{id}/restore`
- Optimistic updates for instant UI feedback
- Auto-navigates back to list after archiving

### 4. Mail Detail View

**Features:**
- In-place replacement (desktop) or full-screen overlay (mobile)
- Embedded PDF preview (`miniViewerUrl`)
- Action buttons: View Scan, Archive/Unarchive, Request Forwarding
- Auto-marks as read when opened
- Scroll position preservation when navigating back

**PDF Preview Loading:**
```tsx
useEffect(() => {
  // Load PDF preview blob URL
  const url = `/api/bff/mail/scan-url?mailItemId=${id}&disposition=inline`;
  const res = await fetch(url);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  setMiniViewerUrl(blobUrl);
}, [selectedMailDetail?.id]);
```

### 5. Forwarding Request

**Features:**
- GDPR compliance check (30-day limit)
- Inline error notice if expired
- Modal form for forwarding details
- Validates forwarding address completeness

**GDPR Check:**
```tsx
const receivedDate = item.received_date || item.created_at;
const daysDiff = Math.floor((now - received) / (1000 * 60 * 60 * 24));

if (daysDiff > 30) {
  setForwardInlineNotice('Mail older than 30 days cannot be forwarded');
  return;
}
```

---

## Responsive Breakpoints

### Mobile (< 768px)
- Stacked header layout
- Full-width search bar
- Sticky tabs at `top-[56px]`
- Compact mail items (icon + sender + date)
- Full-screen detail view overlay
- Stacked action buttons

### Desktop (≥ 768px)
- Horizontal header layout
- Fixed-width search bar (`w-80`)
- Static tabs
- Expanded mail items (icon + sender + subject + actions)
- In-place detail view replacement
- Horizontal action buttons

---

## State Management

### Local State
```tsx
const [activeTab, setActiveTab] = useState<'inbox' | 'archived' | 'tags'>('inbox');
const [searchQuery, setSearchQuery] = useState('');
const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set());
const [selectedMailDetail, setSelectedMailDetail] = useState<MailItem | null>(null);
const [showPDFModal, setShowPDFModal] = useState(false);
const [showForwardingModal, setShowForwardingModal] = useState(false);
const [scrollPosition, setScrollPosition] = useState(0);
```

### SWR Data Fetching
```tsx
const { data: mailData, error: mailError, isLoading: mailLoading, mutate: mutateMailItems } = useMail();
const { data: tagsData, mutate: mutateTags } = useTags();
const { data: profileData } = useProfile();
```

### Optimistic Updates
- Tag updates
- Archive/unarchive operations
- Tag rename/merge/delete operations
- Reverts on error, revalidates on success

---

## Styling Details

### Colors
- **Primary:** `#206039` (brand green)
- **Neutral:** Various shades (`neutral-50` to `neutral-900`)
- **Text:** `neutral-900` (headings), `neutral-600` (body), `neutral-500` (meta)
- **Borders:** `neutral-200`
- **Backgrounds:** `white`, `neutral-50` (subtle), `neutral-100` (hover)

### Typography
- **Headings:** `font-semibold`, `text-2xl md:text-3xl`
- **Body:** `text-[15px]` (mail items), `text-sm` (meta)
- **Font Family:** Poppins (via CSS variable `--font-poppins`)

### Spacing
- **Gap:** `gap-2` to `gap-6` depending on context
- **Padding:** `px-4 md:px-6 py-4 md:py-5` (mail items)
- **Margins:** `mb-6 md:mb-8` (sections)

### Transitions
- **Duration:** `duration-150` (standard), `duration-300` (modals)
- **Properties:** `transition-colors`, `transition-all`

### Shadows
- **Hover:** `hover:shadow-sm`
- **Modals:** `shadow-lg`

---

## Code Examples

### Mail Item Rendering (Desktop)
```tsx
<div
  onClick={() => handleMailClick(item)}
  className="flex items-center gap-4 md:gap-5 rounded-lg border px-5 md:px-6 py-4 md:py-5 bg-white hover:bg-neutral-50 border-neutral-200 hover:border-primary/30 hover:shadow-sm cursor-pointer"
>
  {/* Icon */}
  <Icon className={cn("h-5 w-5", isRead ? 'text-neutral-400' : 'text-neutral-700')} />
  
  {/* Sender/Subject */}
  <div className="flex-1 min-w-0">
    <p className={cn("text-[15px] truncate", isRead ? 'font-medium' : 'font-semibold')}>
      {senderName}
    </p>
    {subject && <p className="text-sm text-neutral-500 truncate">{subject}</p>}
  </div>
  
  {/* Actions */}
  <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
    <CreatableTagSelect value={item.tag} onValueChange={(tag) => handleTagUpdate(item, tag)} />
    <Button onClick={(e) => handleArchive(item, e)}>Archive</Button>
    <span className="text-xs text-neutral-500">{date}</span>
  </div>
</div>
```

### Mail Item Rendering (Mobile)
```tsx
<div
  onClick={() => handleMailClick(item)}
  className="flex items-center gap-3 rounded-lg border px-5 py-4 bg-white hover:bg-neutral-50 cursor-pointer min-h-[56px]"
>
  <Icon className="h-5 w-5" />
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2">
      <p className="text-[15px] truncate">{senderName}</p>
      {tag && <TagDot tag={tag} />}
    </div>
  </div>
  <span className="text-xs text-neutral-500 whitespace-nowrap">{date}</span>
</div>
```

### Tag Group Rendering
```tsx
{groupedByTag.map(({ tag, items, count }) => {
  const isCollapsed = collapsedTags.has(tag);
  
  return (
    <div key={tag}>
      {/* Tag Header */}
      <div className="sticky top-[56px] md:top-0 z-10 bg-white py-2.5 border-b">
        <button onClick={(e) => handleCollapseToggle(tag, e)}>
          {isCollapsed ? <ChevronRight /> : <ChevronDown />}
        </button>
        <button onClick={() => handleTagHeaderClick(tag)}>
          <TagDot tag={tag} />
          <h2>{getTagLabel(tag)}</h2>
          <span>{count} items</span>
        </button>
      </div>
      
      {/* Mail Items */}
      {!isCollapsed && (
        <div className="space-y-2">
          {items.map(item => (
            <MailItemCard item={item} onClick={() => handleMailClick(item)} />
          ))}
        </div>
      )}
    </div>
  );
})}
```

---

## API Endpoints Used

### Mail Items
- `GET /api/bff/mail-items` - Fetch all mail items
- `PATCH /api/bff/mail-items/{id}` - Update mail item (tag, read status)
- `DELETE /api/bff/mail-items/{id}` - Archive mail item
- `POST /api/bff/mail-items/{id}/restore` - Unarchive mail item
- `GET /api/bff/mail/scan-url?mailItemId={id}&disposition=inline` - Get PDF preview URL

### Tags
- `GET /api/bff/tags` - Fetch all tags
- `POST /api/bff/tags/rename` - Rename tag (bulk)
- `POST /api/bff/tags/merge` - Merge tags (bulk)
- `POST /api/bff/tags/delete` - Delete tag (bulk)

### Forwarding
- `POST /api/bff/forwarding/requests` - Create forwarding request

### Profile
- `GET /api/bff/profile` - Fetch user profile (for forwarding address)

---

## Accessibility Features

1. **Keyboard Navigation:** All interactive elements are keyboard accessible
2. **ARIA Labels:** Buttons have descriptive labels
3. **Focus Management:** Focus rings on interactive elements
4. **Screen Reader Support:** Semantic HTML structure
5. **Color Contrast:** WCAG AA compliant color combinations

---

## Performance Optimizations

1. **Memoization:** `useMemo` for filtered items and grouped tags
2. **Optimistic Updates:** Instant UI feedback before API confirmation
3. **Lazy Loading:** PDF previews loaded on-demand
4. **SWR Caching:** Automatic cache management and revalidation
5. **Debounced Search:** Search filtering handled efficiently

---

## Browser Compatibility

- **Modern Browsers:** Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile:** iOS Safari 14+, Chrome Mobile
- **Features Used:**
  - CSS Grid/Flexbox
  - CSS Custom Properties
  - Fetch API
  - URL.createObjectURL
  - Intersection Observer (if used for infinite scroll)

---

## Future Enhancements

1. **Infinite Scroll:** Load more mail items as user scrolls
2. **Bulk Actions:** Select multiple items for batch operations
3. **Keyboard Shortcuts:** Quick navigation and actions
4. **Email Notifications:** Real-time updates for new mail
5. **Advanced Filtering:** Date range, sender, status filters
6. **Export:** Download mail items as PDF or CSV

---

## Last Updated

**Date:** 2026-02-09  
**Version:** Current implementation as of commit `aa69fcff`
