# Vercel Deployment Guide 🚀

## Why Vercel for Your Frontend?

**Perfect for Next.js:**
- ✅ Built specifically for Next.js applications
- ✅ Automatic deployments from Git
- ✅ Edge functions and serverless functions
- ✅ Global CDN for fast loading
- ✅ Preview deployments for every PR
- ✅ Zero-config deployment

## 🚀 Quick Deployment Steps

### 1. Prepare Your Repository

Make sure your frontend code is in a Git repository (GitHub, GitLab, or Bitbucket).

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with your Git provider
3. Click **"New Project"**
4. Import your repository
5. Vercel will auto-detect it's a Next.js project

### 3. Configure Environment Variables

In Vercel dashboard → Your Project → Settings → Environment Variables:

```bash
# For BFF pattern (recommended)
NEXT_PUBLIC_API_BASE=""

# For direct backend calls (if needed)
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.com

# Optional: Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id
```

### 4. Deploy!

Click **"Deploy"** - Vercel will:
- Install dependencies (`npm install`)
- Build your Next.js app (`npm run build`)
- Deploy to global CDN
- Give you a live URL

## 🔧 Vercel Configuration

### `vercel.json` (Optional)

Create this file in your project root for custom configuration:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

## 🌐 Domain Setup

### Custom Domain (Optional)

1. In Vercel dashboard → Your Project → Settings → Domains
2. Add your custom domain (e.g., `app.virtualaddresshub.co.uk`)
3. Update DNS records as instructed
4. SSL certificate automatically provisioned

### Subdomain Strategy

**Recommended setup:**
- `app.virtualaddresshub.co.uk` → Frontend (Vercel)
- `api.virtualaddresshub.co.uk` → Backend (Render)
- `virtualaddresshub.co.uk` → Marketing site

## 🔗 Frontend-Backend Integration

### Option 1: BFF Pattern (Recommended)

Your frontend calls `/api/bff/*` routes which proxy to your backend:

```typescript
// This works automatically with Vercel
const response = await fetch('/api/bff/mail');
```

**Benefits:**
- No CORS issues
- Single origin
- Automatic session handling
- CSRF protection

### Option 2: Direct Backend Calls

Set environment variable:
```bash
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.com
```

Then your API calls go directly to backend:
```typescript
const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const response = await fetch(`${base}/api/mail`);
```

## 📱 UserDashboard Integration

Your `UserDashboard.tsx` component will work perfectly on Vercel:

### API Integration Points

```typescript
// These hooks will work with your backend APIs
const { data: mailItems } = useMailItems();           // GET /api/bff/mail
const { data: profile } = useProfile();              // GET /api/bff/profile
const { data: subscription } = useSubscription();   // GET /api/bff/billing
const { data: supportTickets } = useSupportTickets(); // GET /api/bff/support/tickets
```

### Features That Work Out of the Box

- ✅ **Mail Management** - View, download, forward mail
- ✅ **Billing Dashboard** - Subscription status, invoices
- ✅ **KYC Verification** - Identity verification flow
- ✅ **Support Tickets** - Create and manage tickets
- ✅ **Settings** - Profile, forwarding address, preferences
- ✅ **Certificates** - Download proof of address
- ✅ **GDPR Export** - Data export functionality

## 🔄 Deployment Workflow

### Automatic Deployments

1. **Push to main branch** → Production deployment
2. **Create PR** → Preview deployment
3. **Merge PR** → Automatic production update

### Manual Deployments

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from local
vercel

# Deploy to production
vercel --prod
```

## 📊 Performance & Monitoring

### Vercel Analytics

Enable in your project settings:
- Page views and performance metrics
- Real user monitoring
- Core Web Vitals tracking

### Performance Optimizations

Vercel automatically provides:
- ✅ **Image Optimization** - Next.js Image component
- ✅ **Code Splitting** - Automatic route-based splitting
- ✅ **Edge Caching** - Global CDN
- ✅ **Serverless Functions** - API routes scale automatically

## 🛡️ Security

### Environment Variables

- Never commit sensitive data to Git
- Use Vercel's environment variable system
- Different values for Preview vs Production

### CORS Configuration

If using direct backend calls, ensure your backend allows Vercel domains:
```javascript
// In your backend CORS config
const allowedOrigins = [
  'https://your-app.vercel.app',
  'https://app.virtualaddresshub.co.uk'
];
```

## 🚨 Troubleshooting

### Common Issues

**Build Failures:**
- Check `package.json` scripts
- Ensure all dependencies are in `dependencies` (not `devDependencies`)
- Check for TypeScript errors

**API Connection Issues:**
- Verify environment variables are set
- Check CORS configuration on backend
- Test API endpoints directly

**Performance Issues:**
- Enable Vercel Analytics
- Check Core Web Vitals
- Optimize images and bundle size

## 🎯 Next Steps After Deployment

1. **Test all functionality** - Mail, billing, KYC, etc.
2. **Set up monitoring** - Vercel Analytics + error tracking
3. **Configure custom domain** - Point your domain to Vercel
4. **Set up staging environment** - Use Vercel preview deployments
5. **Monitor performance** - Use Vercel's built-in metrics

## 📈 Scaling Considerations

**Vercel handles:**
- ✅ Automatic scaling
- ✅ Global CDN
- ✅ Serverless functions
- ✅ Edge computing
- ✅ Zero-downtime deployments

**Your backend (Render) handles:**
- ✅ Database connections
- ✅ Email services (Postmark)
- ✅ File storage
- ✅ Background jobs

This separation gives you the best of both worlds - fast frontend delivery and robust backend services!

---

**Ready to deploy?** Just connect your Git repository to Vercel and you'll have your UserDashboard live in minutes! 🚀
