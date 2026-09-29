import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service.js';
import { JwtService } from '@nestjs/jwt';
import { MoveDto } from './dto/move.dto.js';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly jwtService: JwtService,
  ) {}

  private readonly logger = new Logger(GameGateway.name);

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers.cookie;
      if (!cookieHeader) throw new Error('No cookie');
      
      const token = cookieHeader.split('; ').find(c => c.startsWith('Authentication='))?.split('=')[1];
      if (!token) throw new Error('No token');

      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET || 'super-secret-key-change-in-prod' });
      client.data.user = payload;
      client.join(`user:${payload.sub}`);
      this.logger.log(`Client connected and joined room: user:${payload.sub}`);
    } catch (e) {
      this.logger.error(`Socket connection failed: ${(e as Error).message}`);
      client.disconnect();
    }
  }

  @SubscribeMessage('match:join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { matchId: string }) {
    if (!client.data.user) return;
    
    const active = await this.gameService.loadMatch(data.matchId);
    if (!active) {
      client.emit('match:error', { message: 'Match not found or already ended' });
      return;
    }

    if (active.whiteId !== client.data.user.sub && active.blackId !== client.data.user.sub && client.data.user.role !== 'COACH') {
      client.emit('match:error', { message: 'Unauthorized' });
      return;
    }

    client.join(data.matchId);
    client.emit('match:state', this.gameService.getGameState(data.matchId));
    
    // Broadcast viewer count
    const roomSize = this.server.sockets.adapter.rooms.get(data.matchId)?.size || 0;
    this.server.to(data.matchId).emit('match:viewers', { count: roomSize });
  }

  @SubscribeMessage('match:move')
  async handleMove(@ConnectedSocket() client: Socket, @MessageBody() move: MoveDto) {
    if (!client.data.user) return;

    try {
      const result = await this.gameService.handleMove(
        client.data.user.sub,
        move.matchId,
        move.from,
        move.to,
        move.promotion
      );

      if (!result) return;

      if (result.type === 'move') {
        // @ts-ignore
        this.server.to(move.matchId).emit('match:state', result.state);
      } else if (result.type === 'end') {
        this.server.to(move.matchId).emit('match:end', result);
      }
    } catch (e) {
      client.emit('match:error', { message: (e as Error).message });
    }
  }

  @SubscribeMessage('match:resign')
  async handleResign(@ConnectedSocket() client: Socket, @MessageBody() data: { matchId: string }) {
    if (!client.data.user) return;
    const result = await this.gameService.resign(client.data.user.sub, data.matchId);
    if (result) {
      this.server.to(data.matchId).emit('match:end', result);
    }
  }
}
