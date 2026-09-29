import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

@Injectable()
export class DbService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    public readonly db: NodePgDatabase<typeof schema>,
  ) {}
}
