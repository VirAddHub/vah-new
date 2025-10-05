# User Dashboard API Requirements

## **Address & Certificate APIs**

### 1. Get User's Virtual Address
```http
GET /api/profile/address
```
**Response:**
```json
{
  "ok": true,
  "data": {
    "line1": "71-75 Shelton Street",
    "line2": "Covent Garden", 
    "city": "London",
    "postcode": "WC2H 9JQ",
    "country": "United Kingdom",
    "address_id": "addr_123"
  }
}
```

### 2. Generate Proof of Address Certificate
```http
POST /api/certificates/generate
```
**Response:**
```json
{
  "ok": true,
  "data": {
    "certificate_id": "cert_456",
    "download_url": "https://vah-api-staging.onrender.com/api/certificates/cert_456/download",
    "expires_at": "2024-11-01T00:00:00Z"
  }
}
```

### 3. Download Certificate
```http
GET /api/certificates/{certificate_id}/download
```
**Response:** PDF file download

---

## **Mail Viewing APIs**

### 4. Get Mail Items List
```http
GET /api/mail-items?page=1&limit=20&status=all&category=all
```
**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `status` - Filter by status: `all`, `unread`, `read`, `forwarded`
- `category` - Filter by category: `all`, `HMRC`, `Companies House`, `Bank`, `Commercial`, `Other`

**Response:**
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "mail_123",
        "sender": "HM Revenue & Customs",
        "description": "Self Assessment Tax Return 2024",
        "received_at": "2024-10-01T10:30:00Z",
        "category": "HMRC",
        "status": "unread",
        "has_scan": true,
        "scan_url": "https://vah-api-staging.onrender.com/api/scans/mail_123.jpg",
        "is_government": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

### 5. Get Single Mail Item Details
```http
GET /api/mail-items/{mail_id}
```
**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "mail_123",
    "sender": "HM Revenue & Customs",
    "description": "Self Assessment Tax Return 2024",
    "received_at": "2024-10-01T10:30:00Z",
    "category": "HMRC",
    "status": "unread",
    "has_scan": true,
    "scan_url": "https://vah-api-staging.onrender.com/api/scans/mail_123.jpg",
    "is_government": true,
    "scan_preview_url": "https://vah-api-staging.onrender.com/api/scans/mail_123_preview.jpg",
    "forwarding_eligible": true
  }
}
```

### 6. Mark Mail as Read
```http
POST /api/mail-items/{mail_id}/mark-read
```
**Response:**
```json
{
  "ok": true,
  "message": "Mail marked as read"
}
```

---

## **Mail Actions APIs**

### 7. Download Single Mail Scan
```http
GET /api/mail-items/{mail_id}/download
```
**Response:** PDF file download

### 8. Download Multiple Mail Scans
```http
POST /api/mail-items/bulk-download
```
**Request Body:**
```json
{
  "mail_ids": ["mail_123", "mail_456", "mail_789"]
}
```
**Response:**
```json
{
  "ok": true,
  "data": {
    "download_url": "https://vah-api-staging.onrender.com/api/downloads/bulk_abc123.zip",
    "expires_at": "2024-10-02T10:30:00Z",
    "file_count": 3
  }
}
```

### 9. Request Single Mail Forwarding
```http
POST /api/forwarding-requests
```
**Request Body:**
```json
{
  "mail_id": "mail_123",
  "destination_address": {
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "city": "Manchester",
    "postcode": "M1 1AA",
    "country": "United Kingdom"
  },
  "notes": "Please forward urgently"
}
```
**Response:**
```json
{
  "ok": true,
  "data": {
    "request_id": "fwd_789",
    "status": "pending",
    "estimated_cost": 0.00,
    "is_free": true
  }
}
```

### 10. Request Multiple Mail Forwarding
```http
POST /api/forwarding-requests/bulk
```
**Request Body:**
```json
{
  "mail_ids": ["mail_123", "mail_456", "mail_789"],
  "destination_address": {
    "line1": "123 Main Street",
    "line2": "Apt 4B", 
    "city": "Manchester",
    "postcode": "M1 1AA",
    "country": "United Kingdom"
  },
  "shipment_type": "single",
  "notes": "Forward all together"
}
```
**Response:**
```json
{
  "ok": true,
  "data": {
    "request_id": "fwd_bulk_456",
    "status": "pending",
    "estimated_cost": 0.00,
    "is_free": true,
    "item_count": 3
  }
}
```

### 11. Get Forwarding Request Status
```http
GET /api/forwarding-requests/{request_id}
```
**Response:**
```json
{
  "ok": true,
  "data": {
    "request_id": "fwd_789",
    "status": "processing",
    "created_at": "2024-10-01T10:30:00Z",
    "estimated_delivery": "2024-10-03T00:00:00Z",
    "tracking_number": "RM123456789GB",
    "cost": 0.00
  }
}
```

---

## **Additional Utility APIs**

### 12. Get User Profile (for name display)
```http
GET /api/profile
```
**Response:**
```json
{
  "ok": true,
  "data": {
    "user_id": "user_123",
    "first_name": "John",
    "last_name": "Smith",
    "email": "john@example.com",
    "virtual_address": {
      "line1": "71-75 Shelton Street",
      "line2": "Covent Garden",
      "city": "London", 
      "postcode": "WC2H 9JQ",
      "country": "United Kingdom"
    }
  }
}
```

---

## **API Summary**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/profile/address` | GET | Get user's virtual address |
| `/api/certificates/generate` | POST | Generate proof of address certificate |
| `/api/certificates/{id}/download` | GET | Download certificate PDF |
| `/api/mail-items` | GET | List mail items with filters |
| `/api/mail-items/{id}` | GET | Get single mail item details |
| `/api/mail-items/{id}/mark-read` | POST | Mark mail as read |
| `/api/mail-items/{id}/download` | GET | Download single mail scan |
| `/api/mail-items/bulk-download` | POST | Download multiple mail scans |
| `/api/forwarding-requests` | POST | Request single mail forwarding |
| `/api/forwarding-requests/bulk` | POST | Request multiple mail forwarding |
| `/api/forwarding-requests/{id}` | GET | Get forwarding request status |
| `/api/profile` | GET | Get user profile information |
