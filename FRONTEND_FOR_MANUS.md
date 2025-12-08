# Frontend Codebase for UI Fixes

## 📦 Quick Start

### Prerequisites
- Node.js 20.x
- npm >= 9.0.0

### Setup
```bash
cd apps/frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

---

## 🏗️ Project Structure

### Key Directories

```
apps/frontend/
├── app/                    # Next.js 14 App Router pages
│   ├── (admin)/           # Admin routes
│   ├── (dashboard)/       # User dashboard routes
│   ├── (marketing)/       # Public marketing pages
│   ├── admin/             # Admin panel pages
│   ├── api/               # API routes (BFF layer)
│   └── components/        # Shared components
├── components/             # React components
│   ├── admin/             # Admin-specific components
│   ├── ui/                # UI primitives (shadcn/ui)
│   ├── dashboard/         # Dashboard components
│   └── ...                # Other components
├── lib/                   # Utilities and helpers
│   ├── apiClient.ts       # API client (deprecated, use http.ts)
│   ├── http.ts            # Modern API client (use this)
│   ├── useAuthedSWR.ts    # SWR hook with auth
│   └── ...                # Other utilities
├── contexts/              # React contexts
│   ├── AuthContext.tsx    # Authentication context
│   └── ...
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── public/                # Static assets
```

---

## 🎨 UI Components Library

The project uses **shadcn/ui** components located in `components/ui/`:

- `Button` - Button component
- `Card` - Card container
- `Input` - Input fields
- `Select` - Dropdown selects
- `Table` - Data tables
- `Dialog` - Modal dialogs
- `Toast` - Toast notifications
- `Badge` - Status badges
- `Tabs` - Tab navigation
- And more...

All components use **Tailwind CSS** for styling.

---

## 🔧 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI + shadcn/ui
- **State Management:** SWR for data fetching
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React
- **TypeScript:** Full TypeScript support

---

## 📝 Key Files for UI Work

### Main Layout
- `app/layout.tsx` - Root layout with providers
- `components/layout/` - Layout components

### Admin Panel
- `app/admin/dashboard/page.tsx` - Admin dashboard
- `components/admin/` - Admin components
  - `BlogSection.tsx` - Blog management (recently fixed)
  - `MailSection.tsx` - Mail management
  - `ForwardingSection.tsx` - Forwarding management
  - `BillingSection.tsx` - Billing management
  - `UserSection.tsx` - User management

### User Dashboard
- `app/dashboard/page.tsx` - User dashboard
- `components/UserDashboard.tsx` - Main dashboard component
- `components/MailManagement.tsx` - Mail management for users

### Public Pages
- `app/page.tsx` - Homepage
- `components/HomePage.tsx` - Homepage component
- `app/(marketing)/blog/` - Blog pages
- `components/BlogPage.tsx` - Blog listing
- `components/BlogPostPage.tsx` - Individual blog post

### Navigation
- `components/Navigation.tsx` - Main navigation
- `components/nav/` - Navigation components

---

## 🎯 Common UI Patterns

### API Calls
```typescript
// Modern way (recommended)
import api from '@/lib/http';
const { data, error } = await api.get('/api/some-endpoint');

// With SWR (for reactive data)
import { useAuthedSWR } from '@/lib/useAuthedSWR';
const { data, error, mutate } = useAuthedSWR('/api/some-endpoint');
```

### Forms
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

### Styling
- Use Tailwind CSS classes
- Components in `components/ui/` are styled with Tailwind
- Global styles in `app/globals.css`

---

## 🐛 Known Issues Fixed

### ✅ Blog Management JSON Parsing
- **Fixed:** `BlogSection.tsx` now checks content-type before parsing JSON
- **Location:** `components/admin/BlogSection.tsx`
- **Issue:** Was getting "Unexpected token 'p'" errors when backend returned plain text

---

## 🔑 Environment Variables

Create `.env.local` in `apps/frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
BACKEND_API_ORIGIN=http://localhost:3001/api
NEXT_PUBLIC_REVALIDATE_SECRET=your-secret
```

---

## 📦 Dependencies

Key dependencies:
- `next` - Next.js framework
- `react` / `react-dom` - React library
- `tailwindcss` - CSS framework
- `@radix-ui/*` - UI primitives
- `lucide-react` - Icons
- `swr` - Data fetching
- `react-hook-form` - Form handling
- `zod` - Validation
- `axios` - HTTP client

---

## 🚀 Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

---

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: sm, md, lg, xl, 2xl
- Components should be responsive
- Test on mobile devices

---

## 🎨 Design System

### Colors
- Primary colors defined in `tailwind.config.js`
- Use semantic color names (e.g., `bg-primary`, `text-secondary`)

### Typography
- Font families configured in Tailwind config
- Use Tailwind typography classes

### Spacing
- Use Tailwind spacing scale (4px increments)
- Common: `p-4`, `m-4`, `gap-4`, etc.

---

## 🔍 Debugging

### Console Logs
- Check browser console for errors
- API calls log to console in dev mode

### Network Tab
- Check Network tab for API requests
- Look for failed requests (red status)

### React DevTools
- Install React DevTools extension
- Inspect component state and props

---

## 📚 Additional Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **shadcn/ui:** https://ui.shadcn.com
- **Radix UI:** https://www.radix-ui.com

---

## 🎯 UI Fix Priorities

1. **Responsive Design** - Ensure all pages work on mobile
2. **Accessibility** - Add proper ARIA labels and keyboard navigation
3. **Loading States** - Add loading spinners/skeletons
4. **Error Handling** - Better error messages and UI feedback
5. **Form Validation** - Visual feedback for form errors
6. **Consistent Styling** - Ensure design system consistency

---

## 📞 Questions?

If you need help understanding any part of the codebase:
- Check component comments
- Look at similar components for patterns
- Check the `lib/` directory for utilities

Good luck with the UI fixes! 🎨

