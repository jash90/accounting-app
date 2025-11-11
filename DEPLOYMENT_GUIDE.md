# Deployment Guide - Production Deployment

## Table of Contents

1. [Introduction](#introduction)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Environment Configuration](#environment-configuration)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Database Management](#database-management)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Monitoring & Logging](#monitoring--logging)
9. [Security Hardening](#security-hardening)
10. [Post-Deployment Verification](#post-deployment-verification)
11. [Rollback Procedures](#rollback-procedures)
12. [Troubleshooting](#troubleshooting)

---

## Introduction

This guide covers deploying the Accounting RBAC System to production, including:
- Backend API deployment
- Frontend application deployment
- Database setup and migrations
- CI/CD automation
- Monitoring and logging
- Security best practices

### Deployment Architecture

```
┌────────────────────────────────────────────┐
│              Load Balancer                  │
│         (SSL Termination, HTTPS)            │
└────────────┬───────────────────────────────┘
             │
        ┌────┴─────┐
        │          │
        ▼          ▼
┌──────────┐  ┌──────────┐
│ Frontend │  │ Backend  │
│  (CDN)   │  │   API    │
│  Static  │  │ (Node.js)│
└──────────┘  └────┬─────┘
                   │
              ┌────▼────┐
              │Database │
              │(Postgres│
              └─────────┘
```

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (`nx test api && nx test web`)
- [ ] No TypeScript errors (`nx build api && nx build web`)
- [ ] No linter warnings (`nx lint api && nx lint web`)
- [ ] Code reviewed and approved
- [ ] Security audit completed

### Configuration

- [ ] Production environment variables set
- [ ] Database connection string configured
- [ ] JWT secrets generated (strong, random)
- [ ] CORS origins whitelisted
- [ ] API rate limiting configured
- [ ] Logging level set to `warn` or `error`

### Database

- [ ] Migrations tested on staging
- [ ] Backup strategy in place
- [ ] Database connection pooling configured
- [ ] SSL/TLS enabled for database connection
- [ ] Seeder data prepared (initial admin, modules)

### Security

- [ ] HTTPS enforced
- [ ] Security headers configured (Helmet)
- [ ] Input validation enabled
- [ ] Rate limiting active
- [ ] Secrets not committed to repository
- [ ] Dependencies updated (no known vulnerabilities)

### Performance

- [ ] Bundle size analyzed (<500KB initial)
- [ ] Database queries optimized
- [ ] Caching strategy implemented
- [ ] CDN configured for static assets

---

## Environment Configuration

### Production Environment Variables

#### Backend (`apps/api/.env.production`)

```bash
# Server Configuration
NODE_ENV=production
PORT=8080
API_PREFIX=

# Database Configuration
DB_HOST=production-db.example.com
DB_PORT=5432
DB_USERNAME=app_user
DB_PASSWORD=<STRONG_GENERATED_PASSWORD>
DB_DATABASE=accounting_prod
DB_SSL=true
DB_POOL_SIZE=20
DB_POOL_TIMEOUT=30000

# JWT Configuration (MUST BE STRONG RANDOM STRINGS)
JWT_SECRET=<64_CHAR_RANDOM_STRING>
JWT_REFRESH_SECRET=<64_CHAR_DIFFERENT_RANDOM_STRING>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS Configuration
CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
CORS_CREDENTIALS=true

# Security
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json
LOG_FILE=logs/production.log

# Monitoring (optional)
SENTRY_DSN=https://...@sentry.io/...
NEW_RELIC_LICENSE_KEY=...
```

#### Frontend (`apps/web/.env.production`)

```bash
# API Configuration
VITE_API_BASE_URL=https://api.yourdomain.com

# Application
VITE_APP_NAME=Accounting RBAC
VITE_APP_VERSION=1.0.0

# Features
VITE_ENABLE_DEVTOOLS=false
VITE_ENABLE_QUERY_DEVTOOLS=false

# Monitoring (optional)
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Generating Strong Secrets

```bash
# Generate JWT secret (64 characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or use online generator (HTTPS only)
# https://www.random.org/strings/

# Store in secure location (1Password, AWS Secrets Manager, etc.)
```

---

## Backend Deployment

### Option 1: Heroku

#### Steps

```bash
# 1. Install Heroku CLI
brew install heroku/brew/heroku  # macOS
# Or: https://devcenter.heroku.com/articles/heroku-cli

# 2. Login
heroku login

# 3. Create app
heroku create accounting-api-prod

# 4. Add PostgreSQL addon
heroku addons:create heroku-postgresql:standard-0

# 5. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
heroku config:set JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
heroku config:set CORS_ORIGINS=https://your-frontend.com

# 6. Create Procfile
echo "web: node dist/apps/api/main.js" > Procfile

# 7. Deploy
git push heroku master

# 8. Run migrations
heroku run npm run migration:run

# 9. Seed database
heroku run npm run seed
```

---

### Option 2: AWS (Elastic Beanstalk)

#### Steps

```bash
# 1. Install EB CLI
pip install awsebcli

# 2. Initialize EB
eb init -p node.js-18 accounting-api

# 3. Create environment
eb create accounting-api-prod --database.engine postgres

# 4. Set environment variables
eb setenv NODE_ENV=production
eb setenv JWT_SECRET=<your_secret>
eb setenv CORS_ORIGINS=https://your-frontend.com

# 5. Deploy
eb deploy

# 6. SSH to instance and run migrations
eb ssh
cd /var/app/current
npm run migration:run
```

#### `.ebextensions/01_migrations.config`

```yaml
container_commands:
  01_migrate:
    command: "npm run migration:run"
    leader_only: true
```

---

### Option 3: DigitalOcean App Platform

#### Steps

```bash
# 1. Create app via dashboard
# - Connect GitHub repository
# - Select Node.js runtime
# - Set build command: npm run build api
# - Set run command: node dist/apps/api/main.js

# 2. Add PostgreSQL database
# - Create managed database
# - Link to app

# 3. Environment variables
# - Add all production env vars via dashboard

# 4. Deploy
# - Automatic on git push to main branch
```

---

### Option 4: Self-Hosted (PM2 + Nginx)

#### Server Setup

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install PM2
npm install -g pm2

# 3. Install Nginx
sudo apt-get install nginx

# 4. Clone repository
git clone https://github.com/your-org/accounting.git
cd accounting

# 5. Install dependencies
npm install

# 6. Build application
nx build api --configuration=production

# 7. Setup environment
cp apps/api/.env.example apps/api/.env.production
# Edit .env.production with production values

# 8. Run migrations
npm run migration:run

# 9. Start with PM2
pm2 start ecosystem.config.js

# 10. Save PM2 config
pm2 save
pm2 startup
```

#### PM2 Configuration

**File**: `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'accounting-api',
    script: './dist/apps/api/main.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
  }],
};
```

#### Nginx Configuration

**File**: `/etc/nginx/sites-available/accounting-api`

```nginx
upstream backend {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
}
```

**Enable site**:

```bash
sudo ln -s /etc/nginx/sites-available/accounting-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

**Why Vercel**: Zero-config, optimized for Vite/React, automatic HTTPS, CDN

#### Steps

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy from root directory
cd /Users/bartlomiejzimny/Projects/accounting
vercel

# Follow prompts:
# - Project: accounting-web
# - Directory: apps/web
# - Build command: nx build web --configuration=production
# - Output directory: dist/apps/web

# 4. Set environment variables
vercel env add VITE_API_BASE_URL production
# Enter: https://api.yourdomain.com

# 5. Deploy to production
vercel --prod
```

#### `vercel.json`

```json
{
  "buildCommand": "nx build web --configuration=production",
  "outputDirectory": "dist/apps/web",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

---

### Option 2: Netlify

#### Steps

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Initialize
netlify init

# 4. Configure
# - Build command: nx build web --configuration=production
# - Publish directory: dist/apps/web

# 5. Deploy
netlify deploy --prod
```

#### `netlify.toml`

```toml
[build]
  command = "nx build web --configuration=production"
  publish = "dist/apps/web"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

---

### Option 3: AWS S3 + CloudFront

#### Steps

```bash
# 1. Build application
nx build web --configuration=production

# 2. Install AWS CLI
brew install awscli  # macOS
# Or: https://aws.amazon.com/cli/

# 3. Configure AWS credentials
aws configure
# Enter: Access Key, Secret Key, Region (us-east-1)

# 4. Create S3 bucket
aws s3 mb s3://accounting-web-prod --region us-east-1

# 5. Configure bucket for static hosting
aws s3 website s3://accounting-web-prod \
  --index-document index.html \
  --error-document index.html

# 6. Set bucket policy (public read)
cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::accounting-web-prod/*"
  }]
}
EOF

aws s3api put-bucket-policy \
  --bucket accounting-web-prod \
  --policy file://bucket-policy.json

# 7. Upload build
aws s3 sync dist/apps/web s3://accounting-web-prod \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

# 8. Create CloudFront distribution (via AWS Console)
# - Origin: accounting-web-prod.s3.amazonaws.com
# - Viewer Protocol: Redirect HTTP to HTTPS
# - Default Root Object: index.html
# - Error Pages: 404 → /index.html (for SPA routing)

# 9. Get CloudFront URL
# https://d111111abcdef8.cloudfront.net
```

#### Deployment Script

**File**: `scripts/deploy-frontend.sh`

```bash
#!/bin/bash

# Build
echo "Building frontend..."
nx build web --configuration=production

# Upload to S3
echo "Uploading to S3..."
aws s3 sync dist/apps/web s3://accounting-web-prod \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id E1234567ABCDEF \
  --paths "/*"

echo "Deployment complete!"
```

---

### Option 4: Self-Hosted (Nginx)

#### Steps

```bash
# 1. Build application
nx build web --configuration=production

# 2. Copy build to server
scp -r dist/apps/web user@server:/var/www/accounting

# 3. Configure Nginx
sudo nano /etc/nginx/sites-available/accounting-web
```

**Nginx Configuration**:

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    # Root directory
    root /var/www/accounting;
    index index.html;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing (serve index.html for all routes)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (optional, if API on same server)
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable site**:

```bash
sudo ln -s /etc/nginx/sites-available/accounting-web /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Database Management

### Production Database Setup

```bash
# Create database
createdb accounting_prod

# Create application user (don't use postgres superuser)
psql -U postgres
CREATE USER app_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE accounting_prod TO app_user;
\q

# Configure connection pooling
# Max connections = (max_pool_size * number_of_app_instances) + buffer
# Example: (20 * 3) + 10 = 70 connections
```

### Running Migrations in Production

```bash
# Dry run (check what will be executed)
npm run migration:show

# Backup database first!
pg_dump -U postgres accounting_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
NODE_ENV=production npm run migration:run

# Verify
psql -U app_user -d accounting_prod
\dt  # List tables
\q
```

### Database Backup Strategy

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

pg_dump -U postgres accounting_prod | gzip > "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Delete backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

**Setup cron job**:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

---

## CI/CD Pipeline

### GitHub Actions

**File**: `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master, develop]

env:
  NODE_VERSION: '18'

jobs:
  # Backend CI
  backend-ci:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: accounting_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint backend
        run: nx lint api

      - name: Test backend
        run: nx test api
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          DB_DATABASE: accounting_test

      - name: Build backend
        run: nx build api --configuration=production

  # Frontend CI
  frontend-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint frontend
        run: nx lint web

      - name: Test frontend
        run: nx test web

      - name: Build frontend
        run: nx build web --configuration=production

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: frontend-build
          path: dist/apps/web

  # E2E Tests
  e2e-tests:
    runs-on: ubuntu-latest
    needs: [backend-ci, frontend-ci]
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: nx e2e web-e2e

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: dist/.playwright/apps/web-e2e/

  # Deploy to Production
  deploy-production:
    runs-on: ubuntu-latest
    needs: [backend-ci, frontend-ci, e2e-tests]
    if: github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v3

      - name: Deploy Backend
        run: |
          # Your deployment script
          # Example: Heroku
          # git push heroku master

      - name: Deploy Frontend
        run: |
          # Your deployment script
          # Example: Vercel
          # vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## Monitoring & Logging

### Backend Logging

**Setup Winston Logger**:

```bash
npm install winston winston-daily-rotate-file
```

**Configuration**: `apps/api/src/logger.config.ts`

```typescript
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',  // Keep logs for 14 days
  level: 'info',
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    fileRotateTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});
```

### Error Tracking (Sentry)

```bash
npm install @sentry/node @sentry/nestjs
```

**Backend Setup**:

```typescript
// apps/api/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Add Sentry filter to catch all errors
app.useGlobalFilters(new SentryFilter());
```

**Frontend Setup**:

```typescript
// apps/web/src/main.tsx
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
```

### Performance Monitoring

**Backend - New Relic**:

```bash
npm install newrelic
```

```javascript
// newrelic.js
exports.config = {
  app_name: ['Accounting API'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info',
  },
};

// Load at app start
// apps/api/src/main.ts (first line)
require('newrelic');
```

**Frontend - Web Vitals**:

```typescript
// apps/web/src/lib/analytics/web-vitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  const body = JSON.stringify(metric);
  const url = '/api/analytics';

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, { body, method: 'POST', keepalive: true });
  }
}

onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onFCP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

---

## Security Hardening

### Backend Security Checklist

- [ ] **Strong JWT Secrets**: 64+ character random strings
- [ ] **Short Token Expiration**: 15 minutes for access token
- [ ] **HTTPS Only**: Force HTTPS in production
- [ ] **Helmet Enabled**: Security headers configured
- [ ] **CORS Restricted**: Only allowed origins
- [ ] **Rate Limiting**: Prevent brute force (10 req/sec)
- [ ] **Input Validation**: class-validator on all DTOs
- [ ] **SQL Injection Prevention**: Use parameterized queries (TypeORM)
- [ ] **Password Hashing**: bcrypt with 10+ salt rounds
- [ ] **Secrets Management**: Use env vars, never commit secrets
- [ ] **Dependencies Updated**: Regular `npm audit`
- [ ] **Database SSL**: Encrypted database connections
- [ ] **Logging**: No sensitive data logged

### Frontend Security Checklist

- [ ] **HTTPS Only**: Force HTTPS
- [ ] **Content Security Policy**: Restrict resource loading
- [ ] **XSS Prevention**: React auto-escapes, avoid dangerouslySetInnerHTML
- [ ] **CSRF Tokens**: For state-changing requests
- [ ] **Secure Token Storage**: Consider HttpOnly cookies
- [ ] **Input Sanitization**: Validate on client and server
- [ ] **Dependency Audit**: Regular `npm audit`
- [ ] **Environment Variables**: No secrets in frontend code
- [ ] **Security Headers**: X-Frame-Options, X-Content-Type-Options

### Security Headers

**Backend (Helmet)**:

```typescript
// apps/api/src/main.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

**Frontend (Meta Tags)**:

```html
<!-- apps/web/index.html -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="X-Frame-Options" content="SAMEORIGIN">
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
```

---

## Post-Deployment Verification

### Backend Health Checks

```bash
# 1. Health endpoint
curl https://api.yourdomain.com/
# Expected: {"message":"Hello API"}

# 2. Swagger documentation
open https://api.yourdomain.com/api/docs

# 3. Test authentication
curl -X POST https://api.yourdomain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@system.com","password":"admin123"}'
# Expected: access_token and refresh_token

# 4. Test protected endpoint
curl https://api.yourdomain.com/admin/users \
  -H "Authorization: Bearer <access_token>"
# Expected: Array of users

# 5. Check database connection
# Login to admin panel and verify data loads
```

### Frontend Health Checks

```bash
# 1. Homepage loads
curl https://app.yourdomain.com/
# Expected: HTML with React app

# 2. Static assets load
curl https://app.yourdomain.com/assets/index-[hash].js
# Expected: JavaScript bundle

# 3. SPA routing works
curl https://app.yourdomain.com/admin/users
# Expected: Same HTML (SPA handles routing)

# 4. Login flow works
# - Open https://app.yourdomain.com/login
# - Login with credentials
# - Verify redirect to dashboard
# - Check JWT token in localStorage

# 5. API integration works
# - Create/edit/delete operations
# - Check network tab for API calls
```

### Performance Verification

```bash
# Lighthouse audit
npx lighthouse https://app.yourdomain.com --view

# Target scores:
# - Performance: >90
# - Accessibility: >90
# - Best Practices: >90
# - SEO: >80

# Check bundle size
ls -lh dist/apps/web/assets/*.js
# Initial bundle should be <500KB
```

---

## Rollback Procedures

### Backend Rollback

#### Option 1: Git Revert

```bash
# 1. Identify bad commit
git log --oneline

# 2. Revert commit
git revert <commit-hash>

# 3. Deploy previous version
git push origin master
# CI/CD will auto-deploy

# Or manual deploy:
git push heroku master
```

#### Option 2: Redeploy Previous Build

```bash
# Heroku
heroku releases                    # List releases
heroku rollback v123               # Rollback to version 123

# PM2
pm2 stop accounting-api
git checkout <previous-commit>
npm install
nx build api --configuration=production
pm2 restart accounting-api
```

#### Option 3: Database Rollback

```bash
# Revert last migration
npm run migration:revert

# Restore from backup
psql -U postgres accounting_prod < backup_20240115_020000.sql
```

### Frontend Rollback

#### Vercel

```bash
# Via dashboard: Select previous deployment and promote
# Or CLI:
vercel rollback <deployment-url>
```

#### AWS CloudFront + S3

```bash
# 1. Get previous version from S3 versioning
aws s3api list-object-versions \
  --bucket accounting-web-prod \
  --prefix index.html

# 2. Restore previous version
aws s3api copy-object \
  --copy-source accounting-web-prod/index.html?versionId=<version-id> \
  --bucket accounting-web-prod \
  --key index.html

# 3. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id E1234567ABCDEF \
  --paths "/*"
```

---

## Troubleshooting

### Deployment Issues

#### Build Fails

```bash
# Error: Out of memory
Error: JavaScript heap out of memory

# Solution: Increase Node.js memory
NODE_OPTIONS=--max_old_space_size=4096 nx build api

# Or in package.json:
"build:prod": "NODE_OPTIONS=--max_old_space_size=4096 nx build api --configuration=production"
```

#### Migration Fails

```bash
# Error: Migration X has already been executed

# Solution: Check migration table
psql -U postgres accounting_prod
SELECT * FROM migrations;

# Manually remove migration entry if needed
DELETE FROM migrations WHERE name = 'MigrationName1234567890';
```

#### CORS Errors in Production

```bash
# Error in browser console:
# Access to XMLHttpRequest at 'https://api.yourdomain.com' from origin 'https://app.yourdomain.com'
# has been blocked by CORS policy

# Solution: Update backend CORS_ORIGINS
CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com

# Verify in apps/api/src/main.ts:
app.enableCors({
  origin: process.env.CORS_ORIGINS.split(','),
  credentials: true,
});
```

#### 502 Bad Gateway

```bash
# Nginx cannot connect to backend

# Check backend is running
pm2 status
# or
heroku ps

# Check backend port matches Nginx config
# Nginx proxy_pass should match backend PORT

# Check backend logs
pm2 logs accounting-api
# or
heroku logs --tail --app accounting-api-prod
```

---

## Related Documentation

This deployment guide works with:

**Backend Docs**:
- ARCHITECTURE.md - System architecture
- API_ENDPOINTS.md - API reference
- MODULE_DEVELOPMENT.md - Backend development

**Frontend Docs**:
- FRONTEND_IMPLEMENTATION_PLAN.md - Frontend architecture
- COMPONENT_DESIGN_SYSTEM.md - UI components
- API_INTEGRATION_GUIDE.md - API integration

**Process Docs**:
- DEVELOPER_ONBOARDING.md - Getting started
- DEPLOYMENT_GUIDE.md (this document) - Production deployment

---

## Conclusion

Following this guide ensures:
- ✅ Secure production deployment
- ✅ Automated CI/CD pipeline
- ✅ Proper monitoring and logging
- ✅ Quick rollback capability
- ✅ Performance optimization
- ✅ Security hardening

### Production Readiness Checklist

**Before Launch**:
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance metrics acceptable
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Rollback procedure tested
- [ ] Documentation updated
- [ ] Team trained on operations

**After Launch**:
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify backup running
- [ ] Watch user feedback
- [ ] Plan scaling strategy

---

**Version**: 1.0
**Last Updated**: January 2024
**Deployment Platforms**: Heroku, AWS, DigitalOcean, Vercel, Netlify
