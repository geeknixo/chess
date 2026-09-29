import { Global, Module } from '@nestjs/common';
import { dbProvider } from './db.provider.js';
import { DbService } from './db.service.js';

@Global()
@Module({
  providers: [dbProvider, DbService],
  exports: ['DATABASE_CONNECTION', DbService],
})
export class DbModule {}
