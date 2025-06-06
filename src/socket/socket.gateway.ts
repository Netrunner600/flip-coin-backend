import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'sessionId']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
})
export class SocketGateway {
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    console.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  sendUpdate(event: string, data: any) {
    this.server.emit(event, data);
  }

  sendToUser(sessionId: string, event: string, data: any) {
    const client = Array.from(this.server.sockets.sockets.values()).find(
      (socket) => socket.handshake.headers.sessionid === sessionId
    );

    if (client) {
      client.emit(event, data);
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() data: { sessionId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.sessionId);
    console.log(`User with sessionId ${data.sessionId} joined their private room`);
  }
}
