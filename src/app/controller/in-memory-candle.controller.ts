import { Controller, Get, Post, Query, Logger, Body } from '@nestjs/common';
import { InMemoryCandleService, InMemoryCandle } from '../services/in-memory-candle.service';

@Controller('in-memory-candles')
export class InMemoryCandleController {
  private readonly logger = new Logger(InMemoryCandleController.name);

  constructor(private readonly inMemoryCandleService: InMemoryCandleService) {}

  /**
   * Get cache statistics
   */
  @Get('stats')
  getCacheStats() {
    return {
      success: true,
      data: this.inMemoryCandleService.getCacheStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current candles in memory for a specific token
   */
  @Get('candles')
  getCurrentCandles(
    @Query('token') token?: string,
    @Query('interval') interval?: string,
  ) {
    const stats = this.inMemoryCandleService.getCacheStats();
    const allCandles = this.inMemoryCandleService.getAllCandlesInMemory();

    let filteredCandles = allCandles;

    if (token) {
      filteredCandles = filteredCandles.filter(c => c.exchangeToken === token);
    }

    if (interval) {
      filteredCandles = filteredCandles.filter(c => c.interval === interval);
    }

    return {
      success: true,
      data: {
        totalInMemory: stats.totalCandles,
        filteredCount: filteredCandles.length,
        candles: filteredCandles.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()),
      },
      filters: { token, interval },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get only current/active candles (filters out completed candles)
   */
  @Get('current-candles')
  getCurrentActiveCandlesOnly(
    @Query('token') token?: string,
    @Query('interval') interval?: string,
  ) {
    const stats = this.inMemoryCandleService.getCacheStats();
    const allCandles = this.inMemoryCandleService.getAllCandlesInMemory();
    
    // Filter to get only current/active candles
    const now = new Date();
    const currentCandles = allCandles.filter(candle => {
      const candleStart = candle.datetime;
      const candleEnd = this.getIntervalEndTime(candleStart, candle.interval);
      
      // Only include candles where current time is within the candle interval
      return now >= candleStart && now < candleEnd;
    });

    let filteredCandles = currentCandles;

    if (token) {
      filteredCandles = filteredCandles.filter(c => c.exchangeToken === token);
    }

    if (interval) {
      filteredCandles = filteredCandles.filter(c => c.interval === interval);
    }

    return {
      success: true,
      data: {
        totalInMemory: stats.totalCandles,
        currentCandlesCount: currentCandles.length,
        filteredCount: filteredCandles.length,
        candles: filteredCandles.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()),
      },
      filters: { token, interval },
      note: "Only showing current/active candles (not completed ones)",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get 10m interval candles specifically
   */
  @Get('candles-10m')
  get10MinuteCandles(@Query('token') token?: string) {
    const allCandles = this.inMemoryCandleService.getAllCandlesInMemory();
    let tenMinCandles = allCandles.filter(c => c.interval === '10m');

    if (token) {
      tenMinCandles = tenMinCandles.filter(c => c.exchangeToken === token);
    }

    // Sort by datetime (newest first)
    tenMinCandles.sort((a, b) => b.datetime.getTime() - a.datetime.getTime());

    // Additional analysis for open price issues
    const openPriceAnalysis = tenMinCandles.map(candle => {
      // Check if open price looks suspicious
      const suspiciousOpen = candle.open === 0 || candle.open > candle.high || candle.open < candle.low;
      
      return {
        ...candle,
        analysis: {
          suspiciousOpen,
          isValidOHLC: candle.open <= candle.high && candle.open >= candle.low && 
                      candle.close <= candle.high && candle.close >= candle.low,
          openVsHigh: candle.open === candle.high ? 'SAME' : (candle.open > candle.high ? 'INVALID' : 'OK'),
          openVsLow: candle.open === candle.low ? 'SAME' : (candle.open < candle.low ? 'INVALID' : 'OK'),
        }
      };
    });

    return {
      success: true,
      data: {
        total10mCandles: tenMinCandles.length,
        candles: openPriceAnalysis,
        summary: {
          withSuspiciousOpen: openPriceAnalysis.filter(c => c.analysis.suspiciousOpen).length,
          withValidOHLC: openPriceAnalysis.filter(c => c.analysis.isValidOHLC).length,
        }
      },
      filters: { token, interval: '10m' },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Force sync all candles to database
   */
  @Post('force-sync')
  async forceSyncToDatabase() {
    this.logger.log('Manual force sync requested');
    
    try {
      await this.inMemoryCandleService.forceSyncAll();
      const stats = this.inMemoryCandleService.getCacheStats();
      
      return {
        success: true,
        message: 'Force sync completed',
        data: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Force sync failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Clear all in-memory candles
   */
  @Post('clear-cache')
  clearCache() {
    this.logger.warn('Manual cache clear requested');
    
    try {
      const result = this.inMemoryCandleService.clearCache();
      
      return {
        success: true,
        message: result.message,
        clearedCount: result.clearedCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Cache clear failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get detailed candle breakdown by interval
   */
  @Get('breakdown')
  getCandleBreakdown() {
    const allCandles = this.inMemoryCandleService.getAllCandlesInMemory();
    const breakdown = {};

    // Group by interval
    allCandles.forEach(candle => {
      if (!breakdown[candle.interval]) {
        breakdown[candle.interval] = {
          count: 0,
          latestUpdate: null,
          activeCandles: [],
          sampleCandles: [],
        };
      }
      
      breakdown[candle.interval].count++;
      
      if (!breakdown[candle.interval].latestUpdate || 
          candle.lastUpdated > breakdown[candle.interval].latestUpdate) {
        breakdown[candle.interval].latestUpdate = candle.lastUpdated;
      }

      // Add to sample (max 5 per interval)
      if (breakdown[candle.interval].sampleCandles.length < 5) {
        breakdown[candle.interval].sampleCandles.push({
          token: candle.exchangeToken,
          symbol: candle.symbol,
          datetime: candle.datetime,
          ohlc: {
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          },
          volume: candle.volume,
          tickCount: candle.tickCount,
          lastUpdated: candle.lastUpdated,
        });
      }
    });

    return {
      success: true,
      data: breakdown,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Test tick processing with sample data
   */
  @Post('test-tick')
  async testTickProcessing(
    @Query('token') token: string = '3045',
    @Query('ltp') ltp: string = '1000',
    @Query('volume') volume: string = '100',
  ) {
    try {
      const testTick = {
        token,
        name: `TestStock-${token}`,
        ltp: parseFloat(ltp),
        volume: parseInt(volume),
        timestamp: new Date().toISOString(),
      };

      await this.inMemoryCandleService.processTick(testTick);
      
      // Get updated stats
      const stats = this.inMemoryCandleService.getCacheStats();
      
      return {
        success: true,
        message: 'Test tick processed successfully',
        testTick,
        cacheStats: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Test tick processing failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Process incoming tick data from SmartAPI worker
   */
  @Post('process-tick')
  async processTick(@Body() tickData: {
    token: string;
    name: string;
    ltp: number;
    volume: number;
    timestamp?: string;
  }) {
    try {
      this.logger.log(`📈 Processing tick: ${tickData.token} @ ${tickData.ltp}`);
      
      // Ensure timestamp is provided, use current time if not
      const processedTickData = {
        ...tickData,
        timestamp: tickData.timestamp || new Date().toISOString()
      };
      
      await this.inMemoryCandleService.processTick(processedTickData);
      
      return {
        success: true,
        message: 'Tick processed successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to process tick:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Test dynamic open price behavior
   */
  @Post('test-dynamic-open')
  async testDynamicOpen() {
    try {
      const token = '2885'; // RELIANCE for testing
      const testTicks = [
        { token, name: 'RELIANCE', ltp: 2500.00, volume: 100, timestamp: new Date().toISOString() },
        { token, name: 'RELIANCE', ltp: 2505.50, volume: 150, timestamp: new Date().toISOString() },
        { token, name: 'RELIANCE', ltp: 2498.75, volume: 200, timestamp: new Date().toISOString() },
        { token, name: 'RELIANCE', ltp: 2510.25, volume: 120, timestamp: new Date().toISOString() },
      ];

      const results = [];
      
      for (let i = 0; i < testTicks.length; i++) {
        await this.inMemoryCandleService.processTick(testTicks[i]);
        
        // Get current candles for this token
        const currentCandles = this.inMemoryCandleService.getCandlesForToken(token, '1m');
        
        results.push({
          tickNumber: i + 1,
          tickData: testTicks[i],
          candleAfterTick: currentCandles[0] || null,
          message: i === 0 ? 'New candle created' : 'Existing candle updated with dynamic open'
        });
        
        // Add small delay to see progression
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return {
        success: true,
        message: 'Dynamic open price test completed',
        explanation: 'Each tick updates the open price dynamically for all intervals',
        testResults: results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Dynamic open test failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get current market status
   */
  @Get('market-status')
  getMarketStatus() {
    const marketStatus = this.inMemoryCandleService.getCurrentMarketStatus();
    
    return {
      success: true,
      data: marketStatus,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Initialize daily market (manual trigger)
   */
  @Post('initialize-daily')
  async initializeDailyMarket() {
    try {
      await this.inMemoryCandleService.initializeDailyMarket();
      
      return {
        success: true,
        message: 'Daily market initialization completed',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Daily market initialization failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Helper method to calculate interval end time
   */
  private getIntervalEndTime(startTime: Date, interval: string): Date {
    const endTime = new Date(startTime);
    
    switch (interval) {
      case '1m': endTime.setMinutes(endTime.getMinutes() + 1); break;
      case '3m': endTime.setMinutes(endTime.getMinutes() + 3); break;
      case '5m': endTime.setMinutes(endTime.getMinutes() + 5); break;
      case '10m': endTime.setMinutes(endTime.getMinutes() + 10); break;
      case '15m': endTime.setMinutes(endTime.getMinutes() + 15); break;
      case '30m': endTime.setMinutes(endTime.getMinutes() + 30); break;
      case '1h': endTime.setHours(endTime.getHours() + 1); break;
      case '2h': endTime.setHours(endTime.getHours() + 2); break;
      case '4h': endTime.setHours(endTime.getHours() + 4); break;
      case '1d': endTime.setDate(endTime.getDate() + 1); break;
      case '7d': endTime.setDate(endTime.getDate() + 7); break;
      case '1M': endTime.setMonth(endTime.getMonth() + 1); break;
      default: endTime.setMinutes(endTime.getMinutes() + 1);
    }
    
    return endTime;
  }
}
