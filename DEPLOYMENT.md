# CBAHI Clinical Privileges - Deployment Guide

This guide covers deploying the CBAHI Clinical Privileges Management System to Railway with PostgreSQL.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Railway Setup](#railway-setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment Steps](#deployment-steps)
- [Post-Deployment Verification](#post-deployment-verification)
- [Local Development with Docker](#local-development-with-docker)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a Git repository
3. **Google Cloud Project** (for OAuth and Drive integration):
   - OAuth 2.0 credentials configured
   - Service account for Drive API access
   - Required APIs enabled (Drive, Docs)
4. **SMTP Credentials** or **Microsoft Graph API** for email notifications
5. **Jisr HR API** credentials (if using HR sync)

---

## Railway Setup

### 1. Create a New Project

1. Log in to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account and select the CBAHI repository

### 2. Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** > **"Add PostgreSQL"**
3. Railway will automatically provision a PostgreSQL instance
4. The `DATABASE_URL` will be automatically available to your app

### 3. Configure Build Settings

Railway will automatically detect the `railway.json` configuration, which specifies:
- Dockerfile-based build
- Health check endpoint at `/api/health`
- Start command with database migrations

---

## Environment Variables

Configure these environment variables in Railway's **Variables** tab:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-provided by Railway |
| `NEXTAUTH_URL` | Your Railway deployment URL | `https://your-app.railway.app` |
| `NEXTAUTH_SECRET` | Secret for session encryption | Generate with `openssl rand -base64 32` |

### Google Integration

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID from Google Console |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Full service account JSON (base64 encoded) |
| `GOOGLE_DRIVE_FOLDER_ID` | Root folder ID for document storage |

### Email Configuration

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (usually 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `EMAIL_FROM` | Sender email address |

### Jisr HR Integration (Optional)

| Variable | Description |
|----------|-------------|
| `JISR_API_URL` | Jisr API base URL |
| `JISR_API_KEY` | Your Jisr API key |
| `JISR_SLUG` | Company slug in Jisr |
| `JISR_ACCESS_TOKEN` | Jisr access token |

### Application Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `APP_BASE_URL` | Application base URL | Same as `NEXTAUTH_URL` |
| `SUPPORT_EMAIL` | Support contact email | - |
| `LOG_LEVEL` | Logging level | `info` |

---

## Database Setup

### Automatic Migrations

The application automatically runs Prisma migrations on startup via the `start:prod` script:

```bash
prisma migrate deploy && node server.js
```

### Manual Database Operations

If needed, you can connect to the Railway database using the Railway CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link your project
railway link

# Run database commands
railway run npx prisma migrate deploy
railway run npx prisma db seed
railway run npx prisma studio
```

### Initial Data Seeding

After the first deployment, seed initial data:

```bash
railway run npm run db:seed
```

---

## Deployment Steps

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Configure production deployment"
git push origin main
```

### Step 2: Configure Railway Variables

1. Go to your Railway project
2. Click on your service
3. Navigate to **Variables**
4. Add all required environment variables (see above)
5. Click **"Redeploy"** after adding variables

### Step 3: Verify Build

1. Check the **Deployments** tab for build logs
2. Ensure the build completes successfully
3. Check that migrations run without errors

### Step 4: Configure Domain (Optional)

1. Go to **Settings** > **Networking**
2. Click **"Generate Domain"** for a `.railway.app` subdomain
3. Or click **"Add Custom Domain"** for your own domain

---

## Post-Deployment Verification

### 1. Health Check

Verify the application is running:

```bash
curl https://your-app.railway.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.456,
  "checks": {
    "database": {
      "status": "up",
      "latency": 5
    }
  }
}
```

### 2. Authentication Test

1. Navigate to your deployment URL
2. Click "Sign In"
3. Verify Google OAuth redirect works
4. Check that user is created in database

### 3. Database Verification

```bash
# Connect to Railway shell
railway run npx prisma studio

# Or check via CLI
railway run npx prisma db execute --sql "SELECT COUNT(*) FROM users;"
```

### 4. Email Test (if configured)

1. Trigger a test notification
2. Check email delivery
3. Verify email templates render correctly

---

## Local Development with Docker

### Prerequisites

- Docker Desktop installed
- Docker Compose available

### Quick Start

1. Copy environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your development credentials

3. Start services:
   ```bash
   npm run docker:dev
   ```

4. Access the application at `http://localhost:3000`

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run docker:dev` | Start all services |
| `npm run docker:dev:build` | Rebuild and start |
| `npm run docker:down` | Stop all services |

### Accessing the Database

- **Host**: localhost
- **Port**: 5432
- **User**: cbahi_user
- **Password**: cbahi_password
- **Database**: cbahi_db

Or use Adminer at `http://localhost:8080`:
```bash
docker-compose --profile tools up
```

---

## Troubleshooting

### Build Failures

**Prisma client not generated:**
```bash
# The postinstall script should handle this, but if not:
railway run npx prisma generate
```

**Memory issues during build:**
- Increase Railway's build resources in settings
- Or use `npm ci --maxsockets 1` to reduce parallelism

### Database Connection Issues

**Cannot connect to database:**
1. Verify `DATABASE_URL` is set correctly
2. Check if PostgreSQL addon is running
3. Ensure the database isn't sleeping (free tier limitation)

**Migration failures:**
```bash
# Reset and re-apply migrations (CAUTION: data loss)
railway run npx prisma migrate reset --force
```

### Authentication Issues

**OAuth redirect mismatch:**
1. Verify `NEXTAUTH_URL` matches your Railway domain exactly
2. Update Google Console redirect URIs to include Railway domain
3. Clear browser cookies and try again

**Session not persisting:**
1. Verify `NEXTAUTH_SECRET` is set
2. Ensure the secret is the same across all instances

### Health Check Failures

**Deployment keeps restarting:**
1. Check deployment logs for errors
2. Increase health check timeout in `railway.json`
3. Verify database connection is working

---

## Monitoring and Logs

### View Logs

```bash
# Via Railway CLI
railway logs

# Or in the Railway Dashboard
# Go to Deployments > Select deployment > Logs
```

### Set Up Alerts

1. Go to Railway project settings
2. Configure deployment notifications
3. Optionally integrate with Slack or Discord

---

## Security Checklist

Before going to production, ensure:

- [ ] `NEXTAUTH_SECRET` is a strong, unique secret
- [ ] All API keys are production credentials (not test)
- [ ] Database has proper access controls
- [ ] HTTPS is enforced (Railway handles this automatically)
- [ ] Sensitive environment variables are not exposed
- [ ] Google OAuth redirect URIs are restricted to your domain
- [ ] Email sending is configured with proper SPF/DKIM

---

## Support

For deployment issues:
1. Check Railway documentation: https://docs.railway.app
2. Join Railway Discord: https://discord.gg/railway
3. Contact CBAHI support: support@cbahi.gov.sa
