import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service.js';
import { matchmakingQueue, matches, tournaments } from '../db/schema.js';
import { eq, ne, asc, and, inArray } from 'drizzle-orm';
import { QueueDto } from './dto/queue.dto.js';
import { GameGateway } from '../game/game.gateway.js';

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);

  constructor(
    private readonly db: DbService,
    private readonly gameGateway: GameGateway
  ) {}

  async queue(userId: string, queueDto: QueueDto) {
    const { tournamentId } = queueDto;
    
    // Check if tournament is open or ongoing
    const [tournament] = await this.db.db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
    if (!tournament || (tournament.status !== 'OPEN' && tournament.status !== 'ONGOING')) {
      throw new BadRequestException('Tournament is not open for matches');
    }

    // Check if user is already in an active match
    const activeMatches = await this.db.db.select().from(matches)
      .where(and(eq(matches.status, 'ACTIVE'), 
             inArray(matches.whitePlayerId, [userId]),
             inArray(matches.blackPlayerId, [userId])));
    // Actually in Drizzle it's easier to just check if either player is the user:
    const activeMatches2 = await this.db.db.query.matches.findFirst({
        where: (matches, { eq, or, and }) => and(
            eq(matches.status, 'ACTIVE'),
            or(eq(matches.whitePlayerId, userId), eq(matches.blackPlayerId, userId))
        )
    });
    if (activeMatches2) {
        return { matched: true, matchId: activeMatches2.id };
    }

    try {
      // Begin transaction to ensure safe queue/dequeue
      const result = await this.db.db.transaction(async (tx) => {
        // Find opponent
        const [opponent] = await tx.select().from(matchmakingQueue)
          .where(and(eq(matchmakingQueue.tournamentId, tournamentId), ne(matchmakingQueue.userId, userId)))
          .orderBy(asc(matchmakingQueue.joinedAt))
          .limit(1);

        if (opponent) {
          // Found a match!
          this.logger.log(`Matched user ${userId} with user ${opponent.userId}`);
          
          // Delete both from queue
          await tx.delete(matchmakingQueue).where(inArray(matchmakingQueue.userId, [userId, opponent.userId]));
          
          // Create match (randomize colors for MVP, here we just do first in queue is white)
          const [newMatch] = await tx.insert(matches).values({
            tournamentId,
            whitePlayerId: opponent.userId,
            blackPlayerId: userId,
            status: 'ACTIVE',
            startedAt: new Date(),
          }).returning();

          // Notify the opponent who was waiting in the queue
          this.gameGateway.server.to(`user:${opponent.userId}`).emit('matchmaking:matched', { matchId: newMatch.id });

          return { matched: true, matchId: newMatch.id };
        } else {
          // Enter queue
          await tx.insert(matchmakingQueue).values({
            tournamentId,
            userId,
          }).onConflictDoNothing();
          
          return { matched: false, queue: true };
        }
      });
      return result;
    } catch (e) {
      this.logger.error('Error in matchmaking', e);
      throw new BadRequestException('Failed to enter queue');
    }
  }

  async leaveQueue(userId: string) {
    await this.db.db.delete(matchmakingQueue).where(eq(matchmakingQueue.userId, userId));
    return { success: true };
  }
}
