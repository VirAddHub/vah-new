# UI Verification Checklist

## User Dashboard Edge Cases

### HMRC/Companies House Items
- [ ] HMRC/Companies House item shows **Free** (no charge hints)
- [ ] Non-official item shows **£2** messaging (if you expose it)
- [ ] Forwarding button is enabled for both types
- [ ] Cost display is accurate based on item type

### Forwarding Request Flow
- [ ] Request modal opens with pre-filled mail item details
- [ ] Address validation works correctly
- [ ] Form submission shows loading state
- [ ] Success message appears after request creation
- [ ] Request appears in user's forwarding history

## Admin Dashboard Edge Cases

### Search and Filtering
- [ ] Search by **tracking number** finds dispatched item
- [ ] Search by **recipient name** works correctly
- [ ] Filter by status (Requested, Reviewed, Processing, Dispatched, Delivered) works
- [ ] Pagination works correctly with large result sets

### Status Management
- [ ] Cancel button disappears on **Delivered/Cancelled** items
- [ ] Only valid status transitions are available in dropdown
- [ ] Status changes are reflected immediately in the UI
- [ ] Admin notes field is editable for all statuses

### Dispatch Validation
- [ ] Trying to dispatch **without** courier/tracking shows inline validation error
- [ ] Courier field is required when marking as dispatched
- [ ] Tracking number field is required when marking as dispatched
- [ ] Validation errors are clear and actionable

### Security
- [ ] Non-admin users cannot access admin forwarding routes
- [ ] Admin middleware properly blocks unauthorized access
- [ ] Session validation works correctly

## Error Handling

### Network Issues
- [ ] API failures show user-friendly error messages
- [ ] Retry mechanisms work for transient failures
- [ ] Loading states prevent double-submissions

### Validation Errors
- [ ] Form validation errors are displayed inline
- [ ] Server validation errors are properly displayed
- [ ] Required fields are clearly marked

## Performance

### Large Datasets
- [ ] Admin dashboard loads quickly with many requests
- [ ] Search results are returned promptly
- [ ] Pagination prevents UI freezing

### Real-time Updates
- [ ] Status changes are reflected without page refresh
- [ ] New requests appear in admin queue automatically
- [ ] User dashboard updates when request status changes

## Mobile Responsiveness

### User Dashboard
- [ ] Forwarding request modal works on mobile
- [ ] Address form is usable on small screens
- [ ] Status indicators are clearly visible

### Admin Dashboard
- [ ] Table is responsive and scrollable
- [ ] Action buttons are accessible on mobile
- [ ] Search and filter controls work on mobile

## Accessibility

### Keyboard Navigation
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical and intuitive
- [ ] Focus indicators are visible

### Screen Reader Support
- [ ] Form labels are properly associated
- [ ] Status changes are announced
- [ ] Error messages are accessible

## Cross-browser Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari Mobile
- [ ] Firefox Mobile

## Data Integrity

### Request Lifecycle
- [ ] Request data persists correctly through status changes
- [ ] Admin notes are saved and displayed
- [ ] Tracking information is properly stored
- [ ] Timestamps are accurate and consistent

### User Permissions
- [ ] Users can only see their own requests
- [ ] Users cannot modify requests after creation
- [ ] Admin actions are properly logged