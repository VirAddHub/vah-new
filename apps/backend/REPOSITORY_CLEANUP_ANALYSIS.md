# 🧹 REPOSITORY CLEANUP ANALYSIS

## 📁 **ROOT DIRECTORY FILES** (Need Review)

### 🔴 **CLEANUP CANDIDATES** (Likely Safe to Delete)
```
-Force/                          # Empty directory, likely leftover
_archive/                        # Archive folder - review contents
app.db                          # SQLite database (if using Postgres)
app.db-shm                      # SQLite WAL file
app.db-wal                      # SQLite WAL file
backend-cookie.txt              # Test cookies
backend-cookies.txt             # Test cookies
backend-csrf.txt               # Test CSRF tokens
backend-verification.http      # Test HTTP files
backend.pid                    # Process ID file
bff-cookie.txt                 # Test cookies
bff-cookies.txt                # Test cookies
bff-csrf.txt                   # Test CSRF tokens
cookie.txt                     # Test cookies
cookies.txt                    # Test cookies
csrf-token.txt                 # Test CSRF tokens
csrf.txt                       # Test CSRF tokens
debug-session.sql              # Debug SQL file
login.json                     # Test login data
test-cookies.txt               # Test cookies
test-login.json                # Test login data
vah_corrupted.db               # Corrupted database
vah.cookies                    # Test cookies
vah.db.backup                  # Database backup
vah.service                    # Service file
web.log                        # Log file (1.2MB!)
web.pid                        # Process ID file
```

### 🟡 **REVIEW NEEDED** (Check if Still Needed)
```
backups/                       # Database backups
data/                          # Data directory
logs/                          # Log files
test-results/                  # Test results
var/                           # Variable data
```

### 🟢 **KEEP** (Important Files)
```
.env*                          # Environment files
.gitignore                     # Git ignore rules
package.json                   # Dependencies
package-lock.json              # Lock file
tsconfig*.json                 # TypeScript configs
next.config.js                 # Next.js config
tailwind.config.js             # Tailwind config
render.yaml                    # Render deployment config
ecosystem.config.js            # PM2 config
```

## 📁 **MAJOR DIRECTORIES**

### **app/** (Next.js App Router)
```
app/
├── (auth)/                    # Auth routes
├── (marketing)/               # Marketing pages
├── about/                     # About page
├── actions/                   # Server actions
├── admin/                     # Admin pages
├── api/                       # API routes
├── billing/                   # Billing pages
├── blog/                      # Blog pages
├── components/                # App components
├── dashboard/                 # Dashboard pages
├── debug/                     # Debug pages
├── files/                     # File management
├── forwarding/                # Mail forwarding
├── help/                      # Help pages
├── hooks/                     # React hooks
├── how-it-works/              # How it works page
├── kyc/                       # KYC pages
├── lib/                       # Utility libraries
├── mail/                      # Mail pages
├── page.tsx                   # Home page
├── pricing/                   # Pricing pages
├── profile/                   # Profile pages
├── reset-password/            # Password reset
├── settings/                  # Settings pages
└── support/                   # Support pages
```

### **components/** (Shared Components)
```
components/
├── admin/                     # Admin components
├── auth/                      # Auth components
├── billing/                   # Billing components
├── dashboard/                 # Dashboard components
├── layout/                    # Layout components
├── ui/                        # UI components
└── [various component files]
```

### **server/** (Backend Server)
```
server/
├── [37 files]                 # Server implementation
└── [mix of .js and .ts files]
```

### **scripts/** (Utility Scripts)
```
scripts/
├── [45 files]                 # Various utility scripts
├── [mix of .cjs, .sql, .sh files]
└── [includes migration, setup, test scripts]
```

### **lib/** (Libraries)
```
lib/
├── [4 files]                  # Core libraries
├── [mix of .ts and .md files]
└── [includes auth, db, mailer, etc.]
```

### **tests/** (Test Files)
```
tests/
├── [17 files]                 # Test files
├── [mix of .js and .ts files]
└── [includes unit and integration tests]
```

## 🗑️ **IMMEDIATE CLEANUP RECOMMENDATIONS**

### **1. Delete Test/Development Files**
```bash
# Test cookies and CSRF tokens
rm -f *.cookies.txt *.cookie.txt *.csrf.txt csrf-token.txt

# Test HTTP files
rm -f *-test.http *-verification.http *-bff.http

# Process ID files
rm -f *.pid

# Test JSON files
rm -f test-login.json login.json

# Debug files
rm -f debug-session.sql
```

### **2. Clean Up Database Files**
```bash
# If using Postgres, remove SQLite files
rm -f app.db app.db-shm app.db-wal
rm -f vah_corrupted.db vah.db.backup

# Keep only if needed for development
# data/ directory
```

### **3. Clean Up Log Files**
```bash
# Large log files
rm -f web.log

# Or move to logs/ directory
mkdir -p logs
mv web.log logs/
```

### **4. Review Archive and Backup Directories**
```bash
# Review contents first
ls -la _archive/
ls -la backups/
ls -la test-results/

# Delete if not needed
rm -rf _archive/  # if empty or outdated
```

## 📊 **SIZE ANALYSIS**

### **Largest Files/Directories:**
- `web.log` - 1.2MB (log file)
- `node_modules/` - Large (dependencies)
- `dist/` - Large (build output)
- `package-lock.json` - 630KB
- `vah_corrupted.db` - 139KB
- `app.db` - 40KB

### **File Count by Type:**
- `.js/.ts` files: ~100+ (source code)
- `.json` files: ~20+ (config files)
- `.txt` files: ~15+ (mostly test files)
- `.sql` files: ~10+ (database scripts)
- `.http` files: ~8+ (test files)

## 🎯 **CLEANUP PRIORITY**

### **HIGH PRIORITY** (Delete Immediately)
1. All `*.cookies.txt`, `*.csrf.txt` files
2. All `*-test.http`, `*-verification.http` files
3. `web.log` (1.2MB log file)
4. `*.pid` files
5. `debug-session.sql`

### **MEDIUM PRIORITY** (Review and Delete)
1. `_archive/` directory
2. `backups/` directory (if not needed)
3. `test-results/` directory
4. SQLite database files (if using Postgres)

### **LOW PRIORITY** (Keep for now)
1. `data/` directory
2. `logs/` directory
3. Configuration files
4. Source code directories

## 🚀 **QUICK CLEANUP COMMANDS**

```bash
# Quick cleanup (run these one by one)
rm -f *.cookies.txt *.cookie.txt *.csrf.txt csrf-token.txt
rm -f *-test.http *-verification.http *-bff.http
rm -f *.pid
rm -f test-login.json login.json debug-session.sql
rm -f web.log

# Review before deleting
ls -la _archive/
ls -la backups/
ls -la test-results/
```

This should significantly reduce your repository size and clean up test/development artifacts!
