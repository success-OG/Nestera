import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { OnEvent } from '@nestjs/event-emitter';

export type NotificationPayload = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationAckPayload = {
  notificationId: string;
};

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly connections = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('NotificationsGateway initialized.');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query?.token as string | undefined;
      if (!token) {
        this.logger.warn('WebSocket connection rejected: missing token');
        client.disconnect(true);
        return;
      }

      const secret = this.configService.get<string>('jwt.secret');
      const payload = this.jwtService.verify(token, { secret });

      const userId = payload.sub;
      client.data.userId = userId;

      const sockets = this.connections.get(userId) ?? new Set<string>();
      sockets.add(client.id);
      this.connections.set(userId, sockets);

      this.logger.log(`WebSocket connected: ${client.id} for user ${userId}`);
      this.server.emit('presence.updated', {
        userId,
        connected: true,
        activeConnections: sockets.size,
      });

      const unread =
        await this.notificationsService.getUnreadNotifications(userId);
      if (unread.length) {
        client.emit('notifications.sync', unread);
      }
    } catch (error) {
      this.logger.warn('WebSocket connection rejected: invalid token');
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      return;
    }

    const sockets = this.connections.get(userId);
    if (!sockets) {
      return;
    }

    sockets.delete(client.id);
    if (!sockets.size) {
      this.connections.delete(userId);
    }

    this.logger.log(`WebSocket disconnected: ${client.id} for user ${userId}`);
    this.server.emit('presence.updated', {
      userId,
      connected: Boolean(sockets?.size),
      activeConnections: sockets?.size ?? 0,
    });
  }

  broadcastNotification(notification: NotificationPayload) {
    const sockets = this.connections.get(notification.userId);
    if (!sockets?.size) {
      return;
    }

    for (const socketId of sockets) {
      this.server.to(socketId).emit('notification.created', notification);
    }
  }

  @SubscribeMessage('notification.ack')
  async handleNotificationAck(
    @MessageBody() payload: NotificationAckPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      return;
    }

    const notification = await this.notificationsService.markAsRead(
      payload.notificationId,
    );

    if (notification?.userId === userId) {
      client.emit('notification.acknowledged', {
        notificationId: payload.notificationId,
        status: 'acknowledged',
      });
    }
  }

  notifyUser(notification: NotificationPayload) {
    this.broadcastNotification(notification);
  }

  @OnEvent('notification.created')
  async handleNotificationCreated(notification: NotificationPayload) {
    this.notifyUser(notification);
  }
}
