import { Module } from '@nestjs/common';
import { TournamentsService } from './tournaments.service.js';
import { TournamentsController } from './tournaments.controller.js';

@Module({
  controllers: [TournamentsController],
  providers: [TournamentsService],
  exports: [TournamentsService],
})
export class TournamentsModule {}
