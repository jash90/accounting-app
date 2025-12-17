# @accounting/email

Shared email module providing IMAP and SMTP functionality for multi-tenant applications.

## Features

- **SMTP Email Sending** - Send emails via SMTP with template support
- **IMAP Email Reading** - Read and process emails from IMAP servers
- **Persistent Configuration** - Store encrypted email configurations in database
- **User & Company Configs** - Separate configurations for users and companies
- **Multi-tenant Support** - Configure different email accounts per company
- **Encrypted Passwords** - AES-256-CBC encryption for stored credentials
- **Type-safe** - Full TypeScript support with interfaces and DTOs

## New: Persistent Email Configuration

Each user can now configure their own email account, and company owners can assign an additional email configuration to their company. All passwords are securely encrypted in the database.

**API Endpoints:**
- `POST /api/email-config/user` - Create user email config
- `GET /api/email-config/user` - Get user email config
- `PUT /api/email-config/user` - Update user email config
- `DELETE /api/email-config/user` - Delete user email config
- `POST /api/email-config/company` - Create company email config (owner only)
- `GET /api/email-config/company` - Get company email config
- `PUT /api/email-config/company` - Update company email config (owner only)
- `DELETE /api/email-config/company` - Delete company email config (owner only)

## Installation

The module is already part of the monorepo. Just import it in your module.

## Usage

See detailed documentation in [USAGE.md](./USAGE.md).
