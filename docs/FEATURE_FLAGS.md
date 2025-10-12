# Feature Flags / Kill-Switches

## Environment Variables

Add these to your Vercel/Render environment:

```bash
# BFF Safety
BFF_READS_ONLY=1                    # Blocks all non-GET requests to BFF routes

# Performance Optimizations (can be disabled)
PERF_OPTIMIZATIONS=0                # Disable all performance optimizations
REQUEST_COALESCE=0                  # Disable request coalescing
AUTO_RETRY_POSTS=0                  # Disable automatic retry for POST requests
PDF_RANGE_SUPPORT=0                 # Disable PDF range requests

# Status Safety
STRICT_STATUS_GUARD=1               # Enable strict status transition validation
```

## Usage

- **BFF_READS_ONLY=1**: Prevents accidental BFF writes, forces direct backend calls
- **STRICT_STATUS_GUARD=1**: Enforces allowed status transitions, prevents illegal moves
- **PERF_OPTIMIZATIONS=0**: Disable all performance features if they cause issues

## Emergency Rollback

If anything goes wrong, set all flags to 0 to disable safety features:

```bash
BFF_READS_ONLY=0
STRICT_STATUS_GUARD=0
PERF_OPTIMIZATIONS=0
```
