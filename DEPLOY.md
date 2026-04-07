# Deployment Guide - Mi App Personal

A complete guide for deploying the Personal App to production using Supabase and Vercel.

## Prerequisites

- Node.js 20+ (check with `node --version`)
- npm or yarn package manager
- A GitHub account for version control
- A Vercel account for hosting
- A Supabase account for the database

## Part 1: Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project" or navigate to your organization
3. Fill in the project details:
   - **Name**: Choose a descriptive name (e.g., "personal-app-prod")
   - **Database Password**: Use a strong password and save it somewhere secure
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Start with free tier (upgrade later if needed)
4. Click "Create new project" and wait for provisioning (5-10 minutes)

### Step 2: Get Your Database Connection String

1. In the Supabase dashboard, go to **Project Settings** (gear icon, bottom left)
2. Click on the **Database** tab
3. Under "Connection string", select **URI**
4. Copy the connection string (it looks like `postgresql://user:password@host:5432/database`)
5. **Important**: Replace `[YOUR-PASSWORD]` with the database password you created in Step 1
6. Save this as your `DATABASE_URL` environment variable

Example:
```
postgresql://postgres:your_secure_password@db.abc123def456.supabase.co:5432/postgres
```

### Step 3: Get the Service Role Key

The Service Role Key is used by the server to access Supabase Storage with elevated permissions.

1. Go to **Project Settings** > **API** tab
2. You should see several keys listed:
   - "Project URL" - copy this as `NEXT_PUBLIC_SUPABASE_URL`
   - "Service Role Secret" - copy this as `SUPABASE_SERVICE_ROLE_KEY`
3. **IMPORTANT**: Never share or commit the Service Role Secret to version control!

### Step 4: Create Storage Buckets

Supabase Storage is used to store ebook files and cover images.

1. In the dashboard, go to **Storage** (in the left sidebar)
2. Click **Create a new bucket** for ebooks:
   - **Name**: `ebooks`
   - **Privacy**: Private (authenticated users only)
   - Click **Create bucket**

3. Click **Create a new bucket** for covers:
   - **Name**: `covers`
   - **Privacy**: Private
   - Click **Create bucket**

4. Set up storage policies (optional but recommended):
   - For each bucket, click on **Policies**
   - Add a policy to allow authenticated users to read/write files:
     - For ebooks: Allow authenticated users to read and write their own files
     - For covers: Allow authenticated users to read and write their own files
   - Use the Supabase policy editor or SQL directly

### Step 5: Run Database Migrations

Before deploying to production, run migrations locally to set up the database schema.

```bash
# Install dependencies
npm install

# Run migrations using Drizzle Kit
npm run db:push
```

This will:
- Connect to your Supabase database using DATABASE_URL
- Create all tables defined in `src/lib/db/schema/*`
- Set up indexes and relationships
- Apply any pending migrations

If successful, you should see the tables appear in your Supabase dashboard under **SQL Editor** > **Tables**.

## Part 2: Local Development Setup

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd personal-app

# Install dependencies
npm install
```

### Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update the following variables in `.env.local`:
   ```
   # Database
   DATABASE_URL=postgresql://...  (from Supabase)

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # Auth - WebAuthn
   NEXT_PUBLIC_WEBAUTHN_RP_ID=localhost
   NEXT_PUBLIC_WEBAUTHN_RP_NAME=Personal App
   NEXT_PUBLIC_WEBAUTHN_ORIGIN=http://localhost:3000

   # Auth - JWT
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long

   # AI Provider (choose one)
   ANTHROPIC_API_KEY=sk-ant-...  (preferred)
   # OR
   OPENAI_API_KEY=sk-...
   ```

3. For local development, you can keep these as defaults:
   ```
   SESSION_COOKIE_SECURE=false
   SESSION_COOKIE_SAME_SITE=lax
   SESSION_MAX_AGE=604800
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NODE_ENV=development
   ```

### Step 3: Run Locally

```bash
# Start the development server
npm run dev

# Open http://localhost:3000 in your browser
```

### Step 4: Test Authentication

1. Go to the login page (`http://localhost:3000/login`)
2. Click "Set up a new account"
3. Register a passkey (WebAuthn) - most modern browsers support this
4. Log in with your passkey
5. Or use PIN authentication as backup

## Part 3: GitHub Setup

### Step 1: Initialize Git (if not already done)

```bash
git init
git add .
git commit -m "Initial commit"
```

### Step 2: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository with the same name (e.g., "personal-app")
3. Follow GitHub's instructions to push your local code:
   ```bash
   git remote add origin https://github.com/your-username/personal-app.git
   git branch -M main
   git push -u origin main
   ```

## Part 4: Vercel Deployment

### Step 1: Connect Your Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Sign in with your GitHub account
3. Find and click "Import" on your "personal-app" repository
4. Vercel will auto-detect Next.js and show the preview

### Step 2: Configure Environment Variables

In the Vercel dashboard, before deploying:

1. Click **Environment Variables**
2. Add all variables from your `.env.local`:

   **Required for Production:**
   ```
   DATABASE_URL = postgresql://...
   NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   JWT_SECRET = your-super-secret-key-min-32-chars
   ANTHROPIC_API_KEY = sk-ant-... (or OPENAI_API_KEY)
   ```

   **WebAuthn Configuration (update for production):**
   ```
   NEXT_PUBLIC_WEBAUTHN_RP_ID = yourdomain.com
   NEXT_PUBLIC_WEBAUTHN_RP_NAME = Personal App
   NEXT_PUBLIC_WEBAUTHN_ORIGIN = https://yourapp.vercel.app
   ```

   **Session Configuration (for HTTPS):**
   ```
   SESSION_COOKIE_SECURE = true
   SESSION_COOKIE_SAME_SITE = lax
   SESSION_MAX_AGE = 604800
   NEXT_PUBLIC_APP_URL = https://yourapp.vercel.app
   NODE_ENV = production
   ```

3. Click **Deploy**

### Step 3: Monitor Deployment

1. Vercel will start building and deploying
2. Watch the build logs for any errors
3. Once complete, you'll get a production URL (e.g., `https://personal-app-abc123.vercel.app`)
4. Test the live app:
   - Visit the URL
   - Set up an account and test login
   - Upload an ebook to test storage

## Environment Variables Reference

### Database & Storage

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string from Supabase |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side key for storage access (keep secret!) |

### Authentication - WebAuthn

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_WEBAUTHN_RP_ID` | Yes | localhost | Domain where app is hosted (no https://) |
| `NEXT_PUBLIC_WEBAUTHN_RP_NAME` | No | Personal App | Friendly name shown during passkey registration |
| `NEXT_PUBLIC_WEBAUTHN_ORIGIN` | Yes | http://localhost:3000 | Full URL for verification (includes protocol) |

### Authentication - JWT & Sessions

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | Secret for JWT signing (min 32 chars, use `openssl rand -base64 32`) |
| `SESSION_COOKIE_SECURE` | No | false | Set to 'true' only if using HTTPS (production) |
| `SESSION_COOKIE_SAME_SITE` | No | lax | Cookie SameSite attribute: 'lax', 'strict', or 'none' |
| `SESSION_MAX_AGE` | No | 604800 | Session duration in seconds (604800 = 7 days) |

### AI Providers (choose at least one)

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | No | Anthropic Claude API key (preferred provider) |
| `OPENAI_API_KEY` | No | OpenAI API key (fallback provider) |

### Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_NAME` | No | Mi App Personal | App name shown in UI |
| `NEXT_PUBLIC_APP_URL` | No | http://localhost:3000 | App base URL (used for redirects/links) |
| `NODE_ENV` | No | development | Runtime environment ('development' or 'production') |

## Running Drizzle Migrations

### Push Schema Changes

Use this to apply your schema to the database:

```bash
npm run db:push
```

This command will:
- Connect to DATABASE_URL
- Detect schema changes in `src/lib/db/schema/*`
- Create/alter tables as needed
- Update the database without creating migration files

### Generate Migration Files (Advanced)

If you want to version-control migrations:

```bash
# Generate a migration based on schema changes
npx drizzle-kit generate:pg

# Then apply the migration
npm run db:migrate
```

## Production Checklist

Before going live with real users:

- [ ] Database URL is set and migrations have run
- [ ] Supabase storage buckets (ebooks, covers) are created
- [ ] Environment variables are set in Vercel
- [ ] WebAuthn RP_ID matches your production domain
- [ ] WebAuthn ORIGIN is set to your production URL
- [ ] SESSION_COOKIE_SECURE=true (for HTTPS)
- [ ] JWT_SECRET is a strong, randomly generated key
- [ ] API keys (Anthropic/OpenAI) are valid and have appropriate limits
- [ ] Database backups are enabled in Supabase
- [ ] You've tested login/signup with a real passkey
- [ ] You've tested file uploads (ebooks and covers)
- [ ] You've verified email/notifications work (if applicable)
- [ ] Monitor Vercel deployment logs for errors
- [ ] Set up error tracking (optional: Sentry, Datadog, etc.)

## Troubleshooting

### "Cannot find module" errors during deploy

**Solution**: Ensure `npm install` runs during the build. Vercel should do this automatically.

### Database connection errors

**Symptoms**: "Connection refused" or "timeout" on deployment

**Solutions**:
1. Verify DATABASE_URL is correct (has password for your Supabase project)
2. Check if Supabase project is still active/not paused
3. Verify Vercel can reach Supabase (check IP restrictions)

### WebAuthn registration fails

**Symptoms**: "Origin mismatch" or "RP ID mismatch"

**Solutions**:
1. Ensure NEXT_PUBLIC_WEBAUTHN_ORIGIN matches your deployed URL exactly (including protocol)
2. Ensure NEXT_PUBLIC_WEBAUTHN_RP_ID matches your domain (without protocol)
3. Re-register your passkey after updating these values

### Storage operations fail

**Symptoms**: "Forbidden" errors when uploading/downloading files

**Solutions**:
1. Verify SUPABASE_SERVICE_ROLE_KEY is correct
2. Check that storage buckets exist in Supabase
3. Verify storage policies allow authenticated access

## Next Steps

1. Set up a custom domain pointing to your Vercel app
2. Enable Vercel Analytics to monitor performance
3. Set up error tracking (Sentry, LogRocket, etc.)
4. Configure email notifications (SendGrid, PostMark, etc.)
5. Set up automated backups for Supabase
6. Implement rate limiting and DDOS protection

## Support

For issues:
- Check Vercel logs: Vercel Dashboard > Deployments > Build/Runtime logs
- Check Supabase logs: Supabase Dashboard > Logs
- Check browser console: Right-click > Inspect > Console tab
- Review Next.js docs: https://nextjs.org/docs
