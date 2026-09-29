import { pgTable, uuid, varchar, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['COACH', 'STUDENT']);
export const tournamentStatusEnum = pgEnum('tournament_status', ['DRAFT', 'OPEN', 'ONGOING', 'COMPLETED']);
export const matchStatusEnum = pgEnum('match_status', ['ACTIVE', 'COMPLETED', 'ABANDONED']);
export const matchResultEnum = pgEnum('match_result', ['WHITE_WIN', 'BLACK_WIN', 'DRAW']);
export const terminationReasonEnum = pgEnum('termination_reason', ['CHECKMATE', 'RESIGNATION', 'TIMEOUT', 'STALEMATE', 'AGREEMENT']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: roleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tournaments = pgTable('tournaments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  timeControlInitialMinutes: integer('time_control_initial_minutes').notNull(),
  timeControlIncrementSeconds: integer('time_control_increment_seconds').notNull().default(0),
  status: tournamentStatusEnum('status').notNull().default('DRAFT'),
  startedAt: timestamp('started_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tournamentParticipants = pgTable('tournament_participants', {
  tournamentId: uuid('tournament_id').references(() => tournaments.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  points: integer('points').notNull().default(0),
});

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id).notNull(),
  whitePlayerId: uuid('white_player_id').references(() => users.id).notNull(),
  blackPlayerId: uuid('black_player_id').references(() => users.id).notNull(),
  status: matchStatusEnum('status').notNull().default('ACTIVE'),
  pgn: varchar('pgn', { length: 4096 }).default(''),
  result: matchResultEnum('result'),
  terminationReason: terminationReasonEnum('termination_reason'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
});

export const matchmakingQueue = pgTable('matchmaking_queue', {
  tournamentId: uuid('tournament_id').references(() => tournaments.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  participations: many(tournamentParticipants),
}));

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  participants: many(tournamentParticipants),
  matches: many(matches),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [matches.tournamentId],
    references: [tournaments.id],
  }),
  whitePlayer: one(users, {
    fields: [matches.whitePlayerId],
    references: [users.id],
  }),
  blackPlayer: one(users, {
    fields: [matches.blackPlayerId],
    references: [users.id],
  }),
}));
