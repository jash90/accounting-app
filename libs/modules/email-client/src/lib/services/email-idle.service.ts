import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

import {
  convertParsedMailToReceivedEmail,
  createImapFlowClient,
  EmailConfigurationService,
  ImapConfig,
  sendClientIdentification,
} from '@accounting/email';

interface IdleConnection {
  client: ImapFlow;
  companyId: string;
  subscriberCount: number;
  stopTimeout?: ReturnType<typeof setTimeout>;
}

@Injectable()
export class EmailIdleService implements OnModuleDestroy {
  private readonly logger = new Logger(EmailIdleService.name);
  private readonly connections = new Map<string, IdleConnection>();

  constructor(
    private readonly emailConfigService: EmailConfigurationService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async startIdle(companyId: string): Promise<void> {
    const existing = this.connections.get(companyId);

    if (existing) {
      // Cancel pending stop if any
      if (existing.stopTimeout) {
        clearTimeout(existing.stopTimeout);
        existing.stopTimeout = undefined;
      }
      existing.subscriberCount++;
      this.logger.log(
        `IDLE subscriber count for company ${companyId}: ${existing.subscriberCount}`
      );
      return;
    }

    // Create new connection
    try {
      const emailConfig =
        await this.emailConfigService.getDecryptedEmailConfigByCompanyId(companyId);
      if (!emailConfig) {
        this.logger.warn(`No email config for company ${companyId} - IDLE not started`);
        return;
      }

      const client = createImapFlowClient(emailConfig.imap);
      await client.connect();
      await sendClientIdentification(client, this.logger);
      await client.mailboxOpen('INBOX');

      const connection: IdleConnection = {
        client,
        companyId,
        subscriberCount: 1,
      };
      this.connections.set(companyId, connection);

      // Listen for new messages
      client.on('exists', async (data: { path: string; count: number; prevCount: number }) => {
        if (data.count > data.prevCount) {
          this.logger.log(`New message detected for company ${companyId}`);
          await this.fetchLatestMessage(companyId, emailConfig.imap);
        }
      });

      client.on('close', () => {
        this.logger.log(`IDLE connection closed for company ${companyId}`);
        this.connections.delete(companyId);
      });

      this.logger.log(`IDLE connection started for company ${companyId}`);
    } catch (error) {
      this.logger.error(
        `Failed to start IDLE for company ${companyId}: ${(error as Error).message}`
      );
    }
  }

  stopIdle(companyId: string): void {
    const connection = this.connections.get(companyId);
    if (!connection) return;

    connection.subscriberCount--;
    this.logger.log(
      `IDLE subscriber count for company ${companyId}: ${connection.subscriberCount}`
    );

    if (connection.subscriberCount <= 0) {
      // Grace period before closing
      connection.stopTimeout = setTimeout(async () => {
        try {
          await connection.client.logout();
        } catch {
          // Ignore errors on logout
        }
        this.connections.delete(companyId);
        this.logger.log(`IDLE connection stopped for company ${companyId}`);
      }, 30000); // 30s grace period
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const [companyId, connection] of this.connections) {
      if (connection.stopTimeout) clearTimeout(connection.stopTimeout);
      try {
        await connection.client.logout();
      } catch {
        // Ignore
      }
      this.logger.log(`Closed IDLE connection for company ${companyId} on module destroy`);
    }
    this.connections.clear();
  }

  private async fetchLatestMessage(companyId: string, imapConfig: ImapConfig): Promise<void> {
    const client = createImapFlowClient(imapConfig);
    try {
      await client.connect();
      await sendClientIdentification(client, this.logger);
      const lock = await client.getMailboxLock('INBOX');
      try {
        const uids = await client.search({ all: true }, { uid: true });
        if (!uids || uids.length === 0) return;

        const latestUid = uids[uids.length - 1];
        const messages = [];
        for await (const message of client.fetch([latestUid], {
          uid: true,
          flags: true,
          envelope: true,
          source: true,
        })) {
          if (message.source) {
            const parsed = await simpleParser(message.source);
            const email = convertParsedMailToReceivedEmail(parsed, message.seq);
            email.uid = message.uid;
            email.flags = message.flags ? Array.from(message.flags) : [];
            messages.push(email);
          }
        }

        if (messages.length > 0) {
          this.eventEmitter.emit('email.new-message', { companyId, message: messages[0] });
        }
      } finally {
        lock.release();
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch latest message for company ${companyId}: ${(error as Error).message}`
      );
    } finally {
      await client.logout().catch(() => {});
    }
  }
}
