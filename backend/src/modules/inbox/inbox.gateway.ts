import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/inbox',
})
export class InboxGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InboxGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`⚡ WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 WebSocket client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const room = `conversation_${data.conversationId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { status: 'joined', room };
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const room = `conversation_${data.conversationId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room}`);
    return { status: 'left', room };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; senderName: string; isTyping: boolean },
  ) {
    const room = `conversation_${data.conversationId}`;
    client.to(room).emit('user_typing', data);
  }

  /**
   * Broadcasts new incoming/outgoing message to all active participants in room.
   */
  broadcastMessage(conversationId: string, message: any) {
    if (this.server) {
      const room = `conversation_${conversationId}`;
      this.server.to(room).emit('new_message', message);
      // Also notify staff dashboard overview
      this.server.emit('conversation_updated', {
        conversationId,
        lastMessage: message,
      });
    }
  }

  /**
   * Broadcasts read receipt updates.
   */
  broadcastReadReceipt(conversationId: string) {
    if (this.server) {
      const room = `conversation_${conversationId}`;
      this.server.to(room).emit('messages_read', { conversationId });
    }
  }
}
