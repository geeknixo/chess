import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service.js';
import { tournaments, tournamentParticipants, users, matches } from '../db/schema.js';
import { CreateTournamentDto } from './dto/create-tournament.dto.js';
import { UpdateTournamentDto } from './dto/update-tournament.dto.js';
import { eq, desc, and } from 'drizzle-orm';

@Injectable()
export class TournamentsService {
  constructor(private readonly db: DbService) {}

  async create(createDto: CreateTournamentDto) {
    const [inserted] = await this.db.db.insert(tournaments).values({
      name: createDto.name,
      timeControlInitialMinutes: createDto.timeControlInitialMinutes,
      timeControlIncrementSeconds: createDto.timeControlIncrementSeconds || 0,
      startedAt: createDto.startedAt ? new Date(createDto.startedAt) : null,
    }).returning();
    return inserted;
  }

  async findAll(userId?: string) {
    const all = await this.db.db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
    if (!userId) return all;

    const participations = await this.db.db.select().from(tournamentParticipants).where(eq(tournamentParticipants.userId, userId));
    const joinedSet = new Set(participations.map(p => p.tournamentId));

    return all.map(t => ({
      ...t,
      hasJoined: joinedSet.has(t.id)
    }));
  }

  async findOne(id: string) {
    const [tournament] = await this.db.db.select().from(tournaments).where(eq(tournaments.id, id));
    if (!tournament) throw new NotFoundException('Tournament not found');
    return tournament;
  }

  async update(id: string, updateDto: UpdateTournamentDto) {
    const data: any = { ...updateDto };
    if (updateDto.startedAt) data.startedAt = new Date(updateDto.startedAt);
    
    const [updated] = await this.db.db.update(tournaments)
      .set(data)
      .where(eq(tournaments.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Tournament not found');
    return updated;
  }

  async join(tournamentId: string, userId: string) {
    await this.findOne(tournamentId);
    
    const [existing] = await this.db.db.select().from(tournamentParticipants)
      .where(and(
        eq(tournamentParticipants.tournamentId, tournamentId),
        eq(tournamentParticipants.userId, userId)
      ));
      
    if (!existing) {
      await this.db.db.insert(tournamentParticipants).values({
        tournamentId,
        userId,
      });
    }
    return { success: true };
  }

  async getLeaderboard(tournamentId: string) {
    const results = await this.db.db.select({
      points: tournamentParticipants.points,
      email: users.email,
    })
    .from(tournamentParticipants)
    .innerJoin(users, eq(users.id, tournamentParticipants.userId))
    .where(eq(tournamentParticipants.tournamentId, tournamentId))
    .orderBy(desc(tournamentParticipants.points));
    
    return results;
  }

  async getMatches(tournamentId: string) {
    // We want to return matches with player emails
    const results = await this.db.db.select({
      id: matches.id,
      status: matches.status,
      result: matches.result,
      terminationReason: matches.terminationReason,
      startedAt: matches.startedAt,
      endedAt: matches.endedAt,
      whitePlayerId: matches.whitePlayerId,
      blackPlayerId: matches.blackPlayerId,
    })
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId))
    .orderBy(desc(matches.startedAt));
    
    // We fetch users separately or use aliased joins (Drizzle raw is easier)
    const allUsers = await this.db.db.select({ id: users.id, email: users.email }).from(users);
    const userMap = new Map(allUsers.map(u => [u.id, u.email]));

    return results.map(m => ({
      ...m,
      whiteEmail: userMap.get(m.whitePlayerId) || 'Unknown',
      blackEmail: userMap.get(m.blackPlayerId) || 'Unknown',
    }));
  }
}
