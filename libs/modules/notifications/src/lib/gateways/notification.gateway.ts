import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

import { NotificationCreatedEvent } from '../services/notification-dispatcher.service';

interface JwtPayload {
  sub: string;
  email: string;
  companyId: string;
}

/**
 * CORS configuration for WebSocket gateway.
 * Note: We can't use ConfigService in decorator, so we use process.env directly
 * which is already loaded by NestJS ConfigModule before gateway initialization.
 * The ConfigService is still used in constructor for logging/debugging purposes.
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Get allowed origins - must be synchronous for CORS callback
      const corsOriginsEnv = process.env['CORS_ORIGINS'];
      const allowedOrigins = corsOriginsEnv
        ? corsOriginsEnv.split(',').map((o) => o.trim())
        : ['http://localhost:4200'];

      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // In development, log the rejection for debugging
        if (process.env['NODE_ENV'] !== 'production') {
          console.warn(
            `WebSocket CORS rejected origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`
          );
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);
  private allowedOrigins: string[] = [];

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {
    // Store allowed origins from ConfigService for logging/debugging
    this.allowedOrigins = this.configService.get<string>('CORS_ORIGINS')?.split(',') || [
      'http://localhost:4200',
    ];
  }

  afterInit(): void {
    this.logger.log('Notification WebSocket Gateway initialized', {
      allowedOrigins: this.allowedOrigins,
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected - no token`);
        client.disconnect();
        return;
      }

      const payload = await this.verifyToken(token);

      if (!payload) {
        this.logger.warn(`Client ${client.id} connection rejected - invalid token`);
        client.disconnect();
        return;
      }

      client.data.userId = payload.sub;
      client.data.companyId = payload.companyId;

      await client.join(`user:${payload.sub}`);
      await client.join(`company:${payload.companyId}`);

      this.logger.log(`Client ${client.id} connected`, {
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
    this.logger.log(`Client ${client.id} disconnected`, {
      userId: client.data?.userId,
    });
  }

  @OnEvent('notification.created')
  handleNotificationCreated(event: NotificationCreatedEvent): void {
    const { notification, recipientId } = event;

    this.server.to(`user:${recipientId}`).emit('notification:new', notification);

    this.logger.debug(`Sent notification to user ${recipientId}`, {
      notificationId: notification.id,
      type: notification.type,
    });
  }

  sendUnreadCountUpdate(userId: string, count: number): void {
    this.server.to(`user:${userId}`).emit('notification:unread-count', { count });
  }

  sendNotificationRead(userId: string, notificationId: string): void {
    this.server.to(`user:${userId}`).emit('notification:read', { id: notificationId });
  }

  sendNotificationArchived(userId: string, notificationId: string): void {
    this.server.to(`user:${userId}`).emit('notification:archived', { id: notificationId });
  }

  broadcastToCompany(companyId: string, event: string, data: unknown): void {
    this.server.to(`company:${companyId}`).emit(event, data);
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.auth?.token as string | undefined;
    if (authHeader) {
      return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    }

    // Security: Reject tokens passed via query string (OWASP A07:2021)
    // Query strings are logged in server access logs and browser history
    if (client.handshake.query?.token) {
      this.logger.warn(
        `Client ${client.id} attempted to use token via query string - rejected for security`
      );
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
