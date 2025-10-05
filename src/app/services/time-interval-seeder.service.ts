import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeIntervalEntity, TimeInterval } from '../entities/market-data-interval.entity';

@Injectable()
export class TimeIntervalSeederService implements OnModuleInit {
  private readonly logger = new Logger(TimeIntervalSeederService.name);

  constructor(
    @InjectRepository(TimeIntervalEntity)
    private timeIntervalRepository: Repository<TimeIntervalEntity>,
  ) {}

  async onModuleInit() {
    // Automatically seed time intervals on startup
    try {
      const validation = await this.validateAllIntervalsExist();
      
      if (!validation.valid) {
        this.logger.log(`⚠️ Missing intervals detected: ${validation.missing.join(', ')}`);
        this.logger.log('🔧 Auto-seeding time intervals...');
        await this.seedAllTimeIntervals();
      } else {
        this.logger.log(`✅ All ${validation.existing.length} time intervals already exist`);
      }
    } catch (error) {
      this.logger.error('❌ Error during time interval auto-seeding:', error);
    }
  }

  /**
   * Seed all time intervals - Only add missing intervals (smart seeding)
   */
  async seedAllTimeIntervals(): Promise<void> {
    try {
      this.logger.log('🕐 Starting smart time interval seeding...');

      // Get existing intervals
      const existingIntervals = await this.timeIntervalRepository.find({
        select: ['interval'],
      });
      const existingValues = existingIntervals.map(i => i.interval);

      // Add only missing intervals
      const allIntervals = this.getAllIntervalData();
      const missingIntervals = allIntervals.filter(interval => 
        !existingValues.includes(interval.interval)
      );

      if (missingIntervals.length === 0) {
        this.logger.log('✅ All time intervals already exist');
        return;
      }

      let successCount = 0;
      for (const intervalData of missingIntervals) {
        try {
          const interval = this.timeIntervalRepository.create(intervalData);
          await this.timeIntervalRepository.save(interval);
          successCount++;
          this.logger.log(`✅ Added missing interval: ${intervalData.interval} (${intervalData.name})`);
        } catch (error) {
          this.logger.error(`❌ Error adding interval ${intervalData.interval}:`, error);
        }
      }

      this.logger.log(`✅ Successfully seeded ${successCount}/${missingIntervals.length} missing time intervals`);
    } catch (error) {
      this.logger.error('❌ Error seeding time intervals:', error);
      throw error;
    }
  }

  /**
   * Force reseed all intervals - Clear existing and add all required intervals
   */
  async forceReseedAllIntervals(): Promise<void> {
    try {
      this.logger.log('🕐 Starting FORCE reseed of all time intervals...');

      // Clear all existing intervals
      await this.clearAllIntervals();

      // Add all required intervals
      const intervals = this.getAllIntervalData();
      let successCount = 0;

      for (const intervalData of intervals) {
        try {
          const interval = this.timeIntervalRepository.create(intervalData);
          await this.timeIntervalRepository.save(interval);
          successCount++;
          this.logger.debug(`✅ Added interval: ${intervalData.interval} (${intervalData.name})`);
        } catch (error) {
          this.logger.error(`❌ Error adding interval ${intervalData.interval}:`, error);
        }
      }

      this.logger.log(`✅ Successfully force reseeded ${successCount}/${intervals.length} time intervals`);
    } catch (error) {
      this.logger.error('❌ Error force reseeding time intervals:', error);
      throw error;
    }
  }

  /**
   * Clear all existing time intervals
   */
  async clearAllIntervals(): Promise<void> {
    try {
      const deleteResult = await this.timeIntervalRepository.delete({});
      this.logger.log(`🗑️ Cleared ${deleteResult.affected || 0} existing time intervals`);
    } catch (error) {
      this.logger.error('❌ Error clearing time intervals:', error);
      throw error;
    }
  }

  /**
   * Get all interval data for seeding
   */
  private getAllIntervalData(): Array<{
    interval: TimeInterval;
    name: string;
    description: string;
    durationMinutes: number;
    isActive: boolean;
    sortOrder: number;
  }> {
    return [
      {
        interval: TimeInterval.ONE_MINUTE,
        name: '1 Minute',
        description: '1-minute candlestick data for scalping and high-frequency analysis',
        durationMinutes: 1,
        isActive: true,
        sortOrder: 1,
      },
      {
        interval: TimeInterval.THREE_MINUTES,
        name: '3 Minutes',
        description: '3-minute candlestick data for short-term trading strategies',
        durationMinutes: 3,
        isActive: true,
        sortOrder: 2,
      },
      {
        interval: TimeInterval.FIVE_MINUTES,
        name: '5 Minutes',
        description: '5-minute candlestick data for intraday trading and quick scalps',
        durationMinutes: 5,
        isActive: true,
        sortOrder: 3,
      },
      {
        interval: TimeInterval.TEN_MINUTES,
        name: '10 Minutes',
        description: '10-minute candlestick data for medium-term intraday analysis',
        durationMinutes: 10,
        isActive: true,
        sortOrder: 4,
      },
      {
        interval: TimeInterval.FIFTEEN_MINUTES,
        name: '15 Minutes',
        description: '15-minute candlestick data for standard intraday trading',
        durationMinutes: 15,
        isActive: true,
        sortOrder: 5,
      },
      {
        interval: TimeInterval.THIRTY_MINUTES,
        name: '30 Minutes',
        description: '30-minute candlestick data for swing trading and trend analysis',
        durationMinutes: 30,
        isActive: true,
        sortOrder: 6,
      },
      {
        interval: TimeInterval.ONE_HOUR,
        name: '1 Hour',
        description: '1-hour candlestick data for hourly trend analysis',
        durationMinutes: 60,
        isActive: true,
        sortOrder: 7,
      },
      {
        interval: TimeInterval.TWO_HOURS,
        name: '2 Hours',
        description: '2-hour candlestick data for extended session analysis',
        durationMinutes: 120,
        isActive: true,
        sortOrder: 8,
      },
      {
        interval: TimeInterval.FOUR_HOURS,
        name: '4 Hours',
        description: '4-hour candlestick data for multi-session trend analysis',
        durationMinutes: 240,
        isActive: true,
        sortOrder: 9,
      },
      {
        interval: TimeInterval.ONE_DAY,
        name: '1 Day',
        description: 'Daily candlestick data for swing trading and position analysis',
        durationMinutes: 1440,
        isActive: true,
        sortOrder: 10,
      },
      {
        interval: TimeInterval.SEVEN_DAYS,
        name: '1 Week',
        description: 'Weekly candlestick data for long-term trend and position analysis',
        durationMinutes: 10080,
        isActive: true,
        sortOrder: 11,
      },
      {
        interval: TimeInterval.ONE_MONTH,
        name: '1 Month',
        description: 'Monthly candlestick data for long-term investment analysis',
        durationMinutes: 43200, // Approximate (30 days)
        isActive: true,
        sortOrder: 12,
      },
    ];
  }

  /**
   * Get statistics about seeded intervals
   */
  async getIntervalStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    intervals: Array<{
      interval: string;
      name: string;
      durationMinutes: number;
      isActive: boolean;
    }>;
  }> {
    try {
      const allIntervals = await this.timeIntervalRepository.find({
        order: { sortOrder: 'ASC' },
      });

      const active = allIntervals.filter(i => i.isActive).length;
      const inactive = allIntervals.filter(i => !i.isActive).length;

      return {
        total: allIntervals.length,
        active,
        inactive,
        intervals: allIntervals.map(i => ({
          interval: i.interval,
          name: i.name,
          durationMinutes: i.durationMinutes,
          isActive: i.isActive,
        })),
      };
    } catch (error) {
      this.logger.error('Error getting interval stats:', error);
      throw error;
    }
  }

  /**
   * Update interval status (activate/deactivate)
   */
  async updateIntervalStatus(interval: TimeInterval, isActive: boolean): Promise<void> {
    try {
      const result = await this.timeIntervalRepository.update(
        { interval },
        { isActive, updatedAt: new Date() }
      );

      if (result.affected && result.affected > 0) {
        this.logger.log(`✅ Updated interval ${interval} status to ${isActive ? 'active' : 'inactive'}`);
      } else {
        this.logger.warn(`⚠️ No interval found with value: ${interval}`);
      }
    } catch (error) {
      this.logger.error(`Error updating interval ${interval} status:`, error);
      throw error;
    }
  }

  /**
   * Get active intervals only
   */
  async getActiveIntervals(): Promise<TimeIntervalEntity[]> {
    try {
      return await this.timeIntervalRepository.find({
        where: { isActive: true },
        order: { sortOrder: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Error getting active intervals:', error);
      throw error;
    }
  }

  /**
   * Validate that all required intervals exist
   */
  async validateAllIntervalsExist(): Promise<{
    valid: boolean;
    missing: string[];
    existing: string[];
  }> {
    try {
      const requiredIntervals = [
        TimeInterval.ONE_MINUTE,
        TimeInterval.THREE_MINUTES,
        TimeInterval.FIVE_MINUTES,
        TimeInterval.TEN_MINUTES,
        TimeInterval.FIFTEEN_MINUTES,
        TimeInterval.THIRTY_MINUTES,
        TimeInterval.ONE_HOUR,
        TimeInterval.TWO_HOURS,
        TimeInterval.FOUR_HOURS,
        TimeInterval.ONE_DAY,
        TimeInterval.SEVEN_DAYS,
        TimeInterval.ONE_MONTH,
      ];

      const existingIntervals = await this.timeIntervalRepository.find({
        select: ['interval'],
      });

      const existingValues = existingIntervals.map(i => i.interval);
      const missing = requiredIntervals.filter(req => !existingValues.includes(req));

      return {
        valid: missing.length === 0,
        missing,
        existing: existingValues,
      };
    } catch (error) {
      this.logger.error('Error validating intervals:', error);
      throw error;
    }
  }
}
