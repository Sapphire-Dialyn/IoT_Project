import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' }, // Cho phép Frontend kết nối thoải mái
})
export class SoilGateway {
  @WebSocketServer()
  server: Server;
}