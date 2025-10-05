import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeIntervalEntity, TimeInterval } from '../entities/market-data-interval.entity';

@Injectable()
export class IntervalSeederService {
  private readonly logger = new Logger(IntervalSeederService.name);

  constructor(
    @InjectRepository(TimeIntervalEntity)
    private intervalRepository: Repository<TimeIntervalEntity>,
  ) {}

  /**
   * Complete intervals configuration matching InMemoryCandleService requirements
   */
  private readonly intervalConfigs = [
    {
      interval: TimeInterval.ONE_MINUTE,
      name: '1 Minute',
      description: 'Real-time 1-minute candles for scalping and tick-level analysis',
      durationMinutes: 1,
      sortOrder: 1,
    },
    {
      interval: TimeInterval.THREE_MINUTES,
      name: '3 Minutes',
      description: '3-minute candles for short-term trend analysis',
      durationMinutes: 3,
      sortOrder: 2,
    },
    {
      interval: TimeInterval.FIVE_MINUTES,
      name: '5 Minutes',
      description: '5-minute candles for intraday trading strategies',
      durationMinutes: 5,
      sortOrder: 3,
    },
    {
      interval: TimeInterval.TEN_MINUTES,
      name: '10 Minutes',
      description: '10-minute candles for medium-term intraday analysis',
      durationMinutes: 10,
      sortOrder: 4,
    },
    {
      interval: TimeInterval.FIFTEEN_MINUTES,
      name: '15 Minutes',
      description: '15-minute candles for swing trading and pattern recognition',
      durationMinutes: 15,
      sortOrder: 5,
    },
    {
      interval: TimeInterval.THIRTY_MINUTES,
      name: '30 Minutes',
      description: '30-minute candles for hourly trend analysis',
      durationMinutes: 30,
      sortOrder: 6,
    },
    {
      interval: TimeInterval.ONE_HOUR,
      name: '1 Hour',
      description: 'Hourly candles for daily trend and support/resistance analysis',
      durationMinutes: 60,
      sortOrder: 7,
    },
    {
      interval: TimeInterval.TWO_HOURS,
      name: '2 Hours',
      description: '2-hour candles for extended intraday analysis',
      durationMinutes: 120,
      sortOrder: 8,
    },
    {
      interval: TimeInterval.FOUR_HOURS,
      name: '4 Hours',
      description: '4-hour candles for daily and weekly trend analysis',
      durationMinutes: 240,
      sortOrder: 9,
    },
    {
      interval: TimeInterval.ONE_DAY,
      name: '1 Day',
      description: 'Daily candles for long-term trend and fundamental analysis',
      durationMinutes: 1440,
      sortOrder: 10,
    },
    {
      interval: TimeInterval.SEVEN_DAYS,
      name: '7 Days (Weekly)',
      description: 'Weekly candles for long-term trend and cycle analysis',
      durationMinutes: 10080,
      sortOrder: 11,
    },
    {
      interval: TimeInterval.ONE_MONTH,
      name: '1 Month',
      description: 'Monthly candles for macro trend and investment analysis',
      durationMinutes: 43200,
      sortOrder: 12,
    },
  ];

  /**
   * Completely reset and seed all intervals
   */
  async resetAndSeedAllIntervals(): Promise<{
    cleared: number;
    seeded: number;
    intervals: string[];
  }> {
    try {
      this.logger.log('🗑️ Starting complete interval reset and seeding...');

      // 1. Clear all existing intervals
      const deleteResult = await this.intervalRepository.delete({});
      const clearedCount = deleteResult.affected || 0;
      this.logger.log(`🗑️ Cleared ${clearedCount} existing intervals`);

      // 2. Seed all required intervals
      const seededIntervals: string[] = [];
      let seededCount = 0;

      for (const config of this.intervalConfigs) {
        try {
          const intervalEntity = this.intervalRepository.create({
            interval: config.interval,
            name: config.name,
            description: config.description,
            durationMinutes: config.durationMinutes,
            sortOrder: config.sortOrder,
            isActive: true,
          });

          await this.intervalRepository.save(intervalEntity);
          seededIntervals.push(config.interval);
          seededCount++;
          
          this.logger.debug(`✅ Seeded interval: ${config.interval} (${config.name})`);
        } catch (error) {
          this.logger.error(`❌ Failed to seed interval ${config.interval}:`, error);
        }
      }

      this.logger.log(`✅ Successfully seeded ${seededCount} intervals`);
      this.logger.log(`📊 Seeded intervals: ${seededIntervals.join(', ')}`);

      return {
        cleared: clearedCount,
        seeded: seededCount,
        intervals: seededIntervals,
      };

    } catch (error) {
      this.logger.error('❌ Error during interval reset and seeding:', error);
      throw error;
    }
  }

  /**
   * Seed only missing intervals (safe method)
   */
  async seedMissingIntervals(): Promise<{
    existing: number;
    seeded: number;
    skipped: number;
    newIntervals: string[];
  }> {
    try {
      this.logger.log('🌱 Starting incremental interval seeding...');

      const existingIntervals = await this.intervalRepository.find({
        select: ['interval']
      });
      const existingValues = existingIntervals.map(i => i.interval);
      
      this.logger.log(`📊 Found ${existingValues.length} existing intervals: ${existingValues.join(', ')}`);

      const newIntervals: string[] = [];
      let seededCount = 0;
      let skippedCount = 0;

      for (const config of this.intervalConfigs) {
        if (existingValues.includes(config.interval)) {
          skippedCount++;
          this.logger.debug(`⏭️ Skipped existing interval: ${config.interval}`);
          continue;
        }

        try {
          const intervalEntity = this.intervalRepository.create({
            interval: config.interval,
            name: config.name,
            description: config.description,
            durationMinutes: config.durationMinutes,
            sortOrder: config.sortOrder,
            isActive: true,
          });

          await this.intervalRepository.save(intervalEntity);
          newIntervals.push(config.interval);
          seededCount++;
          
          this.logger.log(`✅ Added new interval: ${config.interval} (${config.name})`);
        } catch (error) {
          this.logger.error(`❌ Failed to seed interval ${config.interval}:`, error);
        }
      }

      this.logger.log(`✅ Incremental seeding complete. Added ${seededCount} new intervals`);
      if (newIntervals.length > 0) {
        this.logger.log(`🆕 New intervals: ${newIntervals.join(', ')}`);
      }

      return {
        existing: existingValues.length,
        seeded: seededCount,
        skipped: skippedCount,
        newIntervals,
      };

    } catch (error) {
      this.logger.error('❌ Error during incremental interval seeding:', error);
      throw error;
    }
  }

  /**
   * Validate that all required intervals exist
   */
  async validateIntervals(): Promise<{
    isValid: boolean;
    existing: string[];
    missing: string[];
    extra: string[];
  }> {
    try {
      const requiredIntervals = this.intervalConfigs.map(c => c.interval);
      const existingIntervals = await this.intervalRepository.find({
        select: ['interval']
      });
      const existingValues = existingIntervals.map(i => i.interval);

      const missing = requiredIntervals.filter(req => !existingValues.includes(req));
      const extra = existingValues.filter(exist => !requiredIntervals.includes(exist));
      const isValid = missing.length === 0 && extra.length === 0;

      this.logger.log(`🔍 Interval validation:`);
      this.logger.log(`   Required: ${requiredIntervals.length} intervals`);
      this.logger.log(`   Existing: ${existingValues.length} intervals`);
      this.logger.log(`   Missing: ${missing.length} intervals ${missing.length > 0 ? `(${missing.join(', ')})` : ''}`);
      this.logger.log(`   Extra: ${extra.length} intervals ${extra.length > 0 ? `(${extra.join(', ')})` : ''}`);
      this.logger.log(`   Status: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

      return {
        isValid,
        existing: existingValues,
        missing,
        extra,
      };

    } catch (error) {
      this.logger.error('❌ Error during interval validation:', error);
      throw error;
    }
  }

  /**
   * Get all intervals with their configurations
   */
  async getAllIntervals(): Promise<TimeIntervalEntity[]> {
    try {
      return await this.intervalRepository.find({
        order: { sortOrder: 'ASC' }
      });
    } catch (error) {
      this.logger.error('❌ Error fetching intervals:', error);
      throw error;
    }
  }

  /**
   * Get interval statistics
   */
  async getIntervalStats(): Promise<{
    totalIntervals: number;
    activeIntervals: number;
    inactiveIntervals: number;
    intervalBreakdown: Record<string, { name: string; active: boolean; order: number }>;
  }> {
    try {
      const intervals = await this.getAllIntervals();
      const activeIntervals = intervals.filter(i => i.isActive);
      const inactiveIntervals = intervals.filter(i => !i.isActive);
      
      const intervalBreakdown: Record<string, { name: string; active: boolean; order: number }> = {};
      intervals.forEach(interval => {
        intervalBreakdown[interval.interval] = {
          name: interval.name,
          active: interval.isActive,
          order: interval.sortOrder,
        };
      });

      return {
        totalIntervals: intervals.length,
        activeIntervals: activeIntervals.length,
        inactiveIntervals: inactiveIntervals.length,
        intervalBreakdown,
      };

    } catch (error) {
      this.logger.error('❌ Error getting interval stats:', error);
      throw error;
    }
  }
}
