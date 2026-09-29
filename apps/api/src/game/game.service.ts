import { Injectable, Logger } from '@nestjs/common';
import { Chess } from 'chess.js';
import { DbService } from '../db/db.service.js';
import { matches, tournaments, tournamentParticipants, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

interface ActiveMatch {
  matchId: string;
  chess: Chess;
  whiteId: string;
  blackId: string;
  whiteEmail: string;
  blackEmail: string;
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveTimestamp: number;
  turn: 'w' | 'b';
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private activeMatches: Map<string, ActiveMatch> = new Map();

  constructor(private readonly db: DbService) {}

  async loadMatch(matchId: string): Promise<ActiveMatch | null> {
    if (this.activeMatches.has(matchId)) {
      return this.activeMatches.get(matchId)!;
    }

    const [match] = await this.db.db.select().from(matches).where(eq(matches.id, matchId));
    if (!match || match.status !== 'ACTIVE') return null;

    const [tournament] = await this.db.db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId));
    
    const initialTimeMs = tournament.timeControlInitialMinutes * 60 * 1000;

    const chess = new Chess();
    if (match.pgn) {
      chess.loadPgn(match.pgn);
    }

    const [whiteUser] = await this.db.db.select().from(users).where(eq(users.id, match.whitePlayerId));
    const [blackUser] = await this.db.db.select().from(users).where(eq(users.id, match.blackPlayerId));

    const activeMatch: ActiveMatch = {
      matchId,
      chess,
      whiteId: match.whitePlayerId,
      blackId: match.blackPlayerId,
      whiteEmail: whiteUser?.email || 'Unknown',
      blackEmail: blackUser?.email || 'Unknown',
      whiteTimeMs: initialTimeMs, // In real life, calculate remaining time from DB history
      blackTimeMs: initialTimeMs,
      lastMoveTimestamp: Date.now(),
      turn: chess.turn(),
    };

    this.activeMatches.set(matchId, activeMatch);
    return activeMatch;
  }

  getGameState(matchId: string) {
    const active = this.activeMatches.get(matchId);
    if (!active) return null;
    return {
      fen: active.chess.fen(),
      pgn: active.chess.pgn(),
      whiteTimeMs: active.whiteTimeMs,
      blackTimeMs: active.blackTimeMs,
      turn: active.turn,
      lastMoveTimestamp: active.lastMoveTimestamp,
      whitePlayerId: active.whiteId,
      blackPlayerId: active.blackId,
      whiteEmail: active.whiteEmail,
      blackEmail: active.blackEmail,
    };
  }

  async handleMove(userId: string, matchId: string, from: string, to: string, promotion?: string) {
    const active = this.activeMatches.get(matchId);
    if (!active) throw new Error('Match not active');

    const isWhite = active.whiteId === userId;
    const isBlack = active.blackId === userId;
    
    if (active.turn === 'w' && !isWhite) throw new Error('Not your turn');
    if (active.turn === 'b' && !isBlack) throw new Error('Not your turn');

    // Time calculation
    const now = Date.now();
    const elapsed = now - active.lastMoveTimestamp;
    
    if (active.turn === 'w') {
      active.whiteTimeMs -= elapsed;
      if (active.whiteTimeMs <= 0) {
        return this.endGame(matchId, 'BLACK_WIN', 'TIMEOUT');
      }
    } else {
      active.blackTimeMs -= elapsed;
      if (active.blackTimeMs <= 0) {
        return this.endGame(matchId, 'WHITE_WIN', 'TIMEOUT');
      }
    }

    try {
      active.chess.move({ from, to, promotion });
    } catch (e) {
      throw new Error('Invalid move');
    }

    active.turn = active.chess.turn();
    active.lastMoveTimestamp = Date.now();

    // Check end conditions
    if (active.chess.isCheckmate()) {
      return this.endGame(matchId, isWhite ? 'WHITE_WIN' : 'BLACK_WIN', 'CHECKMATE');
    } else if (active.chess.isDraw() || active.chess.isStalemate()) {
      return this.endGame(matchId, 'DRAW', 'STALEMATE'); // Simplifying draw reasons for MVP
    }

    return { type: 'move', state: this.getGameState(matchId) };
  }

  async resign(userId: string, matchId: string) {
    const active = this.activeMatches.get(matchId);
    if (!active) return null;
    
    const isWhite = active.whiteId === userId;
    return this.endGame(matchId, isWhite ? 'BLACK_WIN' : 'WHITE_WIN', 'RESIGNATION');
  }

  private async endGame(matchId: string, result: 'WHITE_WIN' | 'BLACK_WIN' | 'DRAW', reason: 'CHECKMATE' | 'TIMEOUT' | 'RESIGNATION' | 'STALEMATE') {
    const active = this.activeMatches.get(matchId);
    if (!active) return null;

    const pgn = active.chess.pgn();
    
    await this.db.db.update(matches).set({
      status: 'COMPLETED',
      result,
      terminationReason: reason,
      pgn,
      endedAt: new Date(),
    }).where(eq(matches.id, matchId));

    // Update leaderboard points
    const [match] = await this.db.db.select().from(matches).where(eq(matches.id, matchId));
    let whitePoints = result === 'WHITE_WIN' ? 1 : result === 'DRAW' ? 0.5 : 0;
    let blackPoints = result === 'BLACK_WIN' ? 1 : result === 'DRAW' ? 0.5 : 0;

    const incrementPoints = async (userId: string, pts: number) => {
      if (pts > 0) {
        const [tp] = await this.db.db.select().from(tournamentParticipants)
          .where(
            and(
              eq(tournamentParticipants.userId, userId),
              eq(tournamentParticipants.tournamentId, match.tournamentId)
            )
          );
        if (tp) {
          await this.db.db.update(tournamentParticipants)
            .set({ points: tp.points + pts })
            .where(
              and(
                eq(tournamentParticipants.userId, userId),
                eq(tournamentParticipants.tournamentId, match.tournamentId)
              )
            );
        }
      }
    };

    await incrementPoints(active.whiteId, whitePoints);
    await incrementPoints(active.blackId, blackPoints);

    this.activeMatches.delete(matchId);

    return {
      type: 'end',
      winnerId: result === 'WHITE_WIN' ? active.whiteId : result === 'BLACK_WIN' ? active.blackId : null,
      reason,
      pgn
    };
  }
}
