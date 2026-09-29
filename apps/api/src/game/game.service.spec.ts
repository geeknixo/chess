import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service.js';
import { DbService } from '../db/db.service.js';

describe('GameService', () => {
  let service: GameService;
  let mockDbService: any;

  beforeEach(async () => {
    mockDbService = {
      db: {
        update: () => mockDbService.db,
        set: () => mockDbService.db,
        where: async () => [{ id: 'match1' }],
        insert: () => mockDbService.db,
        values: () => mockDbService.db,
        onConflictDoUpdate: async () => [],
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: DbService, useValue: mockDbService },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Turn validation', () => {
    it('should throw if player moves out of turn', async () => {
      // Mock active match
      service['activeMatches'].set('match1', {
        matchId: 'match1',
        whiteId: 'user-white',
        blackId: 'user-black',
        whiteEmail: 'white@test.com',
        blackEmail: 'black@test.com',
        chess: { move: () => {} } as any,
        whiteTimeMs: 50000,
        blackTimeMs: 50000,
        lastMoveTimestamp: Date.now(),
        turn: 'w',
      });

      // Try black moving when turn is 'w'
      await expect(
        service.handleMove('user-black', 'match1', 'e7', 'e5', 'q'),
      ).rejects.toThrow('Not your turn');
    });
  });

  describe('Leaderboard Scoring', () => {
    it('should call endGame on resign', async () => {
      let endGameCalled = false;
      (service as any).endGame = async () => { endGameCalled = true; };
      await service.resign('user-black', 'match1');
      expect(endGameCalled).toBe(true);
    });
  });
});
