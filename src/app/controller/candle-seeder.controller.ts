import { Controller, Get, Post, Delete } from '@nestjs/common';
import { CandleSeederService } from '../services/candle-seeder.service';

/**
 * 🚀 1-MINUTE CANDLE SEEDER CONTROLLER
 * 
 * Provides API endpoints for managing 1-minute candle seeding operations
 */
@Controller('candle-seeder')
export class CandleSeederController {
  constructor(private readonly candleSeederService: CandleSeederService) {}

  /**
   * 🔧 MANUAL TRIGGER - Force start 1-minute candle seeding
   * POST /candle-seeder/start
   */
  @Post('start')
  async startSeeding() {
    await this.candleSeederService.forceStart1mSeeding();
    return { 
      message: '🚀 1-minute candle seeding started successfully',
      status: 'started'
    };
  }

  /**
   * 📊 GET SEEDING STATISTICS
   * GET /candle-seeder/stats
   */
  @Get('stats')
  async getStats() {
    const stats = await this.candleSeederService.getSeedingStats();
    return {
      message: '📊 1-minute candle seeding statistics',
      data: stats
    };
  }

  /**
   * 🧪 TEST API CONNECTION
   * GET /candle-seeder/test
   */
  @Get('test')
  async testConnection() {
    await this.candleSeederService.testApiConnection();
    return {
      message: '🧪 API connection test completed (check logs for results)',
      status: 'tested'
    };
  }

  /**
   * 🧹 CHECK IF SEEDING IS NEEDED
   * GET /candle-seeder/check
   */
  @Get('check')
  async checkSeeding() {
    // We can't access private method directly, so we'll use the stats to determine
    const stats = await this.candleSeederService.getSeedingStats();
    const needsSeeding = stats.processedInstruments < stats.totalInstruments;
    
    return {
      message: '🧹 Seeding status check',
      needsSeeding,
      stats
    };
  }

  /**
   * 🚨 CLEAR ALL 1-MINUTE CANDLES (DANGEROUS!)
   * DELETE /candle-seeder/clear
   */
  @Delete('clear')
  async clearCandles() {
    await this.candleSeederService.clearAll1mCandles();
    return {
      message: '🚨 All 1-minute candles cleared from database',
      status: 'cleared',
      warning: 'This action cannot be undone!'
    };
  }
}
