import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["*"],
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
})
export class SocketGateway {
  @WebSocketServer()
  server: Server;

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
