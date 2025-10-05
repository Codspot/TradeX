import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
  private readonly intervals = ['1m', '3m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', '1M'];
  
  // Sync interval (every 30 seconds)
  private syncInterval: NodeJS.Timeout;
  
  // Track if pending candles have been stored for the current trading day
  private pendingCandlesStoredToday = false;

  /**
   * Create IST timestamp (Indian Standard Time - UTC+5:30)
   * UNIVERSAL: Works regardless of server timezone - always returns IST time
   */
  private createISTTimestamp(): Date {
    // Get current UTC time
    const now = new Date();
    
    // Convert to IST (UTC+5:30) regardless of server timezone
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000); // Convert to UTC
    const istTime = new Date(utcTime + istOffset); // Add IST offset
    
    return istTime;
  }

  constructor(
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
    
    // Store pending candles when market enters active trading (only once per day)
    if (marketStatus.status === 'ACTIVE_TRADING' && !this.pendingCandlesStoredToday) {
      await this.storePendingCompletedCandles();
      this.pendingCandlesStoredToday = true;
    }
    
    // Reject ticks if market is completely closed
    if (!marketStatus.canProcessTicks) {
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
    
    // CRITICAL FIX: Reset low prices to open when market opens at 9:15 AM
    if (marketStatus.status === 'ACTIVE_TRADING') {
      await this.resetLowPricesToOpenOnMarketOpen(tickTime);
    }
    
    // Normal processing for ACTIVE_TRADING and POST_MARKET
    await this.processNormalTick(tick, tickTime, marketStatus);
  }

  /**
   * CRITICAL FIX: Reset low prices to open when market opens at 9:15 AM
   * This fixes the issue where 1-hour candles show pre-market lows instead of trading session lows
   */
  private marketOpenLowResetDone = false; // Track if reset was done today
  
  private async resetLowPricesToOpenOnMarketOpen(tickTime: Date): Promise<void> {
    // Only do this once at market open (9:15 AM)
    const hour = tickTime.getHours();
    const minute = tickTime.getMinutes();
    const isMarketOpenTime = hour === 9 && minute === 15;
    
    // If it's exactly 9:15 and we haven't done the reset today
    if (isMarketOpenTime && !this.marketOpenLowResetDone) {
      let resetCount = 0;
      
      for (const [key, candle] of this.candleCache.entries()) {
        // Only reset candles that were created during pre-market/price-discovery
        // and have low values from pre-market period
        if (candle.low < candle.open) {
          candle.low = candle.open; // Reset low to opening price
          candle.lastUpdated = this.createISTTimestamp();
          resetCount++;
        }
      }
      
      this.marketOpenLowResetDone = true;
      
      if (resetCount > 0) {
        this.logger.log(`🔥 MARKET OPEN FIX: Reset low prices to open for ${resetCount} candles at 9:15 AM (removed pre-market lows)`);
      }
    }
    
    // Reset the flag at end of trading day for next day
    if (hour >= 16) { // After 4 PM
      this.marketOpenLowResetDone = false;
    }
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
        
      } else {
        // Create new candle with first tick price as open
        const openPrice = tick.ltp;
        
        candle = {
          exchangeToken: tick.token,
          symbol: tick.name || tick.token,
          name: tick.name || '',
          interval,
          datetime: candleStart,
          open: openPrice,
          high: Math.max(openPrice, tick.ltp),
          low: Math.min(openPrice, tick.ltp),
          close: tick.ltp,
          volume: tick.volume || 0,
          tickCount: 1,
          lastUpdated: this.createISTTimestamp(),
        };
        
        this.candleCache.set(key, candle);
      }
    }
  }

  /**
   * Sync in-memory candles to database - FIXED: Only store during active trading hours + safe cleanup
   */
  private async syncToDatabase(): Promise<void> {
    const candlesToSync = Array.from(this.candleCache.values());
    const now = this.createISTTimestamp();
    const marketStatus = this.getMarketStatus(now);
    
    // Only store historical candles during ACTIVE_TRADING hours
    const shouldStoreToDatabase = marketStatus.status === 'ACTIVE_TRADING';
    
    let completedCandles = 0;
    let cleanedCandles = 0;
    const candlesToRemove: string[] = [];
    
    for (const candle of candlesToSync) {
      const intervalEnd = this.getIntervalEnd(candle.datetime, candle.interval);
      const isCompleted = now >= intervalEnd;
      
      if (isCompleted) {
        completedCandles++;
        
        // Store to database ONLY during active trading hours
        if (shouldStoreToDatabase) {
          try {
            await this.saveToHistoricalTable(candle);
            
            // Only mark for removal AFTER successful database save
            const key = `${candle.exchangeToken}-${candle.interval}-${candle.datetime.getTime()}`;
            candlesToRemove.push(key);
            
          } catch (error) {
            this.logger.error(`Failed to save candle to database: ${candle.exchangeToken}-${candle.interval}`, error);
            // Don't remove from cache if database save failed
          }
        } else {
          // During non-active hours, keep completed candles in memory
          // They will be stored when market opens or during next active period
          this.logger.debug(`Keeping completed candle in memory (market status: ${marketStatus.status}): ${candle.exchangeToken}-${candle.interval}`);
        }
      }
      // Active candles always stay in memory until complete
    }
    
    // Safe cleanup: Only remove candles that were successfully saved
    for (const key of candlesToRemove) {
      this.candleCache.delete(key);
      cleanedCandles++;
    }
    
    if (completedCandles > 0) {
      this.logger.debug(`Sync summary - Market: ${marketStatus.status}, Completed: ${completedCandles}, Stored: ${shouldStoreToDatabase ? cleanedCandles : 0}, Kept in memory: ${completedCandles - cleanedCandles}`);
    }
  }

  /**
   * Finalize a completed candle - Save directly to historical table only
   */
  private async finalizeCompletedCandle(candle: InMemoryCandle): Promise<void> {
    try {
      // Save directly to appropriate historical interval table
      // No need for temporary table - in-memory cache serves as temporary storage
      await this.saveToHistoricalTable(candle);
    } catch (error) {
      this.logger.error(`Error finalizing candle:`, error);
    }
  }

  /**
   * Create next interval candle with NEW open price logic
   */
  private async createNextIntervalCandle(completedCandle: InMemoryCandle, nextIntervalStart: Date): Promise<void> {
    const nextKey = `${completedCandle.exchangeToken}-${completedCandle.interval}-${nextIntervalStart.getTime()}`;
    
    // Check if next candle already exists (might have been created by tick processing)
    if (this.candleCache.has(nextKey)) {
      return;
    }
    
    // Don't create next candle automatically - let first tick create it with fresh open price
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
      case '1w':
        // Set to previous Monday at 00:00:00 IST (weekly period)
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
      case '1w': endTime.setDate(endTime.getDate() + 7); break;
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
   * Get the appropriate repository based on interval
   */
  private getRepositoryForInterval(interval: string): Repository<any> | null {
    const repositoryMap = {
      '1m': this.candles1mRepository,
      '3m': this.candles3mRepository,
      '5m': this.candles5mRepository,
      '10m': this.candles10mRepository,
      '15m': this.candles15mRepository,
      '30m': this.candles30mRepository,
      '1h': this.candles1hRepository,
      '2h': this.candles2hRepository,
      '4h': this.candles4hRepository,
      '1d': this.candles1dRepository,
      '1w': this.candles1wRepository, // 1w maps to weekly table
      '1M': this.candlesMonthRepository,
    };
    
    return repositoryMap[interval] || null;
  }

  /**
   * Save completed candle to appropriate historical table
   */
  private async saveToHistoricalTable(candle: InMemoryCandle): Promise<void> {
    try {
      const repository = this.getRepositoryForInterval(candle.interval);
      
      if (!repository) {
        this.logger.warn(`No repository found for interval: ${candle.interval}`);
        return;
      }

      // Check if candle already exists in historical table
      const existingCandle = await repository.findOne({
        where: {
          exchange_token: candle.exchangeToken,
          date: candle.datetime,
        },
      });

      if (existingCandle) {
        // Update existing historical candle
        await repository.update(
          { uuid: existingCandle.uuid },
          {
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
            updatedAt: this.createISTTimestamp(),
          }
        );
      } else {
        // Create new historical candle
        const historicalCandle = repository.create({
          symbol: candle.symbol,
          name: candle.name,
          exchange_token: candle.exchangeToken,
          date: candle.datetime,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        });
        
        await repository.save(historicalCandle);
      }
    } catch (error) {
      this.logger.error(`Error saving candle to historical table (${candle.interval}):`, error);
    }
  }

  /**
   * Migrate all in-memory candles to their respective historical interval tables
   */
  async migrateToHistoricalTables(): Promise<{
    totalProcessed: number;
    successCount: number;
    errorCount: number;
    intervalBreakdown: Record<string, { success: number; errors: number }>;
  }> {
    const allCandles = Array.from(this.candleCache.values());
    let totalProcessed = 0;
    let successCount = 0;
    let errorCount = 0;
    const intervalBreakdown: Record<string, { success: number; errors: number }> = {};
    
    for (const candle of allCandles) {
      totalProcessed++;
      
      // Initialize interval stats if needed
      if (!intervalBreakdown[candle.interval]) {
        intervalBreakdown[candle.interval] = { success: 0, errors: 0 };
      }
      
      try {
        await this.saveToHistoricalTable(candle);
        successCount++;
        intervalBreakdown[candle.interval].success++;
      } catch (error) {
        errorCount++;
        intervalBreakdown[candle.interval].errors++;
        this.logger.error(`Error migrating candle ${candle.exchangeToken}-${candle.interval}:`, error);
      }
    }
    
    return {
      totalProcessed,
      successCount,
      errorCount,
      intervalBreakdown,
    };
  }

  /**
   * Migrate completed candles to historical tables and clean from memory
   */
  async migrateCompletedCandles(): Promise<{
    migratedCount: number;
    remainingCount: number;
    intervalBreakdown: Record<string, number>;
  }> {
    const now = this.createISTTimestamp();
    const allCandles = Array.from(this.candleCache.entries());
    let migratedCount = 0;
    const intervalBreakdown: Record<string, number> = {};
    
    for (const [key, candle] of allCandles) {
      const intervalEnd = this.getIntervalEnd(candle.datetime, candle.interval);
      const isCompleted = now >= intervalEnd;
      
      if (isCompleted) {
        try {
          // Save to historical table
          await this.saveToHistoricalTable(candle);
          
          // Remove from memory cache
          this.candleCache.delete(key);
          
          migratedCount++;
          intervalBreakdown[candle.interval] = (intervalBreakdown[candle.interval] || 0) + 1;
        } catch (error) {
          this.logger.error(`Error migrating completed candle ${key}:`, error);
        }
      }
    }
    
    return {
      migratedCount,
      remainingCount: this.candleCache.size,
      intervalBreakdown,
    };
  }

  /**
   * Get candles from historical table for a specific interval
   */
  async getHistoricalCandles(
    interval: string,
    exchangeToken?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const repository = this.getRepositoryForInterval(interval);
      
      if (!repository) {
        throw new Error(`No repository found for interval: ${interval}`);
      }
      
      const queryBuilder = repository.createQueryBuilder('candle');
      
      if (exchangeToken) {
        queryBuilder.where('candle.exchange_token = :exchangeToken', { exchangeToken });
      }
      
      if (startDate) {
        queryBuilder.andWhere('candle.date >= :startDate', { startDate });
      }
      
      if (endDate) {
        queryBuilder.andWhere('candle.date <= :endDate', { endDate });
      }
      
      return await queryBuilder
        .orderBy('candle.date', 'DESC')
        .limit(limit)
        .getMany();
        
    } catch (error) {
      this.logger.error(`Error fetching historical candles for ${interval}:`, error);
      return [];
    }
  }

  /**
   * Get statistics about historical tables
   */
  async getHistoricalTableStats(): Promise<Record<string, { count: number; latestDate: Date | null; oldestDate: Date | null }>> {
    const stats: Record<string, { count: number; latestDate: Date | null; oldestDate: Date | null }> = {};
    
    for (const interval of this.intervals) {
      const repository = this.getRepositoryForInterval(interval);
      
      if (repository) {
        try {
          const count = await repository.count();
          const latest = await repository.findOne({
            order: { date: 'DESC' }
          });
          const oldest = await repository.findOne({
            order: { date: 'ASC' }
          });
          
          stats[interval] = {
            count,
            latestDate: latest?.date || null,
            oldestDate: oldest?.date || null,
          };
        } catch (error) {
          this.logger.error(`Error getting stats for ${interval}:`, error);
          stats[interval] = { count: 0, latestDate: null, oldestDate: null };
        }
      }
    }
    
    return stats;
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
   * Force sync all candles to historical tables (for testing/debugging)
   */
  async forceSyncAll(): Promise<void> {
    const candlesToSync = Array.from(this.candleCache.values());
    for (const candle of candlesToSync) {
      await this.saveToHistoricalTable(candle);
    }
  }

  /**
   * Clear all in-memory candles (for testing/debugging)
   */
  clearCache(): { clearedCount: number; message: string } {
    const clearedCount = this.candleCache.size;
    this.candleCache.clear();

    
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
    
    // Then check historical tables for previous candle
    try {
      const repository = this.getRepositoryForInterval(interval);
      if (!repository) {
        return null;
      }

      const prevCandleDb = await repository.findOne({
        where: {
          exchange_token: token,
          date: prevCandleStart,
        },
        order: { date: 'DESC' },
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
    const marketStatus = this.getMarketStatus(now);
    
    if (marketStatus.status === 'PRE_MARKET') {
      // Clean up previous day candles and reset daily flags
      await this.cleanupPreviousDayCandles();
      this.pendingCandlesStoredToday = false;
    } else if (marketStatus.status === 'ACTIVE_TRADING') {
      // When market opens for active trading, store any pending completed candles
      await this.storePendingCompletedCandles();
      this.pendingCandlesStoredToday = true;
    }
  }

  /**
   * Store any completed candles that were kept in memory during non-active hours
   * FIXED: Only store candles created during or after 9:15 AM (ACTIVE_TRADING)
   */
  private async storePendingCompletedCandles(): Promise<void> {
    const candlesToCheck = Array.from(this.candleCache.values());
    const now = this.createISTTimestamp();
    let storedCount = 0;
    let rejectedCount = 0;
    
    for (const candle of candlesToCheck) {
      const intervalEnd = this.getIntervalEnd(candle.datetime, candle.interval);
      const isCompleted = now >= intervalEnd;
      
      if (isCompleted && candle.datetime < now) {
        // CRITICAL FIX: Only store candles created during or after active trading hours
        const candleHour = candle.datetime.getHours();
        const candleMinute = candle.datetime.getMinutes();
        const candleTimeInMinutes = candleHour * 60 + candleMinute;
        const activeStart = 9 * 60 + 15; // 9:15 AM in minutes from midnight
        
        if (candleTimeInMinutes >= activeStart) {
          // This candle was created during or after 9:15 AM - store it
          try {
            await this.saveToHistoricalTable(candle);
            
            // Remove from cache after successful save
            const key = `${candle.exchangeToken}-${candle.interval}-${candle.datetime.getTime()}`;
            this.candleCache.delete(key);
            storedCount++;
            
          } catch (error) {
            this.logger.error(`Failed to store pending candle: ${candle.exchangeToken}-${candle.interval}`, error);
          }
        } else {
          // This candle was created before 9:15 AM (pre-market/price discovery) - reject and remove
          const key = `${candle.exchangeToken}-${candle.interval}-${candle.datetime.getTime()}`;
          this.candleCache.delete(key);
          rejectedCount++;
          this.logger.debug(`🚫 Rejected pre-market candle: ${candle.exchangeToken}-${candle.interval} at ${candle.datetime.toISOString()}`);
        }
      }
    }
    
    if (storedCount > 0 || rejectedCount > 0) {
      this.logger.log(`📊 Processed pending candles: ${storedCount} stored, ${rejectedCount} rejected (pre-market)`);
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
    

  }
}
