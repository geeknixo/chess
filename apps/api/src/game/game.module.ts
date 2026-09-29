import { Module } from '@nestjs/common';
import { GameService } from './game.service.js';
import { GameGateway } from './game.gateway.js';
import { JwtModule } from '@nestjs/jwt';
import * as dotenv from 'dotenv';
dotenv.config();

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
    }),
  ],
  providers: [GameService, GameGateway],
  exports: [GameGateway],
})
export class GameModule {}
