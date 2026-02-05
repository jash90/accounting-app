# Email Module - Usage Guide

Complete guide for using the `@accounting/email` module for IMAP and SMTP operations.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Persistent Email Configuration](#persistent-email-configuration)
- [Configuration](#configuration)
- [Sending Emails (SMTP)](#sending-emails-smtp)
- [Reading Emails (IMAP)](#reading-emails-imap)
- [Integration Examples](#integration-examples)
- [Environment Variables](#environment-variables)
- [Best Practices](#best-practices)

## Installation

The module is part of the monorepo. Dependencies have been added to `package.json`:

```bash
npm install
```

**Dependencies:**

- `nodemailer` - SMTP email sending
- `node-imap` - IMAP email reading
- `mailparser` - Email parsing
- `@types/nodemailer` - TypeScript types
- `@types/node-imap` - TypeScript types

## Quick Start

### 1. Import the EmailModule

```typescript
import { EmailModule } from '@accounting/email';
import { Module } from '@nestjs/common';

@Module({
  imports: [EmailModule],
  // ...
})
export class YourModule {}
```

### 2. Inject Services

```typescript
import { EmailReaderService, EmailSenderService } from '@accounting/email';
import { Injectable } from '@nestjs/common';

@Injectable()
export class YourService {
  constructor(
    private readonly emailSender: EmailSenderService,
    private readonly emailReader: EmailReaderService
  ) {}
}
```

## Persistent Email Configuration

The email module now supports persistent email configuration stored in the database with encrypted passwords. Each user can have their own email configuration, and company owners can assign an additional email configuration to their company.

### API Endpoints

#### User Email Configuration

Users can manage their own email configuration through these endpoints:

**Create User Configuration:**

```bash
POST /api/email-config/user
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "smtpHost": "mail-server123456.lh.pl",
  "smtpPort": 465,
  "smtpSecure": true,
  "smtpUser": "user@domain.pl",
  "smtpPassword": "password123",
  "imapHost": "mail-server123456.lh.pl",
  "imapPort": 993,
  "imapTls": true,
  "imapUser": "user@domain.pl",
  "imapPassword": "password123",
  "displayName": "My Personal Email"
}
```

**Get User Configuration:**

```bash
GET /api/email-config/user
Authorization: Bearer <jwt-token>
```

**Update User Configuration:**

```bash
PUT /api/email-config/user
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "displayName": "Updated Name",
  "smtpPassword": "newpassword"  // Partial updates supported
}
```

**Delete User Configuration:**

```bash
DELETE /api/email-config/user
Authorization: Bearer <jwt-token>
```

#### Company Email Configuration

Company owners can manage company-wide email configuration:

**Create Company Configuration:**

```bash
POST /api/email-config/company
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "smtpHost": "mail-server123456.lh.pl",
  "smtpPort": 465,
  "smtpSecure": true,
  "smtpUser": "contact@company.pl",
  "smtpPassword": "password123",
  "imapHost": "mail-server123456.lh.pl",
  "imapPort": 993,
  "imapTls": true,
  "imapUser": "contact@company.pl",
  "imapPassword": "password123",
  "displayName": "Company Contact Email"
}
```

**Get Company Configuration:**

```bash
GET /api/email-config/company
Authorization: Bearer <jwt-token>
```

**Update Company Configuration:**

```bash
PUT /api/email-config/company
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "displayName": "Support Email"
}
```

**Delete Company Configuration:**

```bash
DELETE /api/email-config/company
Authorization: Bearer <jwt-token>
```

### Using Persistent Configuration

```typescript
import { EmailConfigurationService, EmailSenderService } from '@accounting/email';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  constructor(
    private readonly emailConfigService: EmailConfigurationService,
    private readonly emailSender: EmailSenderService
  ) {}

  async sendUserNotification(userId: string, message: string) {
    // Get user's email configuration
    const userConfig = await this.emailConfigService.getUserConfig(userId);

    // Get decrypted SMTP config for sending
    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfig(userConfig.id);

    // Send email using user's configuration
    await this.emailSender.sendEmail(smtpConfig, {
      to: 'recipient@example.com',
      subject: 'Notification',
      html: `<p>${message}</p>`,
    });
  }

  async sendCompanyNotification(companyId: string, message: string) {
    // Get company's email configuration
    const companyConfig = await this.emailConfigService.getCompanyConfig(companyId);

    // Get decrypted SMTP config
    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfig(companyConfig.id);

    // Send email using company's configuration
    await this.emailSender.sendEmail(smtpConfig, {
      to: 'customer@example.com',
      subject: 'Company Notification',
      html: `<p>${message}</p>`,
    });
  }
}
```

### Security Features

- **Encrypted Passwords**: All SMTP and IMAP passwords are encrypted in the database using AES-256-CBC
- **Secure Key**: Encryption key is stored in environment variables (`ENCRYPTION_KEY`)
- **User Isolation**: Users can only access and modify their own email configurations
- **Owner-Only Company Config**: Only company owners and admins can manage company email configurations
- **Connection Verification**: Email credentials are verified before saving

### Configuration Constraints

- **One per User**: Each user can have only one email configuration
- **One per Company**: Each company can have only one email configuration
- **Mutually Exclusive**: Configuration belongs to either a user OR a company, never both
- **Automatic Cascade**: Deleting a user or company automatically deletes associated email configuration

## Configuration

### Using EmailConfigHelper (Recommended)

For LH.pl mail servers:

```typescript
import { EmailConfigHelper } from '@accounting/email';

// From direct values
const config = EmailConfigHelper.createFromLHServer({
  serverNumber: '123456', // From mail-server123456.lh.pl
  emailAddress: 'contact@yourdomain.pl',
  password: 'your-password',
});

// From environment variables
const config = EmailConfigHelper.createFromEnv(process.env);
```

### Manual Configuration

```typescript
import { ImapConfig, SmtpConfig } from '@accounting/email';

const smtpConfig: SmtpConfig = {
  host: 'mail-server123456.lh.pl',
  port: 465,
  secure: true, // SSL/TLS
  auth: {
    user: 'your@yourdomain.pl',
    pass: 'your-password',
  },
};

const imapConfig: ImapConfig = {
  host: 'mail-server123456.lh.pl',
  port: 993,
  tls: true,
  user: 'your@yourdomain.pl',
  password: 'your-password',
  tlsOptions: {
    rejectUnauthorized: false,
  },
};
```

## Sending Emails (SMTP)

### Basic Email

```typescript
await this.emailSender.sendEmail(smtpConfig, {
  to: 'recipient@example.com',
  subject: 'Welcome!',
  text: 'Welcome to our platform.',
  html: '<p>Welcome to our <strong>platform</strong>!</p>',
});
```

### Multiple Recipients

```typescript
await this.emailSender.sendEmail(smtpConfig, {
  to: ['user1@example.com', 'user2@example.com'],
  cc: 'manager@example.com',
  bcc: 'archive@example.com',
  subject: 'Team Update',
  html: '<p>Important team announcement...</p>',
});
```

### With Attachments

```typescript
await this.emailSender.sendEmail(smtpConfig, {
  to: 'client@example.com',
  subject: 'Invoice #12345',
  html: '<p>Please find your invoice attached.</p>',
  attachments: [
    {
      filename: 'invoice.pdf',
      path: '/path/to/invoice.pdf',
      contentType: 'application/pdf',
    },
    {
      filename: 'logo.png',
      content: Buffer.from('...'),
      contentType: 'image/png',
      contentDisposition: 'inline',
    },
  ],
});
```

### Batch Sending

```typescript
await this.emailSender.sendBatchEmails(smtpConfig, [
  { to: 'user1@example.com', subject: 'Hello', html: '<p>Message 1</p>' },
  { to: 'user2@example.com', subject: 'Hello', html: '<p>Message 2</p>' },
  { to: 'user3@example.com', subject: 'Hello', html: '<p>Message 3</p>' },
]);
```

### Verify Connection

```typescript
const isValid = await this.emailSender.verifyConnection(smtpConfig);
if (!isValid) {
  throw new Error('SMTP connection failed');
}
```

## Reading Emails (IMAP)

### Fetch Recent Emails

```typescript
const emails = await this.emailReader.fetchEmails(imapConfig, {
  limit: 10,
  unseenOnly: false,
  markAsSeen: false,
});

emails.forEach((email) => {
  console.log(`From: ${email.from[0].address}`);
  console.log(`Subject: ${email.subject}`);
  console.log(`Date: ${email.date}`);
  console.log(`Body: ${email.text || email.html}`);
});
```

### Fetch Only Unread Emails

```typescript
const unreadEmails = await this.emailReader.fetchEmails(imapConfig, {
  mailbox: 'INBOX',
  limit: 20,
  unseenOnly: true,
  markAsSeen: true, // Mark as read after fetching
});
```

### Process Email Attachments

```typescript
const emails = await this.emailReader.fetchEmails(imapConfig);

for (const email of emails) {
  if (email.attachments && email.attachments.length > 0) {
    for (const attachment of email.attachments) {
      console.log(`Attachment: ${attachment.filename}`);
      console.log(`Size: ${attachment.size} bytes`);
      console.log(`Type: ${attachment.contentType}`);

      // Save attachment
      await fs.promises.writeFile(`/path/to/save/${attachment.filename}`, attachment.content);
    }
  }
}
```

### List Mailboxes

```typescript
const mailboxes = await this.emailReader.listMailboxes(imapConfig);
console.log('Available mailboxes:', mailboxes);
// ['INBOX', 'Sent', 'Drafts', 'Trash', ...]
```

### Mark Emails as Read/Unread

```typescript
// Mark as read
await this.emailReader.markAsSeen(imapConfig, [messageId1, messageId2], true);

// Mark as unread
await this.emailReader.markAsSeen(imapConfig, [messageId3], false);
```

### Delete Emails

```typescript
await this.emailReader.deleteEmails(imapConfig, [messageId1, messageId2]);
```

### Advanced Search

```typescript
const emails = await this.emailReader.fetchEmails(imapConfig, {
  searchCriteria: ['UNSEEN', ['SINCE', '2024-01-01'], ['FROM', 'important@example.com']],
  limit: 50,
});
```

## Integration Examples

### Multi-Tenant Email Service

```typescript
import { EmailConfigHelper, EmailSenderService } from '@accounting/email';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CompanyEmailService {
  constructor(private readonly emailSender: EmailSenderService) {}

  async sendCompanyEmail(companyId: string, to: string, subject: string, html: string) {
    // Fetch company's email configuration from database
    const companyEmailConfig = await this.getCompanyEmailConfig(companyId);

    const smtpConfig = EmailConfigHelper.createSmtpConfig(
      companyEmailConfig.host,
      companyEmailConfig.email,
      companyEmailConfig.password,
      companyEmailConfig.smtpPort
    );

    await this.emailSender.sendEmail(smtpConfig, {
      to,
      subject,
      html,
      from: companyEmailConfig.email,
    });
  }

  private async getCompanyEmailConfig(companyId: string) {
    // Fetch from database
    return {
      host: 'mail-server123456.lh.pl',
      email: 'company@domain.pl',
      password: 'encrypted-password',
      smtpPort: 465,
    };
  }
}
```

### Email Queue Worker

```typescript
import { EmailConfigHelper, EmailReaderService } from '@accounting/email';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class EmailInboxWorker {
  private readonly logger = new Logger(EmailInboxWorker.name);

  constructor(private readonly emailReader: EmailReaderService) {}

  @Cron('*/5 * * * *') // Every 5 minutes
  async processInbox() {
    const config = EmailConfigHelper.createFromEnv(process.env);

    try {
      const emails = await this.emailReader.fetchEmails(config.imap, {
        unseenOnly: true,
        markAsSeen: true,
        limit: 50,
      });

      this.logger.log(`Processing ${emails.length} new emails`);

      for (const email of emails) {
        await this.processEmail(email);
      }
    } catch (error) {
      this.logger.error(`Failed to process inbox: ${error.message}`);
    }
  }

  private async processEmail(email: any) {
    // Process email logic
    this.logger.log(`Processing email from ${email.from[0].address}`);
  }
}
```

### Notification Service

```typescript
import { EmailSenderService, SmtpConfig } from '@accounting/email';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  constructor(private readonly emailSender: EmailSenderService) {}

  async sendWelcomeEmail(userEmail: string, userName: string) {
    const smtpConfig = this.getSmtpConfig();

    await this.emailSender.sendEmail(smtpConfig, {
      to: userEmail,
      subject: 'Welcome to Our Platform!',
      html: `
        <h1>Welcome, ${userName}!</h1>
        <p>Thank you for joining our platform.</p>
        <p>Get started by exploring our features...</p>
      `,
    });
  }

  async sendPasswordResetEmail(userEmail: string, resetToken: string) {
    const smtpConfig = this.getSmtpConfig();
    const resetUrl = `https://yourapp.com/reset-password?token=${resetToken}`;

    await this.emailSender.sendEmail(smtpConfig, {
      to: userEmail,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
      `,
    });
  }

  private getSmtpConfig(): SmtpConfig {
    return {
      host: process.env.MAIL_SMTP_HOST!,
      port: parseInt(process.env.MAIL_SMTP_PORT!),
      secure: true,
      auth: {
        user: process.env.MAIL_USER!,
        pass: process.env.MAIL_PASSWORD!,
      },
    };
  }
}
```

## Environment Variables

Add these to your `.env` file:

```env
# Email Configuration (LH.pl)
MAIL_SERVER_NUMBER=123456
MAIL_ADDRESS=your@yourdomain.pl
MAIL_PASSWORD=your-password

# Optional: Custom Ports
MAIL_SMTP_PORT=465
MAIL_IMAP_PORT=993

# Alternative: Direct Configuration
MAIL_SMTP_HOST=mail-server123456.lh.pl
MAIL_IMAP_HOST=mail-server123456.lh.pl
```

## Best Practices

### 1. Security

```typescript
// ✅ DO: Store credentials in environment variables
const config = EmailConfigHelper.createFromEnv(process.env);

// ❌ DON'T: Hardcode credentials
const config = {
  /* hardcoded values */
};
```

### 2. Error Handling

```typescript
try {
  await this.emailSender.sendEmail(smtpConfig, message);
} catch (error) {
  this.logger.error(`Email send failed: ${error.message}`);
  // Implement retry logic or queue for later
}
```

### 3. Connection Pooling

```typescript
// The EmailSenderService automatically caches SMTP transporters
// No need to create new instances for each email

// ✅ DO: Reuse the same service instance
await this.emailSender.sendEmail(config, message1);
await this.emailSender.sendEmail(config, message2);
```

### 4. Rate Limiting

```typescript
import { Injectable } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

@Injectable()
export class EmailService {
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 emails per minute
  async sendEmail(to: string, subject: string, html: string) {
    // Send email logic
  }
}
```

### 5. Email Validation

```typescript
import { IsEmail } from 'class-validator';

export class SendEmailDto {
  @IsEmail({}, { message: 'Invalid email address' })
  to: string;

  // ... other fields
}
```

### 6. Testing

```typescript
// Use environment-based configuration for testing
if (process.env.NODE_ENV === 'test') {
  // Use test SMTP server like Ethereal
  const testAccount = await nodemailer.createTestAccount();
  // Use testAccount credentials
}
```

## Troubleshooting

### Connection Issues

```typescript
// Test SMTP connection
const isValid = await this.emailSender.verifyConnection(smtpConfig);
if (!isValid) {
  console.error('SMTP connection failed - check credentials and host');
}

// Test IMAP connection
try {
  const mailboxes = await this.emailReader.listMailboxes(imapConfig);
  console.log('IMAP connection successful');
} catch (error) {
  console.error('IMAP connection failed:', error.message);
}
```

### SSL/TLS Issues

```typescript
// For self-signed certificates
const imapConfig: ImapConfig = {
  // ...
  tlsOptions: {
    rejectUnauthorized: false, // Only for development!
  },
};
```

### Debugging

Enable debug logging:

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('EmailDebug');

// The services already include logging
// Check application logs for email operation details
```

## Support

For issues or questions:

1. Check the [main README](./README.md)
2. Review the [interfaces](./src/lib/interfaces/) for TypeScript definitions
3. See [service implementations](./src/lib/services/) for advanced usage

---

**Happy emailing! 📧**
