import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DbModule } from './db/db.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TournamentsModule } from './tournaments/tournaments.module.js';
import { MatchmakingModule } from './matchmaking/matchmaking.module.js';
import { GameModule } from './game/game.module.js';

@Module({
  imports: [DbModule, AuthModule, TournamentsModule, MatchmakingModule, GameModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
