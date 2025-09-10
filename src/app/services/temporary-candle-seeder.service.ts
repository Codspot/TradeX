import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TemporaryCandleService } from './temporary-candle.service';

@Injectable()
export class TemporaryCandleSeederService implements OnModuleInit {
  private readonly logger = new Logger(TemporaryCandleSeederService.name);

  constructor(
    private readonly temporaryCandleService: TemporaryCandleService,
  ) {}

  async onModuleInit() {
    // Add a delay to ensure all other seeders have completed
    setTimeout(async () => {
      await this.seedTemporaryCandles();
    }, 5000); // 5 second delay
  }

  /**
   * Main seeder method to generate temporary candles
   */
  async seedTemporaryCandles(): Promise<void> {
    try {
      this.logger.log('🚀 Starting temporary candle seeding process...');

      // Check if temporary candles already exist
      const stats = await this.temporaryCandleService.getTemporaryCandleStats();
      
      if (stats.totalCandles > 0) {
        this.logger.log(`ℹ️ Temporary candles already exist (${stats.totalCandles} candles). Skipping seeding.`);
        this.logger.log(`📊 Current stats: ${stats.uniqueInstruments} instruments across ${stats.intervals.length} intervals`);
        return;
      }

      this.logger.log('🕯️ No temporary candles found. Starting generation...');

      // Generate temporary candles for all instruments
      await this.temporaryCandleService.generateTemporaryCandlesForAllInstruments();

      // Get final stats
      const finalStats = await this.temporaryCandleService.getTemporaryCandleStats();
      
      this.logger.log('✅ Temporary candle seeding completed successfully!');
      this.logger.log(`📈 Generated ${finalStats.totalCandles} candles for ${finalStats.uniqueInstruments} instruments`);
      this.logger.log(`🎯 Coverage: ${finalStats.intervals.length} intervals (${finalStats.intervals.join(', ')})`);
      
      // Log breakdown by interval
      if (finalStats.intervalStats && Array.isArray(finalStats.intervalStats)) {
        this.logger.log('📊 Breakdown by interval:');
        finalStats.intervalStats.forEach((stat: any) => {
          this.logger.log(`   ${stat.interval}: ${stat.count} candles`);
        });
      }

    } catch (error) {
      this.logger.error('❌ Error during temporary candle seeding:', error.stack);
      // Don't throw the error to prevent application startup failure
    }
  }

  /**
   * Force regenerate all temporary candles (for manual use)
   */
  async forceRegenerateTemporaryCandles(): Promise<void> {
    try {
      this.logger.log('🔄 Force regenerating temporary candles...');
      
      // Clear existing candles first
      await this.temporaryCandleService.clearTemporaryCandles();
      
      // Generate new candles
      await this.temporaryCandleService.generateTemporaryCandlesForAllInstruments();
      
      // Get final stats
      const finalStats = await this.temporaryCandleService.getTemporaryCandleStats();
      
      this.logger.log('✅ Force regeneration completed successfully!');
      this.logger.log(`📈 Generated ${finalStats.totalCandles} candles for ${finalStats.uniqueInstruments} instruments`);
      
    } catch (error) {
      this.logger.error('❌ Error during force regeneration:', error.stack);
      throw error;
    }
  }

  /**
   * Check if temporary candles need regeneration
   */
  async checkTemporaryCandleHealth(): Promise<{ healthy: boolean; stats: any; recommendations: string[] }> {
    try {
      const stats = await this.temporaryCandleService.getTemporaryCandleStats();
      const recommendations: string[] = [];
      let healthy = true;

      // Check if we have any candles
      if (stats.totalCandles === 0) {
        healthy = false;
        recommendations.push('No temporary candles found. Run seeding process.');
      }

      // Check if we have all expected intervals
      const expectedIntervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];
      const missingIntervals = expectedIntervals.filter(interval => 
        !stats.intervalStats?.some((stat: any) => stat.interval === interval)
      );

      if (missingIntervals.length > 0) {
        healthy = false;
        recommendations.push(`Missing intervals: ${missingIntervals.join(', ')}`);
      }

      // Check if we have reasonable number of instruments
      if (stats.uniqueInstruments < 100) {
        healthy = false;
        recommendations.push(`Low instrument count: ${stats.uniqueInstruments}. Expected ~150 instruments.`);
      }

      // Add positive recommendations
      if (healthy) {
        recommendations.push('Temporary candle system is healthy and ready for use.');
        recommendations.push(`${stats.totalCandles} candles available across ${stats.uniqueInstruments} instruments.`);
      }

      return {
        healthy,
        stats,
        recommendations
      };

    } catch (error) {
      this.logger.error('❌ Error checking temporary candle health:', error.stack);
      return {
        healthy: false,
        stats: {},
        recommendations: ['Error checking health status. See logs for details.']
      };
    }
  }
}
