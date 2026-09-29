import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' }); // Adjust path based on execution location
dotenv.config();

async function main() {
  console.log('Seeding database...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/chess',
  });
  const db = drizzle(pool, { schema });

  const passwordHash = await bcrypt.hash('password123', 10);

  // Seed 1 coach
  await db.insert(schema.users).values({
    email: 'coach@kingdomofchess.com',
    passwordHash,
    role: 'COACH',
  }).onConflictDoNothing();

  // Seed 4 students
  for (let i = 1; i <= 4; i++) {
    await db.insert(schema.users).values({
      email: `student${i}@kingdomofchess.com`,
      passwordHash,
      role: 'STUDENT',
    }).onConflictDoNothing();
  }

  console.log('Seeding completed! Coach and 4 students added.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
