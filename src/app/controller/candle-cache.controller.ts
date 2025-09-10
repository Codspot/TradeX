import { Controller, Get, Post } from '@nestjs/common';
import { InMemoryCandleService } from '../services/in-memory-candle.service';

@Controller('candle-cache')
export class CandleCacheController {
  constructor(private readonly inMemoryCandleService: InMemoryCandleService) {}

  @Get('stats')
  getCacheStats() {
    return this.inMemoryCandleService.getCacheStats();
  }

  @Post('force-sync')
  async forceSyncAll() {
    await this.inMemoryCandleService.forceSyncAll();
    return { message: 'All candles synced to database' };
  }
}
