# VirtualAddressHub - Production Frontend

**Professional Virtual Address Service Platform**

## 🚀 Production Deployment

This is the **FINAL PRODUCTION VERSION** of VirtualAddressHub. All demo references have been removed and the system is ready for live deployment.

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis (optional, for caching)
- SSL Certificate
- Domain: `virtualaddresshub.co.uk`

### Environment Setup

#### Production Setup

1. **Copy environment template:**
   ```bash
   cp env.production.example .env.production
   ```

2. **Configure production variables:**
   ```bash
   # Database
   DATABASE_URL=postgresql://username:password@dpg-d2vikgnfte5s73c5nv80-a.frankfurt-postgres.render.com:5432/virtualaddresshub_prod
   
   # Admin Access
   ADMIN_EMAIL=admin@virtualaddresshub.co.uk
   ADMIN_PASSWORD=YourSecureAdminPassword123!
   
   # Email Service (Postmark)
   POSTMARK_API_TOKEN=your-postmark-api-token
   POSTMARK_FROM_EMAIL=noreply@virtualaddresshub.co.uk
   
   # Payment Processing (Stripe)
   STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
   STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
   
   # KYC Service (Sumsub)
   SUMSUB_APP_TOKEN=your-sumsub-app-token
   SUMSUB_SECRET_KEY=your-sumsub-secret-key
   ```

#### Local Development Setup

1. **Create local environment file:**
   ```bash
   cp env.production.example .env.local
   ```

2. **Configure local development variables:**
   ```bash
   # Database (Local PostgreSQL)
   DATABASE_URL=postgresql://localhost:5432/vah_dev
   
   # Redis (Local Redis)
   REDIS_URL=redis://localhost:6379
   
   # Frontend Origin (for CORS)
   FRONTEND_ORIGIN=http://localhost:3000
   
   # Admin Access (Local)
   ADMIN_EMAIL=admin@localhost
   ADMIN_PASSWORD=admin123
   
   # Use test keys for all services
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

3. **Start local services:**
   ```bash
   # Start PostgreSQL and Redis locally
   # Then run the application
   npm run dev
   ```

### Database Setup

1. **Create PostgreSQL database:**
   ```sql
   CREATE DATABASE virtualaddresshub_prod;
   CREATE USER vah_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE virtualaddresshub_prod TO vah_user;
   ```

2. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

### Production Deployment

1. **Deploy using the production script:**
   ```bash
   ./scripts/deploy-production.sh
   ```

2. **Or deploy manually:**
   ```bash
   # Install dependencies
   npm ci
   
   # Build application
   npm run build
   
   # Start production server
   npm start
   ```

### Production URLs

- **Main Site:** https://virtualaddresshub.co.uk
- **Admin Panel:** https://virtualaddresshub.co.uk/admin/login
- **API Endpoints:** https://virtualaddresshub.co.uk/api/*
- **Health Check:** https://virtualaddresshub.co.uk/api/health

### Admin Access

**Default Admin Credentials:**
- Email: `admin@virtualaddresshub.co.uk`
- Password: `YourSecureAdminPassword123!`

**⚠️ IMPORTANT:** Change the default admin password immediately after deployment!

### Features

#### ✅ User Management
- Create real users with complete information
- Edit user details and settings
- Manage subscription plans
- KYC status management
- User suspension/activation

#### ✅ Mail Management
- Process incoming mail
- Tag and categorize mail items
- Forward mail with tracking
- Bulk mail operations

#### ✅ Forwarding Management
- Track forwarding requests
- Update delivery status
- Manage carrier integrations
- Priority-based processing

#### ✅ Billing & Revenue
- Real-time revenue metrics
- Transaction management
- Invoice processing
- Payment method updates

#### ✅ Analytics & Reporting
- Performance dashboards
- Custom report generation
- Data export capabilities
- Trend analysis

#### ✅ System Administration
- Complete system configuration
- Integration management
- Security settings
- Maintenance operations

### Security Features

- **Rate Limiting:** 5 attempts → 15-minute lockout
- **Password Security:** Strong password requirements
- **Audit Logging:** All actions logged with timestamps
- **Session Security:** Automatic cleanup on logout
- **Admin Validation:** Server-side admin role verification
- **Input Validation:** All fields validated frontend and backend
- **Email Uniqueness:** Prevents duplicate email addresses

### API Endpoints

#### User Management
- `POST /api/admin/users/create` - Create new users
- `PUT /api/admin/users/[id]` - Update existing users
- `GET /api/admin/users/[id]` - Get user details
- `DELETE /api/admin/users/[id]` - Soft delete users

#### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout
- `GET /api/auth/whoami` - Check auth status
- `POST /api/admin/password-reset` - Admin password resets

#### Mail Management
- `GET /api/admin/mail-items` - List mail items
- `POST /api/admin/mail-items` - Create mail item
- `PUT /api/admin/mail-items/[id]` - Update mail item
- `DELETE /api/admin/mail-items/[id]` - Delete mail item

#### Forwarding
- `GET /api/admin/forwarding-requests` - List forwarding requests
- `POST /api/admin/forwarding-requests` - Create forwarding request
- `PUT /api/admin/forwarding-requests/[id]` - Update forwarding request

### Monitoring

- **Health Checks:** `/api/health`
- **System Metrics:** `/api/admin/metrics`
- **Audit Logs:** Database table `audit_logs`
- **Error Tracking:** Sentry integration
- **Performance:** Google Analytics

### Backup & Recovery

- **Database Backups:** Daily automated backups
- **File Backups:** S3 bucket backups
- **Recovery Procedures:** Documented in `/docs/backup-recovery.md`

### Support

- **Email:** support@virtualaddresshub.co.uk
- **Phone:** +44 20 7123 4567
- **Hours:** Monday-Friday, 9AM-6PM GMT

### Compliance

- **GDPR:** Full compliance with data protection regulations
- **Data Retention:** 7-year retention policy
- **Audit Trail:** Complete action logging
- **Security:** Enterprise-grade security measures

---

**VirtualAddressHub** - Professional Virtual Address Services  
© 2024 VirtualAddressHub Ltd. All rights reserved.
# Trigger Render deployment
