import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { JwtPayload } from '@accounting/auth';

import { EmailIdleService } from '../services/email-idle.service';

@Injectable()
@WebSocketGateway({
  namespace: '/email',
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      const corsOriginsEnv = process.env['CORS_ORIGINS'];
      const allowedOrigins = corsOriginsEnv
        ? corsOriginsEnv.split(',').map((o) => o.trim())
        : ['http://localhost:4200'];

      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  },
})
export class EmailGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EmailGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly emailIdleService: EmailIdleService
  ) {}

  afterInit(): void {
    this.logger.log('Email WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} rejected - no token`);
        client.disconnect();
        return;
      }

      const payload = await this.verifyToken(token);
      if (!payload) {
        this.logger.warn(`Client ${client.id} rejected - invalid token`);
        client.disconnect();
        return;
      }

      client.data.userId = payload.sub;
      client.data.companyId = payload.companyId;

      await client.join(`email:company:${payload.companyId}`);

      // Start IDLE monitoring for this company
      if (payload.companyId) {
        await this.emailIdleService.startIdle(payload.companyId);
      }

      this.logger.log(`Client ${client.id} connected to email namespace`, {
        userId: payload.sub,
        companyId: payload.companyId,
      });
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}`, {
        error: (error as Error).message,
      });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const companyId = client.data?.companyId;

    if (companyId) {
      client.leave(`email:company:${companyId}`);
      this.emailIdleService.stopIdle(companyId);
    }

    this.logger.log(`Client ${client.id} disconnected from email namespace`);
  }

  @OnEvent('email.new-message')
  handleNewEmail(event: { companyId: string; message: unknown }): void {
    this.server.to(`email:company:${event.companyId}`).emit('email:new', event.message);
    this.logger.debug(`Sent new email notification to company ${event.companyId}`);
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.auth?.token as string | undefined;
    if (authHeader) {
      return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    }

    // Fallback: extract from httpOnly cookie (cookie-based auth mode)
    const cookieHeader = client.handshake.headers?.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
      if (match?.[1]) {
        return match[1];
      }
    }

    return null;
  }

  private async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch {
      return null;
    }
  }
}
