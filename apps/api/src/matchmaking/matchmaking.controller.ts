import { Controller, Post, Body, Delete, UseGuards, Req } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service.js';
import { QueueDto } from './dto/queue.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Roles('STUDENT')
  @Post('queue')
  queue(@Req() req: any, @Body() queueDto: QueueDto) {
    return this.matchmakingService.queue(req.user.id, queueDto);
  }

  @Roles('STUDENT')
  @Delete('queue')
  leaveQueue(@Req() req: any) {
    return this.matchmakingService.leaveQueue(req.user.id);
  }
}
