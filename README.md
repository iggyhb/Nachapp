# Mi App Personal - Personal App Phase 0

A complete Next.js 14+ personal web application scaffold with TypeScript strict mode, Supabase + Drizzle ORM, and Passkey/PIN authentication.

## Stack

- **Frontend**: Next.js 14+ (App Router), React 18, TypeScript (strict mode)
- **Styling**: Tailwind CSS 4.0, mobile-first design
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **Authentication**: Passkey (WebAuthn) + PIN with bcryptjs & Jose JWT
- **AI Integration**: Anthropic Claude + OpenAI with abstracted gateway
- **PWA**: Serwist for offline support
- **Deployment**: Vercel-ready
- **Icons**: Lucide React

## Project Structure

```
personal-app/
├── src/
│   ├── app/                        # Next.js app router
│   │   ├── (auth)/                # Auth routes group
│   │   │   ├── login/
│   │   │   └── setup/
│   │   ├── (core)/                # Authenticated routes group
│   │   │   ├── dashboard/
│   │   │   ├── settings/
│   │   │   └── admin/
│   │   ├── api/                   # API routes
│   │   │   ├── auth/
│   │   │   └── health/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── not-found.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/                # App shell, nav, header
│   │   ├── ui/                    # Reusable components
│   │   ├── auth/                  # Auth components
│   │   └── dashboard/
│   └── lib/
│       ├── db/                    # Database (schema, client, migrations)
│       ├── auth/                  # Auth utilities
│       ├── validation/            # Zod schemas
│       ├── ai/                    # AI gateway & providers
│       ├── services/              # Business logic
│       └── utils/                 # Helpers
├── public/
│   ├── manifest.json              # PWA manifest
│   └── offline.html               # Offline fallback
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
└── .env.example
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ (for async/await without flags)
- Supabase account (free tier available at https://supabase.com)
- Vercel account (optional, for deployment)
- Anthropic or OpenAI API keys (optional, for AI features)

### 2. Clone and Install

```bash
cd personal-app
npm install
```

### 3. Database Setup

#### Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Note your project URL and anon key
3. In Project Settings > Database, copy the connection string

#### Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
NEXT_PUBLIC_WEBAUTHN_RP_ID=localhost
NEXT_PUBLIC_WEBAUTHN_RP_NAME=Mi App Personal
NEXT_PUBLIC_WEBAUTHN_ORIGIN=http://localhost:3000
JWT_SECRET=your-secret-key-min-32-chars-long
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

#### Run Migrations

```bash
npm run db:push
```

Or with custom migrations:

```bash
npm run db:migrate
```

### 4. Development

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### 5. Build for Production

```bash
npm run build
npm start
```

## Features

### Authentication

- **Passkey (WebAuthn)**: Biometric or hardware security key authentication
- **PIN Backup**: 6-digit numeric PIN as fallback
- **JWT Sessions**: Secure, HttpOnly cookies with 7-day expiration
- **Lockout Protection**: Automatic account lockout after 5 failed PIN attempts

### Core Pages

- **Dashboard** (`/dashboard`): Widgets showing daily readings, progress, streaks
- **Settings** (`/settings`): Profile, security, modules, AI providers
- **Admin Panel** (`/admin`): Job monitoring, system status, usage analytics
- **Login** (`/login`): PIN pad + Passkey authentication
- **Setup** (`/setup`): Initial user creation with PIN + Passkey registration

### AI Integration

Abstracted AI gateway supporting:

- **Anthropic Claude** (claude-3-5-sonnet-20241022)
- **OpenAI GPT-4** (gpt-4-turbo)
- Cost tracking and token usage logging
- Tool support for both providers

Example usage:

```typescript
import { AIGateway } from '@/lib/ai/gateway';

const response = await AIGateway.generateResponse({
  task: 'summarize_reading',
  messages: [
    { role: 'user', content: 'Summarize this text...' }
  ],
  config: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
  }
});

console.log(`Cost: $${response.usage.cost}`);
```

### Mobile-First Design

- **Bottom navigation** for mobile, sidebar for desktop
- **Responsive grid layouts** that adapt to screen size
- **Safe area insets** for notched devices
- **PWA capabilities** with offline support

### Database Schema

#### Auth Tables

- `users`: User accounts with timezone, theme, locale
- `passkeys`: WebAuthn credentials with counter
- `pin_credentials`: Bcrypt-hashed PINs with lockout tracking
- `sessions`: JWT session tokens
- `audit_logs`: Security event logging

#### Core Tables

- `modules`: Feature flags with JSON config
- `job_runs`: Background job tracking
- `ingestion_events`: External data sync events
- `ai_usage_logs`: Cost tracking for AI requests

## Validation

All inputs are validated with Zod:

```typescript
import { loginPinSchema } from '@/lib/validation/auth';

const validated = loginPinSchema.parse({ pin });
// ZodError thrown if invalid
```

Available schemas:

- `loginPinSchema`: 6-digit PIN
- `setupSchema`: User creation (email, name, PIN)
- `registerPasskeySchema`: Passkey registration
- `paginationSchema`: Offset/limit validation
- `dateRangeSchema`: Date range validation

## Services

### Settings Service

```typescript
import { settingsService } from '@/lib/services/settings.service';

// Get user settings
const settings = await settingsService.getUserSettings(userId);

// Update settings
await settingsService.updateUserSettings(userId, {
  displayName: 'New Name',
  timezone: 'America/New_York',
});
```

### Jobs Service

```typescript
import { jobsService } from '@/lib/services/jobs.service';

// Create a job
const job = await jobsService.createJob('sync_readings');

// Update status
await jobsService.updateJobStatus(jobId, 'completed', null, {
  processed: 42,
});

// Get recent jobs
const recent = await jobsService.getRecentJobs();
```

## Date Utilities

Timezone-aware date handling:

```typescript
import {
  convertToTimezone,
  formatInTimezone,
  getStartOfDay,
  isValidTimezone,
} from '@/lib/utils/dates';

const date = new Date();
const tzDate = convertToTimezone(date, 'America/New_York');
const formatted = formatInTimezone(date, 'America/New_York', 'long');
const start = getStartOfDay('America/New_York');
```

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Environment variables are set in Vercel dashboard.

### Self-hosted

1. Set environment variables
2. Run `npm run build`
3. Run `npm start`
4. Ensure Node 18+ runtime
5. Configure reverse proxy (nginx, etc.)

## Security Considerations

- All passwords/sensitive data are hashed with bcryptjs (12 salt rounds)
- JWT tokens are signed with HS256
- Passkeys stored only as public keys (private keys stay on device)
- PIN lockout after 5 failed attempts (15 min cooldown)
- All API routes validate authentication
- CSRF protection via SameSite cookies
- Audit logging for security events

## Development Tips

### Enable Strict TypeScript

All files already use strict mode. The `tsconfig.json` enforces:

- `noImplicitAny`: All types must be explicit
- `strictNullChecks`: Null/undefined must be handled
- `noUnusedLocals` / `noUnusedParameters`: Clean code

### Testing

```bash
npm run test
npm run test:watch
```

Vitest is configured for unit tests.

### Database Introspection

```bash
drizzle-kit studio
```

Opens a visual database browser on localhost:4983.

## Contributing

1. All TypeScript - no `any` types
2. Snake_case for database columns
3. CamelCase for TypeScript variables
4. Validate all inputs with Zod
5. Server components by default
6. `'use client'` only when needed
7. Responsive (mobile-first) design

## License

MIT

## Support

For issues or questions:

1. Check `/api/health` for system status
2. Review audit logs in admin panel
3. Check browser console for errors
4. Review server logs in Vercel dashboard
