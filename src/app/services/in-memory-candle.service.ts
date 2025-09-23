import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemporaryCandle } from '../entities/temporary-candle.entity';

export interface InMemoryCandle {
  exchangeToken: string;
  symbol: string;
  name: string;
  interval: string;
  datetime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tickCount: number; // Track number of ticks for this candle
  lastUpdated: Date;
}

@Injectable()
export class InMemoryCandleService implements OnModuleInit {
  private readonly logger = new Logger(InMemoryCandleService.name);
  
  // In-memory cache: Map<"token-interval-datetime", InMemoryCandle>
  private candleCache = new Map<string, InMemoryCandle>();
  
  // Intervals to track - Updated with new requirements
  private readonly intervals = ['1m', '3m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '1d', '7d', '1M'];
  
  // Sync interval (every 30 seconds)
  private syncInterval: NodeJS.Timeout;

  /**
   * Create IST timestamp (Indian Standard Time - UTC+5:30)
   */
  private createISTTimestamp(): Date {
    const now = new Date();
    // Add 5.5 hours (5 hours 30 minutes) to UTC to get IST
    return new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  }

  constructor(
    @InjectRepository(TemporaryCandle)
    private temporaryCandleRepository: Repository<TemporaryCandle>,
  ) {}

  onModuleInit() {
    // Start periodic sync to database (more frequent for faster cleanup)
    this.syncInterval = setInterval(() => {
      this.syncToDatabase().catch(err => {
        this.logger.error('Error syncing candles to database:', err);
      });
    }, 10 * 1000); // Every 10 seconds (faster cleanup of completed candles)
    
    this.logger.log('InMemoryCandleService initialized with periodic DB sync');
  }

  /**
   * Enhanced tick processing with MARKET HOURS logic and proper open price handling
   */
  async processTick(tick: {
    token: string;
    name: string;
    ltp: number;
    volume: number;
    timestamp: string | Date;
  }): Promise<void> {
    // Convert timestamp to IST Date object
    const tickTime = this.createISTTimestamp();
    
    // Check market status
    const marketStatus = this.getMarketStatus(tickTime);
    
    // Log market status for debugging (only once per minute)
    if (this.shouldLogMarketStatus(tickTime)) {
      this.logger.log(`🕒 Market Status: ${marketStatus.status} - ${marketStatus.description}`);
    }
    
    // Reject ticks if market is completely closed
    if (!marketStatus.canProcessTicks) {
      this.logger.debug(`❌ Rejecting tick for ${tick.token} - Market is ${marketStatus.status}`);
      return;
    }
    
    // Special handling for pre-market period (9:00-9:08 AM)
    if (marketStatus.status === 'PRE_MARKET') {
      await this.handlePreMarketTick(tick, tickTime);
      return;
    }
    
    // Special handling for price discovery period (9:08-9:15 AM)
    if (marketStatus.status === 'PRICE_DISCOVERY') {
      await this.handlePriceDiscoveryTick(tick, tickTime);
      return;
    }
    
    // Normal processing for ACTIVE_TRADING and POST_MARKET
    await this.processNormalTick(tick, tickTime, marketStatus);
  }

  private lastMarketStatusLog = 0;
  
  /**
   * Check if we should log market status (once per minute)
   */
  private shouldLogMarketStatus(time: Date): boolean {
    const currentMinute = Math.floor(time.getTime() / (60 * 1000));
    if (currentMinute !== this.lastMarketStatusLog) {
      this.lastMarketStatusLog = currentMinute;
      return true;
    }
    return false;
  }

  /**
   * Handle pre-market ticks (9:00-9:08 AM) - Update open prices
   */
  private async handlePreMarketTick(tick: {
    token: string;
    name: string;
    ltp: number;
    volume: number;
    timestamp: string | Date;
  }, tickTime: Date): Promise<void> {
    this.logger.debug(`📈 PRE-MARKET: Updating open prices for ${tick.token} @ ₹${tick.ltp}`);
    
    for (const interval of this.intervals) {
      const candleStart = this.getCandleStartTime(tickTime, interval);
      const key = `${tick.token}-${interval}-${candleStart.getTime()}`;
      
      let candle = this.candleCache.get(key);
      
      if (candle) {
        // 🔄 PRE-MARKET: Update open price during pre-market period
        candle.open = tick.ltp;
        candle.high = Math.max(candle.high, tick.ltp);
        candle.low = Math.min(candle.low, tick.ltp);
        candle.close = tick.ltp;
        candle.volume += tick.volume || 0;
        candle.tickCount++;
        candle.lastUpdated = this.createISTTimestamp();
        
        this.logger.debug(`🔄 PRE-MARKET UPDATE: ${interval} candle for ${tick.token} - Open updated to ₹${candle.open}`);
      } else {
        // Create new candle for pre-market
        candle = {
          exchangeToken: tick.token,
          symbol: tick.name || tick.token,
          name: tick.name || '',
          interval,
          datetime: candleStart,
          open: tick.ltp,  // PRE-MARKET: Set initial open price
          high: 0,         // 🔥 PRE-MARKET: Set high as ZERO initially
          low: tick.ltp,
          close: tick.ltp,
          volume: tick.volume || 0,
          tickCount: 1,
          lastUpdated: this.createISTTimestamp(),
        };
        
        this.candleCache.set(key, candle);
        this.logger.debug(`🆕 PRE-MARKET NEW: ${interval} candle for ${tick.token} - Open set to ₹${candle.open}`);
      }
    }
  }

  /**
   * Handle price discovery ticks (9:08-9:15 AM) - Fixed open price, update H/L/C only
   */
  private async handlePriceDiscoveryTick(tick: {
    token: string;
    name: string;
    ltp: number;
    volume: number;
    timestamp: string | Date;
  }, tickTime: Date): Promise<void> {
    this.logger.debug(`🔒 PRICE-DISCOVERY: Fixed open, updating H/L/C for ${tick.token} @ ₹${tick.ltp}`);
    
    for (const interval of this.intervals) {
      const candleStart = this.getCandleStartTime(tickTime, interval);
      const key = `${tick.token}-${interval}-${candleStart.getTime()}`;
      
      let candle = this.candleCache.get(key);
      
      if (candle) {
        // 🔒 PRICE-DISCOVERY: Open price is FIXED (no changes), only update H/L/C/V
        candle.high = Math.max(candle.high, tick.ltp);
        candle.low = Math.min(candle.low, tick.ltp);
        candle.close = tick.ltp;
        candle.volume += tick.volume || 0;
        candle.tickCount++;
        candle.lastUpdated = this.createISTTimestamp();
        
        this.logger.debug(`🔒 PRICE-DISCOVERY UPDATE: ${interval} candle for ${tick.token} - Open FIXED at ₹${candle.open}, Close: ₹${candle.close}`);
      } else {
        // Create new candle for price discovery period (should rarely happen if pre-market worked)
        // Use tick price as open if no pre-market candle exists
        candle = {
          exchangeToken: tick.token,
          symbol: tick.name || tick.token,
          name: tick.name || '',
          interval,
          datetime: candleStart,
          open: tick.ltp,  // PRICE-DISCOVERY: Set open price (but will be fixed from now on)
          high: tick.ltp,  // 🔥 PRICE-DISCOVERY: Set high = open (same as open price)
          low: tick.ltp,
          close: tick.ltp,
          volume: tick.volume || 0,
          tickCount: 1,
          lastUpdated: this.createISTTimestamp(),
        };
        
        this.candleCache.set(key, candle);
        this.logger.debug(`🆕 PRICE-DISCOVERY NEW: ${interval} candle for ${tick.token} - Open set and FIXED at ₹${candle.open}`);
      }
    }
  }

  /**
   * Handle normal ticks (Active Trading & Post-Market)
   */
  private async processNormalTick(tick: {
    token: string;
    name: string;
    ltp: number;
    volume: number;
    timestamp: string | Date;
  }, tickTime: Date, marketStatus: any): Promise<void> {
    
    for (const interval of this.intervals) {
      const candleStart = this.getCandleStartTime(tickTime, interval);
      const key = `${tick.token}-${interval}-${candleStart.getTime()}`;
      
      let candle = this.candleCache.get(key);
      
      if (candle) {
        // 🔒 FIXED OPEN: Update existing candle but NEVER change the open price during trading hours
        candle.high = Math.max(candle.high, tick.ltp);
        candle.low = Math.min(candle.low, tick.ltp);
        candle.close = tick.ltp;
        candle.volume += tick.volume || 0;
        candle.tickCount++;
        candle.lastUpdated = this.createISTTimestamp();
        
        // Special logging for debugging (1m and 10m intervals)
        if (tick.token === '2885' && (interval === '1m' || interval === '10m')) {
          console.log(`🔒 ${marketStatus.status} UPDATE - ${interval} candle for ${tick.name}:`);
          console.log(`   Fixed Open: ${candle.open} (NEVER changes during trading)`);
          console.log(`   Updated: H:${candle.high} L:${candle.low} C:${candle.close} (Tick: ${tick.ltp})`);
          console.log(`   Volume: ${candle.volume}, Ticks: ${candle.tickCount}`);
        }
      } else {
        // Create new candle - Get proper open price using correct logic
        let openPrice: number;
        
        // Try to get previous candle's close price for continuity
        const previousClose = await this.getPreviousCandleClose(tick.token, interval, candleStart);
        
        if (previousClose !== null) {
          // Use previous candle's close as open (standard behavior)
          openPrice = previousClose;
        } else {
          // No previous candle found, use current tick price as open
          openPrice = tick.ltp;
        }
        
        candle = {
          exchangeToken: tick.token,
          symbol: tick.name || tick.token,
          name: tick.name || '',
          interval,
          datetime: candleStart,
          open: openPrice, // 🔒 FIXED: Open price is set once and never changes during trading
          high: Math.max(openPrice, tick.ltp),
          low: Math.min(openPrice, tick.ltp),
          close: tick.ltp,
          volume: tick.volume || 0,
          tickCount: 1,
          lastUpdated: this.createISTTimestamp(),
        };
        
        this.candleCache.set(key, candle);
        
        // Special logging for new candles (1m and 10m intervals)
        if (tick.token === '2885' && (interval === '1m' || interval === '10m')) {
          console.log(`🆕 NEW ${marketStatus.status} CANDLE - ${interval} for ${tick.name}:`);
          console.log(`   Open: ${openPrice} (${previousClose ? 'from prev close' : 'from current tick'}) - FIXED during trading`);
          console.log(`   OHLC: O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close}`);
          
          // Extra debugging for 10m interval
          if (interval === '10m') {
            console.log(`   🔍 10m DEBUG: CandleStart=${candleStart.toISOString()}, PrevClose=${previousClose}`);
          }
        }
      }
    }
  }

  /**
   * Sync in-memory candles to database with proper rollover logic
   */
  private async syncToDatabase(): Promise<void> {
    const candlesToSync = Array.from(this.candleCache.values());
    const now = this.createISTTimestamp();
    
    let completedCandles = 0;
    let updatedCandles = 0;
    
    for (const candle of candlesToSync) {
      const intervalEnd = this.getIntervalEnd(candle.datetime, candle.interval);
      const isCompleted = now >= intervalEnd;
      
      if (isCompleted) {
        // Candle interval is complete - finalize and move to historical
        await this.finalizeCompletedCandle(candle);
        
        // Remove from cache after finalizing
        const key = `${candle.exchangeToken}-${candle.interval}-${candle.datetime.getTime()}`;
        this.candleCache.delete(key);
        
        // Create next interval candle with proper open price (previous close)
        await this.createNextIntervalCandle(candle, intervalEnd);
        
        completedCandles++;
      } else {
        // Active candle - just sync to temp storage
        await this.upsertToDatabase(candle);
        updatedCandles++;
      }
    }
    
    if (completedCandles > 0 || updatedCandles > 0) {
      this.logger.debug(`Completed: ${completedCandles}, Updated: ${updatedCandles}, Cache: ${this.candleCache.size}`);
    }
  }

  /**
   * Finalize a completed candle (simplified - focus on in-memory correctness)
   */
  private async finalizeCompletedCandle(candle: InMemoryCandle): Promise<void> {
    try {
      // For now, just log the completion and save to temporary table
      // TODO: Later implement historical table saving
      await this.upsertToDatabase(candle);
      
      this.logger.log(`✅ COMPLETED ${candle.interval} candle for ${candle.symbol} (${candle.exchangeToken}): O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close} V:${candle.volume} Ticks:${candle.tickCount}`);
    } catch (error) {
      this.logger.error(`Error finalizing candle:`, error);
    }
  }

  /**
   * Create next interval candle with proper open price continuity
   */
  private async createNextIntervalCandle(completedCandle: InMemoryCandle, nextIntervalStart: Date): Promise<void> {
    // Create the next interval candle with the completed candle's close as the open price
    // This ensures proper price continuity between candles
    const nextKey = `${completedCandle.exchangeToken}-${completedCandle.interval}-${nextIntervalStart.getTime()}`;
    
    // Check if next candle already exists (might have been created by tick processing)
    if (this.candleCache.has(nextKey)) {
      this.logger.debug(`Next candle already exists for ${completedCandle.symbol} ${completedCandle.interval}`);
      return;
    }
    
    // Create next candle with proper open price (previous close)
    const nextCandle: InMemoryCandle = {
      exchangeToken: completedCandle.exchangeToken,
      symbol: completedCandle.symbol,
      name: completedCandle.name,
      interval: completedCandle.interval,
      datetime: nextIntervalStart,
      open: completedCandle.close, // 🔒 FIXED: Next candle's open = previous candle's close
      high: completedCandle.close, // Initially set to open price
      low: completedCandle.close,  // Initially set to open price
      close: completedCandle.close, // Initially set to open price
      volume: 0,
      tickCount: 0,
      lastUpdated: this.createISTTimestamp(),
    };
    
    this.candleCache.set(nextKey, nextCandle);
    
    this.logger.debug(`🔗 Created next ${completedCandle.interval} candle for ${completedCandle.symbol}: Open=${nextCandle.open} (from prev close)`);
  }

  /**
   * Upsert candle to database
   */
  private async upsertToDatabase(candle: InMemoryCandle): Promise<void> {
    try {
      const existing = await this.temporaryCandleRepository.findOne({
        where: {
          exchangeToken: candle.exchangeToken,
          interval: candle.interval,
          datetime: candle.datetime,
        },
      });

      if (existing) {
        // Update existing
        await this.temporaryCandleRepository.update(
          { uuid: existing.uuid },
          {
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
            updatedAt: this.createISTTimestamp(),
          }
        );
      } else {
        // Create new
        const newCandle = this.temporaryCandleRepository.create({
          exchangeToken: candle.exchangeToken,
          symbol: candle.symbol,
          name: candle.name,
          interval: candle.interval,
          datetime: candle.datetime,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          isTemporary: true,
        });
        await this.temporaryCandleRepository.save(newCandle);
      }
    } catch (error) {
      this.logger.error(`Error upserting candle to database:`, error);
    }
  }

  /**
   * Get candle start time for interval (properly aligned to IST market hours)
   */
  private getCandleStartTime(date: Date, interval: string): Date {
    // Create a new date object to avoid modifying the original
    const d = new Date(date);
    
    // Ensure we're working with IST timezone
    // Note: JavaScript Date works in local timezone, so we assume the input is already in IST
    
    switch (interval) {
      case '1m':
        // Round down to the minute (e.g., 9:15:45 → 9:15:00)
        d.setSeconds(0, 0);
        break;
      case '3m':
        // Round down to 3-minute intervals (e.g., 9:17 → 9:15, 9:20 → 9:18)
        d.setMinutes(Math.floor(d.getMinutes() / 3) * 3, 0, 0);
        break;
      case '5m':
        // Round down to 5-minute intervals (e.g., 9:17 → 9:15, 9:22 → 9:20)
        d.setMinutes(Math.floor(d.getMinutes() / 5) * 5, 0, 0);
        break;
      case '10m':
        // Round down to 10-minute intervals (e.g., 9:27 → 9:20, 9:45 → 9:40)
        d.setMinutes(Math.floor(d.getMinutes() / 10) * 10, 0, 0);
        break;
      case '15m':
        // Round down to 15-minute intervals (e.g., 9:27 → 9:15, 9:45 → 9:30)
        d.setMinutes(Math.floor(d.getMinutes() / 15) * 15, 0, 0);
        break;
      case '30m':
        // Round down to 30-minute intervals (e.g., 9:45 → 9:30, 10:15 → 10:00)
        d.setMinutes(Math.floor(d.getMinutes() / 30) * 30, 0, 0);
        break;
      case '1h':
        // Round down to the hour (e.g., 9:45 → 9:00, 10:30 → 10:00)
        d.setMinutes(0, 0, 0);
        break;
      case '2h':
        // Round down to 2-hour intervals (e.g., 11:30 → 10:00, 13:45 → 12:00)
        d.setHours(Math.floor(d.getHours() / 2) * 2, 0, 0, 0);
        break;
      case '4h':
        // Round down to 4-hour intervals (useful for longer-term analysis)
        d.setHours(Math.floor(d.getHours() / 4) * 4, 0, 0, 0);
        break;
      case '1d':
        // Set to start of the trading day (00:00:00 IST)
        d.setHours(0, 0, 0, 0);
        break;
      case '7d':
        // Set to previous Monday at 00:00:00 IST (7-day period)
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        d.setHours(0, 0, 0, 0);
        break;
      case '1M':
        // Set to first day of the month at 00:00:00 IST
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        break;
      default:
        // Default to minute-level precision
        d.setSeconds(0, 0);
    }
    return d;
  }

  /**
   * Get interval end time
   */
  private getIntervalEnd(startTime: Date, interval: string): Date {
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

  /**
   * Enhanced market status checker with Indian market hours
   */
  private getMarketStatus(time: Date): {
    status: 'PRE_MARKET' | 'PRICE_DISCOVERY' | 'ACTIVE_TRADING' | 'POST_MARKET' | 'CLOSED';
    canProcessTicks: boolean;
    canUpdateOpenPrices: boolean;
    description: string;
  } {
    const hour = time.getHours();
    const minute = time.getMinutes();
    const currentTime = hour * 60 + minute;
    
    // Market time periods (in minutes from midnight)
    const preMarketStart = 9 * 60;      // 9:00 AM - Start accepting ticks
    const openPriceFixTime = 9 * 60 + 8; // 9:08 AM - Fix open prices
    const activeStart = 9 * 60 + 15;    // 9:15 AM - Active trading
    const activeEnd = 15 * 60 + 30;     // 3:30 PM - Market close
    const postMarketEnd = 17 * 60;      // 5:00 PM - Post-market end
    
    if (currentTime >= preMarketStart && currentTime < openPriceFixTime) {
      return {
        status: 'PRE_MARKET',
        canProcessTicks: true,
        canUpdateOpenPrices: true,
        description: 'Pre-market: 9:00-9:07 AM - Opening price fluctuation period'
      };
    } else if (currentTime >= openPriceFixTime && currentTime < activeStart) {
      return {
        status: 'PRICE_DISCOVERY',
        canProcessTicks: true,
        canUpdateOpenPrices: false,
        description: 'Price discovery: 9:08-9:15 AM - Fixed open, update H/L/C only'
      };
    } else if (currentTime >= activeStart && currentTime <= activeEnd) {
      return {
        status: 'ACTIVE_TRADING',
        canProcessTicks: true,
        canUpdateOpenPrices: false,
        description: 'Active trading: 9:15 AM-3:30 PM - Normal tick processing'
      };
    } else if (currentTime > activeEnd && currentTime <= postMarketEnd) {
      return {
        status: 'POST_MARKET',
        canProcessTicks: true,
        canUpdateOpenPrices: false,
        description: 'Post-market: 3:30-5:00 PM - Limited processing'
      };
    } else {
      return {
        status: 'CLOSED',
        canProcessTicks: false,
        canUpdateOpenPrices: false,
        description: 'Market closed: After 5:00 PM and before 9:00 AM'
      };
    }
  }

  /**
   * Check if market is closed (legacy method for compatibility)
   */
  private isMarketClosed(time: Date): boolean {
    const marketStatus = this.getMarketStatus(time);
    return marketStatus.status === 'CLOSED';
  }

  /**
   * Save completed candle to appropriate historical table (DISABLED FOR NOW)
   */
  private async saveToHistoricalTable(candle: InMemoryCandle): Promise<void> {
    // TEMPORARILY DISABLED - Focus on in-memory correctness first
    this.logger.debug(`📝 Would save to historical table: candles_${candle.interval} (DISABLED)`);
    
    // TODO: Later implement actual historical table saving
    // Example: await this.candles5mRepository.save(historicalCandle);
  }

  /**
   * Get current cache statistics with accurate memory calculation
   */
  getCacheStats(): {
    totalCandles: number;
    intervalBreakdown: Record<string, number>;
    memoryUsageEstimate: string;
    accurateMemoryEstimate: string;
  } {
    const totalCandles = this.candleCache.size;
    const intervalBreakdown: Record<string, number> = {};
    
    for (const candle of this.candleCache.values()) {
      intervalBreakdown[candle.interval] = (intervalBreakdown[candle.interval] || 0) + 1;
    }
    
    // More accurate memory estimate based on actual object size
    const bytesPerCandle = 240; // Calculated based on InMemoryCandle interface
    const memoryBytes = totalCandles * bytesPerCandle;
    const memoryMB = (memoryBytes / (1024 * 1024)).toFixed(3);
    const memoryKB = (memoryBytes / 1024).toFixed(2);
    
    // Legacy estimate for compatibility
    const legacyMemoryBytes = totalCandles * 200;
    const legacyMemoryMB = (legacyMemoryBytes / (1024 * 1024)).toFixed(2);
    
    return {
      totalCandles,
      intervalBreakdown,
      memoryUsageEstimate: `${legacyMemoryMB} MB`, // Keep for backward compatibility
      accurateMemoryEstimate: memoryBytes < 1024 * 1024 
        ? `${memoryKB} KB` 
        : `${memoryMB} MB`,
    };
  }

  /**
   * Force sync all candles to database (for testing/debugging)
   */
  async forceSyncAll(): Promise<void> {
    const candlesToSync = Array.from(this.candleCache.values());
    for (const candle of candlesToSync) {
      await this.upsertToDatabase(candle);
    }
    this.logger.log(`Force synced ${candlesToSync.length} candles to database`);
  }

  /**
   * Clear all in-memory candles (for testing/debugging)
   */
  clearCache(): { clearedCount: number; message: string } {
    const clearedCount = this.candleCache.size;
    this.candleCache.clear();
    this.logger.warn(`🗑️ CLEARED ALL IN-MEMORY CANDLES: ${clearedCount} candles removed`);
    
    return {
      clearedCount,
      message: `Successfully cleared ${clearedCount} candles from memory`
    };
  }

  /**
   * Check if this is the first candle of the trading day
   */
  private async isFirstCandleOfDay(token: string, interval: string, candleStart: Date): Promise<boolean> {
    const marketStartToday = new Date(candleStart);
    marketStartToday.setHours(9, 15, 0, 0); // 9:15 AM
    
    // For intraday intervals, check if this candle starts at market open
    if (['1m', '3m', '5m', '10m', '15m', '30m', '1h', '2h'].includes(interval)) {
      return candleStart.getTime() === marketStartToday.getTime();
    }
    
    // For daily/weekly/monthly, always consider as potentially having previous close
    return false;
  }

  /**
   * Get previous candle's close price for open price continuity
   */
  private async getPreviousCandleClose(token: string, interval: string, currentCandleStart: Date): Promise<number | null> {
    // Calculate previous interval start time
    const prevCandleStart = new Date(currentCandleStart);
    
    switch (interval) {
      case '1m': prevCandleStart.setMinutes(prevCandleStart.getMinutes() - 1); break;
      case '3m': prevCandleStart.setMinutes(prevCandleStart.getMinutes() - 3); break;
      case '5m': prevCandleStart.setMinutes(prevCandleStart.getMinutes() - 5); break;
      case '10m': prevCandleStart.setMinutes(prevCandleStart.getMinutes() - 10); break;
      case '15m': prevCandleStart.setMinutes(prevCandleStart.getMinutes() - 15); break;
      case '30m': prevCandleStart.setMinutes(prevCandleStart.getMinutes() - 30); break;
      case '1h': prevCandleStart.setHours(prevCandleStart.getHours() - 1); break;
      case '2h': prevCandleStart.setHours(prevCandleStart.getHours() - 2); break;
      case '4h': prevCandleStart.setHours(prevCandleStart.getHours() - 4); break;
      case '1d': prevCandleStart.setDate(prevCandleStart.getDate() - 1); break;
      case '7d': prevCandleStart.setDate(prevCandleStart.getDate() - 7); break;
      case '1M': prevCandleStart.setMonth(prevCandleStart.getMonth() - 1); break;
      default: prevCandleStart.setMinutes(prevCandleStart.getMinutes() - 1); break;
    }
    
    // First check in-memory cache
    const prevKey = `${token}-${interval}-${prevCandleStart.getTime()}`;
    const prevCandle = this.candleCache.get(prevKey);
    
    if (prevCandle) {
      return prevCandle.close;
    }
    
    // Then check database (temporary_candles table)
    try {
      const prevCandleDb = await this.temporaryCandleRepository.findOne({
        where: {
          exchangeToken: token,
          interval: interval,
          datetime: prevCandleStart,
        },
        order: { datetime: 'DESC' },
      });
      
      return prevCandleDb ? Number(prevCandleDb.close) : null;
    } catch (error) {
      this.logger.error(`Error getting previous candle close:`, error);
      return null;
    }
  }

  /**
   * Get all candles currently in memory (for monitoring)
   */
  getAllCandlesInMemory(): InMemoryCandle[] {
    return Array.from(this.candleCache.values());
  }

  /**
   * Get candles for specific token and interval
   */
  getCandlesForToken(token: string, interval?: string): InMemoryCandle[] {
    const allCandles = this.getAllCandlesInMemory();
    let filtered = allCandles.filter(candle => candle.exchangeToken === token);
    
    if (interval) {
      filtered = filtered.filter(candle => candle.interval === interval);
    }
    
    return filtered.sort((a, b) => b.datetime.getTime() - a.datetime.getTime());
  }

  /**
   * Get real-time processing metrics
   */
  getProcessingMetrics(): {
    cacheSize: number;
    oldestCandle: Date | null;
    newestCandle: Date | null;
    intervalDistribution: Record<string, number>;
    mostActiveTokens: Array<{ token: string; symbol: string; tickCount: number; }>;
  } {
    const allCandles = this.getAllCandlesInMemory();
    
    if (allCandles.length === 0) {
      return {
        cacheSize: 0,
        oldestCandle: null,
        newestCandle: null,
        intervalDistribution: {},
        mostActiveTokens: [],
      };
    }

    // Find oldest and newest
    const sortedByTime = allCandles.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
    const oldestCandle = sortedByTime[0]?.datetime || null;
    const newestCandle = sortedByTime[sortedByTime.length - 1]?.datetime || null;

    // Interval distribution
    const intervalDistribution: Record<string, number> = {};
    allCandles.forEach(candle => {
      intervalDistribution[candle.interval] = (intervalDistribution[candle.interval] || 0) + 1;
    });

    // Most active tokens (by tick count)
    const tokenActivity: Record<string, { symbol: string; tickCount: number; }> = {};
    allCandles.forEach(candle => {
      if (!tokenActivity[candle.exchangeToken]) {
        tokenActivity[candle.exchangeToken] = { symbol: candle.symbol, tickCount: 0 };
      }
      tokenActivity[candle.exchangeToken].tickCount += candle.tickCount;
    });

    const mostActiveTokens = Object.entries(tokenActivity)
      .map(([token, data]) => ({ token, symbol: data.symbol, tickCount: data.tickCount }))
      .sort((a, b) => b.tickCount - a.tickCount)
      .slice(0, 10);

    return {
      cacheSize: allCandles.length,
      oldestCandle,
      newestCandle,
      intervalDistribution,
      mostActiveTokens,
    };
  }

  /**
   * Get current market status (for API endpoints)
   */
  getCurrentMarketStatus(): {
    status: string;
    canProcessTicks: boolean;
    canUpdateOpenPrices: boolean;
    description: string;
    currentTime: string;
    nextMarketEvent: string;
  } {
    const now = this.createISTTimestamp();
    const marketStatus = this.getMarketStatus(now);
    
    // Calculate next market event
    let nextEvent = '';
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;
    
    if (currentTime < 9 * 60) {
      nextEvent = 'Pre-market opens at 9:00 AM';
    } else if (currentTime < 9 * 60 + 8) {
      nextEvent = 'Active trading starts at 9:15 AM';
    } else if (currentTime < 9 * 60 + 15) {
      nextEvent = 'Active trading starts at 9:15 AM';
    } else if (currentTime < 15 * 60 + 30) {
      nextEvent = 'Market closes at 3:30 PM';
    } else if (currentTime < 17 * 60) {
      nextEvent = 'Post-market closes at 5:00 PM';
    } else {
      nextEvent = 'Pre-market opens tomorrow at 9:00 AM';
    }
    
    return {
      ...marketStatus,
      currentTime: now.toISOString(),
      nextMarketEvent: nextEvent
    };
  }

  /**
   * Daily market opening routine - Reset and prepare for new trading day
   */
  async initializeDailyMarket(): Promise<void> {
    const now = this.createISTTimestamp();
    this.logger.log(`🏪 DAILY MARKET INITIALIZATION - ${now.toDateString()}`);
    
    // Get market status
    const marketStatus = this.getMarketStatus(now);
    
    if (marketStatus.status === 'PRE_MARKET') {
      this.logger.log(`📅 Pre-market period active - Ready for open price adjustments`);
      
      // Log statistics for yesterday's candles before cleanup
      const stats = this.getCacheStats();
      this.logger.log(`📊 Previous day candles in memory: ${stats.totalCandles}`);
      
      // Optionally: Clear very old candles or completed candles from previous days
      await this.cleanupPreviousDayCandles();
      
      this.logger.log(`✅ Daily market initialization complete - Ready for trading`);
    } else {
      this.logger.warn(`⚠️ Daily initialization called outside pre-market hours: ${marketStatus.status}`);
    }
  }

  /**
   * Cleanup candles from previous trading days
   */
  private async cleanupPreviousDayCandles(): Promise<void> {
    const now = this.createISTTimestamp();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    
    let cleanedCount = 0;
    const candlesToRemove: string[] = [];
    
    // Find candles older than yesterday
    for (const [key, candle] of this.candleCache.entries()) {
      if (candle.datetime < yesterday) {
        candlesToRemove.push(key);
      }
    }
    
    // Remove old candles from cache
    for (const key of candlesToRemove) {
      this.candleCache.delete(key);
      cleanedCount++;
    }
    
    if (cleanedCount > 0) {
      this.logger.log(`🗑️ Cleaned up ${cleanedCount} candles from previous trading days`);
    }
  }
}
