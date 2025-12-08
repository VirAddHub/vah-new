# How to Run Blog Migrations in Render

## Quick Steps:

### Option 1: Render Dashboard SQL Editor (Easiest)

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Log in to your account

2. **Find Your Database**
   - Click on **"Databases"** in the left sidebar
   - Find and click on: **`vah_postgres_40zq`**

3. **Open SQL Editor**
   - In the database page, look for:
     - **"Connect"** button/tab, OR
     - **"SQL Editor"** button/tab, OR
     - **"Query"** or **"Run SQL"** option
   - Click it to open the SQL editor

4. **Paste and Run SQL**
   - Copy the entire SQL from `COMBINED_MIGRATION.sql`
   - Paste it into the SQL editor
   - Click **"Run"**, **"Execute"**, or **"Submit"** button

5. **Verify Success**
   - You should see a success message
   - Run this to verify:
     ```sql
     SELECT EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_name = 'blog_posts'
     );
     ```
   - Should return: `true`

---

### Option 2: Render CLI (If you have it set up)

1. **Open Terminal**
2. **Run:**
   ```bash
   render psql vah_postgres_40zq
   ```
3. **Paste the SQL** from `COMBINED_MIGRATION.sql`
4. **Press Enter** to execute
5. **Type `\q`** to exit

---

## What the SQL Does:

1. **Creates `blog_posts` table** - Stores all blog post data
2. **Creates indexes** - For fast lookups by slug, status, date
3. **Adds author columns** - `author_name`, `author_title`, `author_image`

---

## After Running:

- ✅ Blog errors will stop
- ✅ You can create/edit posts in admin dashboard
- ✅ Posts will persist across server restarts
- ✅ All blog functionality will work

---

## Troubleshooting:

**If you can't find SQL Editor:**
- Look for "Connect" → "External Connection" → "SQL Editor"
- Or use "Query" tab
- Some Render databases have it under "Info" → "Connect"

**If SQL fails:**
- Make sure you're connected to the correct database
- Check for typos in the SQL
- The `IF NOT EXISTS` clauses should prevent errors if run multiple times

