import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

async function main() {
  console.log('Connecting to database to clear old data...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/chess',
  });
  const db = drizzle(pool, { schema });

  // Delete data in correct order to respect foreign keys (if any)
  console.log('Deleting matches...');
  await db.delete(schema.matches);
  console.log('Deleting matchmaking queue...');
  await db.delete(schema.matchmakingQueue);
  console.log('Deleting tournament participants...');
  await db.delete(schema.tournamentParticipants);
  console.log('Deleting tournaments...');
  await db.delete(schema.tournaments);
  
  // We do NOT delete users, so your coach and student accounts still work!
  
  console.log('✅ All old data cleared successfully! Your database is now fresh for the video recording.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
