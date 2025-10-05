import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from '../entities/server.entity';
import { WebSocket } from '../entities/websocket.entity';
import { Instrument } from '../entities/instrument.entity';
import { TimeIntervalEntity } from '../entities/market-data-interval.entity';
import { Candles1m } from '../entities/candles-1m.entity';
import { Candles3m } from '../entities/candles-3m.entity';
import { Candles5m } from '../entities/candles-5m.entity';
import { Candles10m } from '../entities/candles-10m.entity';
import { Candles15m } from '../entities/candles-15m.entity';
import { Candles30m } from '../entities/candles-30m.entity';
import { Candles1h } from '../entities/candles-1h.entity';
import { Candles2h } from '../entities/candles-2h.entity';
import { Candles4h } from '../entities/candles-4h.entity';
import { Candles1d } from '../entities/candles-1d.entity';
import { Candles1w } from '../entities/candles-1w.entity';
import { CandlesMonth } from '../entities/candles-month.entity';
import { TemporaryCandle } from '../entities/temporary-candle.entity';

/**
 * 🧹 DATABASE CLEANUP SERVICE
 * 
 * ⚠️ DANGER: This service will clean ALL database tables on module initialization
 * 
 * Use this service when you want to:
 * 1. Clean the server database before restoring a local dump
 * 2. Reset all data for a fresh start
 * 3. Prepare the database for production deployment
 * 
 * HOW TO USE:
 * 1. Enable this service in app.module.ts
 * 2. Deploy to server - it will auto-clean on startup
 * 3. Disable this service after cleanup
 * 4. Restore your database dump
 */

@Injectable()
export class DatabaseCleanupService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseCleanupService.name);

  constructor(
    @InjectRepository(Server)
    private serverRepository: Repository<Server>,
    @InjectRepository(WebSocket)
    private websocketRepository: Repository<WebSocket>,
    @InjectRepository(Instrument)
    private instrumentRepository: Repository<Instrument>,
    @InjectRepository(TimeIntervalEntity)
    private timeIntervalRepository: Repository<TimeIntervalEntity>,
    @InjectRepository(Candles1m)
    private candles1mRepository: Repository<Candles1m>,
    @InjectRepository(Candles3m)
    private candles3mRepository: Repository<Candles3m>,
    @InjectRepository(Candles5m)
    private candles5mRepository: Repository<Candles5m>,
    @InjectRepository(Candles10m)
    private candles10mRepository: Repository<Candles10m>,
    @InjectRepository(Candles15m)
    private candles15mRepository: Repository<Candles15m>,
    @InjectRepository(Candles30m)
    private candles30mRepository: Repository<Candles30m>,
    @InjectRepository(Candles1h)
    private candles1hRepository: Repository<Candles1h>,
    @InjectRepository(Candles2h)
    private candles2hRepository: Repository<Candles2h>,
    @InjectRepository(Candles4h)
    private candles4hRepository: Repository<Candles4h>,
    @InjectRepository(Candles1d)
    private candles1dRepository: Repository<Candles1d>,
    @InjectRepository(Candles1w)
    private candles1wRepository: Repository<Candles1w>,
    @InjectRepository(CandlesMonth)
    private candlesMonthRepository: Repository<CandlesMonth>,
    @InjectRepository(TemporaryCandle)
    private temporaryCandleRepository: Repository<TemporaryCandle>,
  ) {}

  /**
   * 🚨 AUTO-CLEANUP ON MODULE INITIALIZATION
   * This will automatically clean all database tables when the service starts
   */
  async onModuleInit() {
    this.logger.warn('🚨 DATABASE CLEANUP SERVICE STARTED - CLEANING ALL TABLES...');
    
    try {
      await this.cleanAllTables();
      this.logger.log('✅ Database cleanup completed successfully!');
      this.logger.log('💡 Now you can restore your database dump.');
      
    } catch (error) {
      this.logger.error('❌ Error during database cleanup:', error);
      throw error;
    }
  }

  /**
   * 🧹 CLEAN ALL DATABASE TABLES
   * Removes all data from all tables in proper order (respecting foreign key constraints)
   */
  async cleanAllTables(): Promise<void> {
    this.logger.warn('🚨 DANGER: Starting complete database cleanup...');
    
    let totalRowsDeleted = 0;

    try {
      // Step 1: Clean all candle tables (no foreign key dependencies)
      totalRowsDeleted += await this.cleanCandleTables();

      // Step 2: Clean temporary tables
      totalRowsDeleted += await this.cleanTemporaryTables();

      // Step 3: Clean instruments (depends on websockets and servers)
      totalRowsDeleted += await this.cleanInstruments();

      // Step 4: Clean websockets (depends on servers)
      totalRowsDeleted += await this.cleanWebSockets();

      // Step 5: Clean time intervals (no dependencies)
      totalRowsDeleted += await this.cleanTimeIntervals();

      // Step 6: Clean servers (base table)
      totalRowsDeleted += await this.cleanServers();

      this.logger.log(`\n🎉 ===== CLEANUP SUMMARY =====`);
      this.logger.log(`🗑️ Total Rows Deleted: ${totalRowsDeleted}`);
      this.logger.log(`✅ Database is now clean and ready for dump restoration`);
      
    } catch (error) {
      this.logger.error('❌ Critical error during database cleanup:', error);
      throw error;
    }
  }

  /**
   * Clean all candle tables
   */
  private async cleanCandleTables(): Promise<number> {
    this.logger.log('🕯️ Cleaning candle tables...');
    let totalDeleted = 0;

    const candleTables = [
      { name: '1-minute', repo: this.candles1mRepository },
      { name: '3-minute', repo: this.candles3mRepository },
      { name: '5-minute', repo: this.candles5mRepository },
      { name: '10-minute', repo: this.candles10mRepository },
      { name: '15-minute', repo: this.candles15mRepository },
      { name: '30-minute', repo: this.candles30mRepository },
      { name: '1-hour', repo: this.candles1hRepository },
      { name: '2-hour', repo: this.candles2hRepository },
      { name: '4-hour', repo: this.candles4hRepository },
      { name: '1-day', repo: this.candles1dRepository },
      { name: '1-week', repo: this.candles1wRepository },
      { name: 'monthly', repo: this.candlesMonthRepository },
    ];

    for (const table of candleTables) {
      try {
        // Count records before clearing
        const countBefore = await table.repo.count();
        // Use clear() method to delete all records from the table
        await table.repo.clear();
        totalDeleted += countBefore;
        this.logger.log(`   🗑️ Cleaned ${table.name} candles: ${countBefore} rows`);
      } catch (error) {
        this.logger.error(`   ❌ Error cleaning ${table.name} candles:`, error.message);
      }
    }

    this.logger.log(`✅ Candle tables cleanup completed. Total deleted: ${totalDeleted}`);
    return totalDeleted;
  }

  /**
   * Clean temporary tables
   */
  private async cleanTemporaryTables(): Promise<number> {
    this.logger.log('📊 Cleaning temporary tables...');
    let totalDeleted = 0;

    try {
      const temporaryCandleCount = await this.temporaryCandleRepository.count();
      await this.temporaryCandleRepository.clear();
      totalDeleted += temporaryCandleCount;
      this.logger.log(`   🗑️ Cleaned temporary candles: ${temporaryCandleCount} rows`);
    } catch (error) {
      this.logger.error('   ❌ Error cleaning temporary candles:', error.message);
    }

    this.logger.log(`✅ Temporary tables cleanup completed. Total deleted: ${totalDeleted}`);
    return totalDeleted;
  }

  /**
   * Clean instruments
   */
  private async cleanInstruments(): Promise<number> {
    this.logger.log('📈 Cleaning instruments...');
    let totalDeleted = 0;

    try {
      totalDeleted = await this.instrumentRepository.count();
      await this.instrumentRepository.clear();
      this.logger.log(`   🗑️ Cleaned instruments: ${totalDeleted} rows`);
    } catch (error) {
      this.logger.error('   ❌ Error cleaning instruments:', error.message);
    }

    this.logger.log(`✅ Instruments cleanup completed. Total deleted: ${totalDeleted}`);
    return totalDeleted;
  }

  /**
   * Clean websockets
   */
  private async cleanWebSockets(): Promise<number> {
    this.logger.log('🔌 Cleaning websockets...');
    let totalDeleted = 0;

    try {
      totalDeleted = await this.websocketRepository.count();
      await this.websocketRepository.clear();
      this.logger.log(`   🗑️ Cleaned websockets: ${totalDeleted} rows`);
    } catch (error) {
      this.logger.error('   ❌ Error cleaning websockets:', error.message);
    }

    this.logger.log(`✅ WebSockets cleanup completed. Total deleted: ${totalDeleted}`);
    return totalDeleted;
  }

  /**
   * Clean time intervals
   */
  private async cleanTimeIntervals(): Promise<number> {
    this.logger.log('⏰ Cleaning time intervals...');
    let totalDeleted = 0;

    try {
      totalDeleted = await this.timeIntervalRepository.count();
      await this.timeIntervalRepository.clear();
      this.logger.log(`   🗑️ Cleaned time intervals: ${totalDeleted} rows`);
    } catch (error) {
      this.logger.error('   ❌ Error cleaning time intervals:', error.message);
    }

    this.logger.log(`✅ Time intervals cleanup completed. Total deleted: ${totalDeleted}`);
    return totalDeleted;
  }

  /**
   * Clean servers
   */
  private async cleanServers(): Promise<number> {
    this.logger.log('🖥️ Cleaning servers...');
    let totalDeleted = 0;

    try {
      totalDeleted = await this.serverRepository.count();
      await this.serverRepository.clear();
      this.logger.log(`   🗑️ Cleaned servers: ${totalDeleted} rows`);
    } catch (error) {
      this.logger.error('   ❌ Error cleaning servers:', error.message);
    }

    this.logger.log(`✅ Servers cleanup completed. Total deleted: ${totalDeleted}`);
    return totalDeleted;
  }

  /**
   * 🔧 MANUAL CLEANUP TRIGGER
   * Use this method to manually trigger cleanup from external controllers
   */
  async forceCleanup(): Promise<void> {
    this.logger.warn('🔧 Manual trigger: Force starting database cleanup...');
    await this.cleanAllTables();
  }

  /**
   * 📊 GET CLEANUP STATISTICS
   * Shows current row counts before cleanup
   */
  async getCleanupStats(): Promise<{
    servers: number;
    websockets: number;
    instruments: number;
    timeIntervals: number;
    totalCandleRows: number;
    temporaryCandles: number;
  }> {
    try {
      const servers = await this.serverRepository.count();
      const websockets = await this.websocketRepository.count();
      const instruments = await this.instrumentRepository.count();
      const timeIntervals = await this.timeIntervalRepository.count();
      const temporaryCandles = await this.temporaryCandleRepository.count();

      // Count all candle tables
      const candleCounts = await Promise.all([
        this.candles1mRepository.count(),
        this.candles3mRepository.count(),
        this.candles5mRepository.count(),
        this.candles10mRepository.count(),
        this.candles15mRepository.count(),
        this.candles30mRepository.count(),
        this.candles1hRepository.count(),
        this.candles2hRepository.count(),
        this.candles4hRepository.count(),
        this.candles1dRepository.count(),
        this.candles1wRepository.count(),
        this.candlesMonthRepository.count(),
      ]);

      const totalCandleRows = candleCounts.reduce((sum, count) => sum + count, 0);

      return {
        servers,
        websockets,
        instruments,
        timeIntervals,
        totalCandleRows,
        temporaryCandles,
      };

    } catch (error) {
      this.logger.error('❌ Error getting cleanup stats:', error);
      throw error;
    }
  }
}
