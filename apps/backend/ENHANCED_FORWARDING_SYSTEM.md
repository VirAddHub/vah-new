# Enhanced Forwarding System

## Overview

The enhanced forwarding system provides transaction-safe, idempotent mail forwarding with an outbox pattern for reliable event processing. This replaces the previous Zapier-dependent system with a robust internal solution.

## Features

- ✅ **Transaction Safety**: All forwarding operations are atomic
- ✅ **Idempotency**: Double-click safe with unique constraints
- ✅ **Outbox Pattern**: Retryable events without external dependencies
- ✅ **State Machine**: Controlled status transitions
- ✅ **Pricing Logic**: Free for HMRC/Companies House, £2 for others
- ✅ **Audit Trail**: Complete logging and tracking
- ✅ **Internal API**: Protected endpoints for background processing

## Architecture

### Database Tables

1. **`forwarding_request`** - Main forwarding requests with full address details
2. **`forwarding_charge`** - Tracks £2 forwarding fees
3. **`forwarding_outbox`** - Retryable events for external notifications
4. **`mail_item`** - Enhanced with forwarding_status and expires_at

### Components

1. **State Machine** (`src/modules/forwarding/state.ts`)
   - Defines legal status transitions
   - Prevents invalid state changes

2. **Forwarding Service** (`src/modules/forwarding/forwarding.service.ts`)
   - Transaction-safe request creation
   - Idempotency handling
   - Pricing logic

3. **Outbox Worker** (`src/modules/forwarding/outbox.worker.ts`)
   - Processes retryable events
   - Exponential backoff
   - Error handling

4. **Internal API** (`src/routes/internal.ts`)
   - Protected outbox draining endpoint
   - Token-based authentication

## API Endpoints

### User Endpoints

- `POST /api/forwarding/requests` - Create forwarding request
- `GET /api/forwarding/requests` - List user's forwarding requests
- `POST /api/forwarding/requests/bulk` - Bulk forwarding

### Internal Endpoints

- `POST /api/internal/forwarding/drain` - Process outbox events (requires `x-internal-cron-token`)

## Environment Variables

```bash
# Required for internal API authentication
INTERNAL_CRON_TOKEN=your-long-random-string-here
```

## Usage Examples

### Creating a Forwarding Request

```typescript
const result = await createForwardingRequest({
  userId: 123,
  mailItemId: 456,
  to: {
    name: 'John Smith',
    address1: '123 Main Street',
    address2: 'Apt 4B',
    city: 'London',
    state: 'England',
    postal: 'SW1A 1AA',
    country: 'GB',
  },
  reason: 'Personal mail forwarding',
  method: 'standard',
});
```

### Processing Outbox Events

```bash
# Manual outbox processing
curl -X POST https://your-api.com/api/internal/forwarding/drain \
  -H "x-internal-cron-token: your-token"
```

## Status Flow

```
Pending → Requested → Processing → Dispatched → Delivered
    ↓         ↓           ↓
Cancelled  Cancelled  Cancelled
```

## Pricing Logic

- **Free**: HMRC, Companies House mail
- **£2.00**: All other mail types
- **Automatic**: Charges created during request creation

## Deployment

1. **Run Migration**: Execute `026_enhanced_forwarding_system.sql`
2. **Set Environment**: Add `INTERNAL_CRON_TOKEN` to your environment
3. **Deploy Code**: The new system is backward compatible
4. **Setup Cron**: Configure daily cron job to hit `/api/internal/forwarding/drain`

## Cron Job Setup

### Render Cron Job

```bash
# Add to your Render cron job
curl -X POST https://your-api.onrender.com/api/internal/forwarding/drain \
  -H "x-internal-cron-token: $INTERNAL_CRON_TOKEN"
```

### Local Testing

```bash
# Test the system
node test-forwarding.js

# Manual outbox drain
curl -X POST http://localhost:3001/api/internal/forwarding/drain \
  -H "x-internal-cron-token: your-token"
```

## Monitoring

- **Outbox Events**: Check `forwarding_outbox` table for pending events
- **Failed Events**: Monitor `last_error` and `attempt_count` columns
- **Charges**: Track `forwarding_charge` table for billing

## Migration from Old System

The new system is backward compatible. Existing forwarding requests will continue to work while new requests use the enhanced system.

## Security

- **Token Authentication**: Internal endpoints protected with `INTERNAL_CRON_TOKEN`
- **User Validation**: All operations validate user ownership
- **SQL Injection**: Parameterized queries prevent injection attacks
- **Rate Limiting**: Existing rate limiting applies to all endpoints

## Troubleshooting

### Common Issues

1. **Outbox Events Not Processing**
   - Check cron job is running
   - Verify `INTERNAL_CRON_TOKEN` is correct
   - Check `forwarding_outbox` table for errors

2. **Duplicate Requests**
   - System is idempotent by design
   - Unique constraint prevents duplicates
   - Check `idem_key` for debugging

3. **Charges Not Created**
   - Verify mail tag detection
   - Check `isOfficialMail()` function
   - Review `forwarding_charge` table

### Debug Commands

```sql
-- Check pending outbox events
SELECT * FROM forwarding_outbox WHERE status = 'pending';

-- Check failed events
SELECT * FROM forwarding_outbox WHERE status = 'failed';

-- Check forwarding requests
SELECT * FROM forwarding_request ORDER BY created_at DESC LIMIT 10;

-- Check charges
SELECT * FROM forwarding_charge ORDER BY created_at DESC LIMIT 10;
```

## Performance

- **Indexes**: Optimized for common queries
- **Transactions**: Minimal lock time
- **Batch Processing**: Outbox processes multiple events
- **Connection Pooling**: Uses existing PostgreSQL pool

This enhanced system provides a robust, scalable foundation for mail forwarding operations without external dependencies.


