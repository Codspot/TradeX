import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemporaryCandle } from '../entities/temporary-candle.entity';
import { Instrument } from '../entities/instrument.entity';

@Injectable()
export class TemporaryCandleService {
  private readonly logger = new Logger(TemporaryCandleService.name);

  // All supported intervals
  private readonly intervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];

  constructor(
    @InjectRepository(TemporaryCandle)
    private temporaryCandleRepository: Repository<TemporaryCandle>,
    @InjectRepository(Instrument)
    private instrumentRepository: Repository<Instrument>,
  ) {}

  /**
   * Generate temporary candles for all instruments and all intervals
   */
  async generateTemporaryCandlesForAllInstruments(): Promise<void> {
    try {
      this.logger.log('🕯️ Starting temporary candle generation for all instruments...');

      // Get all instruments
      const instruments = await this.instrumentRepository.find({
        select: ['token', 'resolvedSymbol', 'name']
      });

      if (instruments.length === 0) {
        this.logger.log('ℹ️ No instruments found');
        return;
      }

      this.logger.log(`📊 Found ${instruments.length} instruments`);

      // Clear existing temporary candles
      await this.clearTemporaryCandles();

      let totalCandles = 0;

      // Generate candles for each instrument and interval
      for (const instrument of instruments) {
        for (const interval of this.intervals) {
          const candleCount = await this.generateCandlesForInstrumentAndInterval(
            instrument.token,
            instrument.resolvedSymbol,
            instrument.name,
            interval
          );
          totalCandles += candleCount;
        }
      }

      this.logger.log(`✅ Successfully generated ${totalCandles} temporary candles for ${instruments.length} instruments across ${this.intervals.length} intervals`);
    } catch (error) {
      this.logger.error('❌ Error generating temporary candles:', error.stack);
      throw error;
    }
  }

  /**
   * Generate candles for a specific instrument and interval
   */
  private async generateCandlesForInstrumentAndInterval(
    exchangeToken: string,
    symbol: string,
    name: string,
    interval: string
  ): Promise<number> {
    try {
      const candles = this.generateCandleData(exchangeToken, symbol, name, interval);
      
      if (candles.length > 0) {
        await this.temporaryCandleRepository.save(candles);
        this.logger.debug(`📈 Generated ${candles.length} candles for ${symbol} (${interval})`);
      }

      return candles.length;
    } catch (error) {
      this.logger.error(`❌ Error generating candles for ${symbol} (${interval}):`, error.message);
      return 0;
    }
  }

  /**
   * Generate realistic candle data for an instrument and interval
   */
  private generateCandleData(
    exchangeToken: string,
    symbol: string,
    name: string,
    interval: string
  ): TemporaryCandle[] {
    const candles: TemporaryCandle[] = [];
    const candleCount = this.getCandleCount(interval);
    const intervalMs = this.getIntervalInMs(interval);
    
    // Start from current time and go backwards
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (candleCount * intervalMs));

    // Generate base price (random between 100-5000)
    let basePrice = Math.random() * 4900 + 100;
    
    // Adjust base price based on symbol characteristics
    basePrice = this.adjustBasePriceBySymbol(symbol, basePrice);

    for (let i = 0; i < candleCount; i++) {
      const candleTime = new Date(startTime.getTime() + (i * intervalMs));
      
      // Generate realistic OHLC data
      const ohlc = this.generateRealisticOHLC(basePrice, i, candleCount);
      basePrice = ohlc.close; // Use close as next candle's base

      const candle = this.temporaryCandleRepository.create({
        exchangeToken,
        symbol,
        name,
        interval,
        datetime: candleTime,
        open: ohlc.open,
        high: ohlc.high,
        low: ohlc.low,
        close: ohlc.close,
        volume: this.generateVolume(symbol, interval),
        isTemporary: true,
      });

      candles.push(candle);
    }

    return candles;
  }

  /**
   * Generate realistic OHLC data
   */
  private generateRealisticOHLC(basePrice: number, index: number, totalCandles: number): {
    open: number;
    high: number;
    low: number;
    close: number;
  } {
    // Add some trend (slight upward or downward movement)
    const trendFactor = (Math.random() - 0.5) * 0.002; // -0.1% to +0.1% trend per candle
    const volatility = 0.02; // 2% volatility
    
    const open = basePrice;
    
    // Generate price movements
    const priceChange = (Math.random() - 0.5) * volatility * basePrice;
    const close = Math.max(0.01, open + priceChange + (basePrice * trendFactor));
    
    // Generate high and low
    const highLowRange = Math.abs(close - open) * (1 + Math.random());
    const high = Math.max(open, close) + (Math.random() * highLowRange * 0.5);
    const low = Math.min(open, close) - (Math.random() * highLowRange * 0.5);

    return {
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.max(0.01, Math.round(low * 100) / 100),
      close: Math.round(close * 100) / 100,
    };
  }

  /**
   * Adjust base price based on symbol characteristics
   */
  private adjustBasePriceBySymbol(symbol: string, basePrice: number): number {
    // High-value stocks
    if (['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY'].includes(symbol)) {
      return Math.random() * 2000 + 1000; // 1000-3000 range
    }
    
    // Mid-cap stocks
    if (['AXISBANK', 'SBIN', 'ITC', 'HDFC'].includes(symbol)) {
      return Math.random() * 1000 + 500; // 500-1500 range
    }
    
    // Penny stocks
    if (['YESBANK', 'VODAFONE', 'ADANIPOWER'].includes(symbol)) {
      return Math.random() * 100 + 10; // 10-110 range
    }
    
    return basePrice; // Use default for others
  }

  /**
   * Generate realistic volume based on symbol and interval
   */
  private generateVolume(symbol: string, interval: string): number {
    // Base volume multipliers for different symbols
    let baseVolume = 100000; // Default base volume
    
    if (['RELIANCE', 'SBIN', 'ITC', 'ICICIBANK'].includes(symbol)) {
      baseVolume = 5000000; // High volume stocks
    } else if (['TCS', 'INFY', 'HDFCBANK', 'AXISBANK'].includes(symbol)) {
      baseVolume = 2000000; // Medium-high volume
    } else if (['YESBANK', 'VODAFONE', 'ADANIPOWER'].includes(symbol)) {
      baseVolume = 10000000; // Very high volume (penny stocks)
    }

    // Adjust by interval
    const intervalMultiplier = this.getVolumeMultiplierByInterval(interval);
    const randomFactor = 0.5 + (Math.random() * 1.5); // 0.5x to 2x variation
    
    return Math.floor(baseVolume * intervalMultiplier * randomFactor);
  }

  /**
   * Get volume multiplier based on interval
   */
  private getVolumeMultiplierByInterval(interval: string): number {
    const multipliers = {
      '1m': 0.02,
      '5m': 0.1,
      '15m': 0.3,
      '30m': 0.6,
      '1h': 1.0,
      '4h': 4.0,
      '1d': 24.0,
      '1w': 168.0,
      '1M': 720.0,
    };
    
    return multipliers[interval] || 1.0;
  }

  /**
   * Get number of candles to generate for each interval
   */
  private getCandleCount(interval: string): number {
    const candleCounts = {
      '1m': 1440,   // 1 day of 1-minute candles
      '5m': 288,    // 1 day of 5-minute candles
      '15m': 96,    // 1 day of 15-minute candles
      '30m': 48,    // 1 day of 30-minute candles
      '1h': 168,    // 1 week of hourly candles
      '4h': 180,    // 1 month of 4-hour candles
      '1d': 365,    // 1 year of daily candles
      '1w': 104,    // 2 years of weekly candles
      '1M': 36,     // 3 years of monthly candles
    };
    
    return candleCounts[interval] || 100;
  }

  /**
   * Get interval in milliseconds
   */
  private getIntervalInMs(interval: string): number {
    const intervalMs = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
    };
    
    return intervalMs[interval] || 60 * 1000;
  }

  /**
   * Clear all temporary candles
   */
  async clearTemporaryCandles(): Promise<void> {
    try {
      const result = await this.temporaryCandleRepository.delete({ isTemporary: true });
      this.logger.log(`🗑️ Cleared ${result.affected || 0} existing temporary candles`);
    } catch (error) {
      this.logger.error('❌ Error clearing temporary candles:', error.message);
    }
  }

  /**
   * Get temporary candles for an instrument and interval
   */
  async getTemporaryCandles(
    exchangeToken: string,
    interval: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<TemporaryCandle[]> {
    const query = this.temporaryCandleRepository
      .createQueryBuilder('candle')
      .where('candle.exchangeToken = :exchangeToken', { exchangeToken })
      .andWhere('candle.interval = :interval', { interval })
      .andWhere('candle.isTemporary = true');

    if (fromDate) {
      query.andWhere('candle.datetime >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('candle.datetime <= :toDate', { toDate });
    }

    return query
      .orderBy('candle.datetime', 'ASC')
      .getMany();
  }

  /**
   * Get statistics about temporary candles
   */
  async getTemporaryCandleStats(): Promise<any> {
    const totalCandles = await this.temporaryCandleRepository.count({ where: { isTemporary: true } });
    
    const statsByInterval = await this.temporaryCandleRepository
      .createQueryBuilder('candle')
      .select(['candle.interval', 'COUNT(*) as count'])
      .where('candle.isTemporary = true')
      .groupBy('candle.interval')
      .getRawMany();

    const uniqueInstruments = await this.temporaryCandleRepository
      .createQueryBuilder('candle')
      .select('DISTINCT candle.exchangeToken')
      .where('candle.isTemporary = true')
      .getCount();

    return {
      totalCandles,
      uniqueInstruments,
      intervalStats: statsByInterval,
      intervals: this.intervals,
    };
  }
}