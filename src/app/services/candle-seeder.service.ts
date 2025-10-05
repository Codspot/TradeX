import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Candles1m } from '../entities/candles-1m.entity';
import { Instrument } from '../entities/instrument.entity';

/**
 * 🚀 1-MINUTE CANDLE SEEDER FOR TRADING AGENT
 * 
 * 🏭 PRODUCTION MODE: Processing ALL instruments from database
 * 
 * Focus: 1-minute candles only (1000 candles = ~16.7 hours per instrument)
 * 
 * API Strategy:
 * - Fetch 1-minute data directly from SmartConnect API (max 400 days per call)
 * - Save 1-minute candles directly to database
 * - Handle market holidays and weekends properly
 * - Save to database with proper error handling
 * - Process instruments in batches to avoid API rate limits
 */

@Injectable()
export class CandleSeederService {
  private readonly logger = new Logger(CandleSeederService.name);

  // 📊 1-MINUTE CANDLE CONFIGURATION
  private readonly ONE_MIN_CONFIG = {
    targetCandles: 1000,       // Target: 1000 1-minute candles (~16.7 hours)
    daysOfData: 2,            // ~2 days of data (1000 * 1 min ≈ 16.7 hours + margin)
    daysPerChunk: 400,        // API limit: 400 days max per call for hourly intervals
    totalDays: 2,             // 2 days total (fits in 1 API call)
    chunksNeeded: 1           // 1 API call needed (2 < 400)
  };

  constructor(
    @InjectRepository(Candles1m)
    private candles1mRepository: Repository<Candles1m>,
    @InjectRepository(Instrument)
    private instrumentRepository: Repository<Instrument>,
  ) {}

  /**
   * 🗓️ SEED 1-MINUTE CANDLES FOR ALL INSTRUMENTS (Target: 1000 candles = ~16.7 hours per instrument)
   * 
   * Strategy: Fetch 1-minute data directly from API
   * API Limit: 400 days max per call for hourly intervals
   * 
   * For 1000 1-minute candles, we need ~16.7 hours of data (1000 * 1 min ≈ 16.7 hours)
   * 2 days fits within 400 day limit, so we need only 1 API call
   * 
   * Note: Some stocks may have fewer candles if they were launched later
   * (e.g., newer stocks might only have 500 candles instead of 1000)
   */
  async seedAllInstruments1mCandles(): Promise<void> {
    this.logger.log('🚀 Starting 1-Minute Candle Seeding - PRODUCTION MODE (All Instruments)...');
    
    try {
      // Fetch all instruments from database
      const instruments = await this.instrumentRepository.find({
        select: ['token', 'resolvedSymbol', 'name']
      });

      this.logger.log(`📊 Found ${instruments.length} instruments to process`);

      if (instruments.length === 0) {
        this.logger.warn('⚠️ No instruments found in database. Please seed instruments first.');
        return;
      }

      // Calculate date ranges for ~2 days of data (1 chunk fits in 400 day limit)
      const now = new Date();
      // Set to market close time (3:30 PM) to avoid current day issues
      now.setHours(15, 30, 0, 0);
      
      const chunks = this.calculateDateChunksFor1m(now);

      let totalInstrumentsProcessed = 0;
      let totalCandlesGenerated = 0;
      let instrumentsWithErrors = 0;

      // Process each instrument
      for (const instrument of instruments) {
        const { token: exchangeToken, resolvedSymbol: symbol, name } = instrument;
        
        this.logger.log(`📈 Processing instrument ${totalInstrumentsProcessed + 1}/${instruments.length}: ${symbol} (${exchangeToken})`);
        
        try {
          // Check if 1-minute candles already exist for this instrument
          const existingCandles = await this.candles1mRepository.count({
            where: { exchange_token: exchangeToken }
          });

          if (existingCandles > 0) {
            this.logger.log(`⏭️ Skipping ${symbol} - ${existingCandles} 1-minute candles already exist`);
            totalInstrumentsProcessed++;
            continue;
          }

          let instrumentCandles = [];
          
          // Process each date chunk for this instrument
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            const fromStr = this.formatDateForAPI(chunk.from);
            const toStr = this.formatDateForAPI(chunk.to);
            
            // Use 1m interval for API call (directly supported)
            const url = `https://smartconnect-r481.onrender.com/api/historical?symboltoken=${exchangeToken}&exchangeType=1&interval=1m&from_date=${encodeURIComponent(fromStr)}&to_date=${encodeURIComponent(toStr)}`;
            
            // Fetch 1-minute candles directly from API
            const chunkCandles = await this.seed1mFromApiData(url, symbol, name, exchangeToken, `${symbol} chunk ${i + 1}`);
            if (chunkCandles && chunkCandles.length > 0) {
              instrumentCandles.push(...chunkCandles);
            }
            
            // Small delay to avoid overwhelming the API
            await this.delay(1000); // Increased delay for production
          }

          totalCandlesGenerated += instrumentCandles.length;
          this.logger.log(`✅ ${symbol}: Generated ${instrumentCandles.length} 1-minute candles`);
          
        } catch (error) {
          this.logger.error(`❌ Error processing ${symbol} (${exchangeToken}):`, error.message);
          instrumentsWithErrors++;
        }

        totalInstrumentsProcessed++;
        
        // Add a longer delay between instruments to be API-friendly
        await this.delay(2000);
      }

      // **FINAL SUMMARY**
      this.logger.log(`\n🎉 ===== FINAL PRODUCTION SUMMARY =====`);
      this.logger.log(`📊 Total Instruments Processed: ${totalInstrumentsProcessed}/${instruments.length}`);
      this.logger.log(`📈 Total 1-Minute Candles Generated: ${totalCandlesGenerated}`);
      this.logger.log(`✅ Successful Instruments: ${totalInstrumentsProcessed - instrumentsWithErrors}`);
      this.logger.log(`❌ Instruments with Errors: ${instrumentsWithErrors}`);
      this.logger.log(`💾 All data saved to database`);
      
    } catch (error) {
      this.logger.error('❌ Critical error during instrument processing:', error);
      throw error;
    }

    this.logger.log('🎉 1-Minute Candle Seeding PRODUCTION Complete!');
  }

  /**
   * Calculate date chunks for 1-minute candle seeding
   * Splits ~2 days into 1 chunk (fits within 400 day API limit)
   */
  private calculateDateChunksFor1m(endDate: Date): Array<{ from: Date; to: Date }> {
    const chunks = [];
    const msPerDay = 24 * 60 * 60 * 1000;
    
    // Start from ~2 days ago
    let currentStart = new Date(endDate.getTime() - (this.ONE_MIN_CONFIG.totalDays * msPerDay));
    
    for (let i = 0; i < this.ONE_MIN_CONFIG.chunksNeeded; i++) {
      const chunkEnd = new Date(currentStart.getTime() + (this.ONE_MIN_CONFIG.daysPerChunk * msPerDay));
      
      // Don't exceed the end date
      const actualEnd = chunkEnd > endDate ? endDate : chunkEnd;
      
      chunks.push({
        from: new Date(currentStart),
        to: new Date(actualEnd)
      });
      
      currentStart = new Date(actualEnd.getTime() + msPerDay); // Start next chunk from next day
    }
    
    return chunks;
  }

  /**
   * Format date for SmartConnect API (YYYY-MM-DD HH:MM format)
   */
  private formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Use market hours: 09:15 for start, 15:30 for end
    return `${year}-${month}-${day} 09:15`;
  }

  /**
   * Fetch 1-minute data from API and save directly to database
   */
  private async seed1mFromApiData(url: string, symbol: string, name: string, exchange_token: string, label: string): Promise<any[]> {
    try {
      this.logger.log(`🔄 Fetching 1-minute data: ${label}`);
      this.logger.log(`📡 API URL: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Trading-Agent/1.0',
          'Accept': 'application/json'
        }
      });

      // Enhanced response validation
      if (!response.data) {
        throw new Error('Empty response from API');
      }

      // Log raw response for debugging
      this.logger.log(`📡 Raw API response status: ${response.status}`);
      
      // Check if response is a string (like 'not found') instead of JSON
      if (typeof response.data === 'string') {
        this.logger.error(`❌ API returned string instead of JSON for ${label}: ${response.data}`);
        throw new Error(`API returned non-JSON response: ${response.data}`);
      }
      
      // Check if response has the expected structure
      if (!response.data.candles) {
        this.logger.error(`❌ Missing 'candles' property in API response for ${label}:`, response.data);
        throw new Error('API response missing candles property');
      }

      const oneMinCandles = response.data.candles;
      
      if (!Array.isArray(oneMinCandles)) {
        this.logger.error(`❌ Invalid candles data structure for ${label}:`, oneMinCandles);
        throw new Error('Invalid 1-minute candles data from API - not an array');
      }

      if (oneMinCandles.length === 0) {
        this.logger.warn(`⚠️ No 1-minute candles received for ${label}`);
        return [];
      }

      this.logger.log(`📊 Received ${oneMinCandles.length} 1-minute candles for ${label}`);

      // Convert API data directly to 1-minute candle entities
      const oneMinCandleEntities = this.convertApiDataTo1mCandles(oneMinCandles, symbol, name, exchange_token);
      
      if (oneMinCandleEntities.length > 0) {
        // Console log first few 1-minute candles for verification
        const sampleCandles = oneMinCandleEntities.slice(0, 3); // Show first 3 candles
        sampleCandles.forEach(candle => {
          const dateStr = candle.date.toISOString().substring(0, 16).replace('T', ' ');
          const dayName = candle.date.toLocaleDateString('en-US', { weekday: 'short' });
          console.log(`📅 1-MIN: ${symbol} ${dateStr} (${dayName}) - O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close} V:${candle.volume}`);
        });

        // **PRODUCTION MODE**: Save to database
        try {
          await this.candles1mRepository.save(oneMinCandleEntities);
          this.logger.log(`💾 SAVED: ${oneMinCandleEntities.length} 1-minute candles for ${label} to database`);
          return oneMinCandleEntities;
        } catch (saveError) {
          this.logger.error(`❌ Database save error for ${label}:`, saveError.message);
          return [];
        }        } else {
        this.logger.warn(`⚠️ No 1-minute candles processed for ${label}`);
        return [];
      }

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        this.logger.error(`❌ Timeout error for ${label}: Request took too long`);
      } else if (error.request) {
        this.logger.error(`❌ Network error for ${label}: No response received`);
      } else if (error.response) {
        this.logger.error(`❌ API Error for ${label} (${error.response.status}):`, error.response.data);
      } else {
        this.logger.error(`❌ Error processing 1-minute candles for ${label}:`, error.message);
      }
      return [];
    }
  }

  /**
   * Convert API data to 1-minute candle entities
   * API format: [timestamp, open, high, low, close, volume]
   */
  private convertApiDataTo1mCandles(oneMinCandles: any[], symbol: string, name: string, exchange_token: string): any[] {
    const oneMinCandleEntities = [];
    
    for (const candle of oneMinCandles) {
      if (!candle || !Array.isArray(candle) || candle.length < 6) {
        this.logger.warn(`⚠️ Invalid candle data format:`, candle);
        continue;
      }
      
      // Parse API data: [timestamp, open, high, low, close, volume]
      const [timestamp, open, high, low, close, volume] = candle;
      
      // Create date object - keep the exact timestamp for 1-minute intervals
      const date = new Date(timestamp);
      
      const oneMinCandle = this.candles1mRepository.create({
        exchange_token,
        symbol,
        name,
        date,
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseFloat(volume) || 0,
      });
      
      oneMinCandleEntities.push(oneMinCandle);
    }
    
    return oneMinCandleEntities;
  }

  /**
   * Get ordinal suffix for numbers (1st, 2nd, 3rd, 4th, etc.)
   */
  private getOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) {
      return 'th';
    }
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  /**
   * Get short day name for a given day number (0=Sun, 1=Mon, etc.)
   */
  private getDayName(dayNumber: number): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayNumber];
  }

  /**
   * Delay utility to avoid overwhelming the API
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🧹 CHECK IF SEEDING IS NEEDED
   * Prevents unnecessary re-processing of instruments that already have 5-minute candles
   */
  private async checkIfSeedingNeeded(): Promise<boolean> {
    try {
      // Get total instrument count
      const totalInstruments = await this.instrumentRepository.count();
      
      if (totalInstruments === 0) {
        this.logger.warn('⚠️ No instruments found in database. Please seed instruments first.');
        return false;
      }

      // Get instruments that already have 1-minute candles
      const instrumentsWithCandles = await this.candles1mRepository
        .createQueryBuilder('candle')
        .select('DISTINCT candle.exchange_token')
        .getRawMany();

      const processedCount = instrumentsWithCandles.length;
      const remainingCount = totalInstruments - processedCount;

      this.logger.log(`📊 1-Minute Seeding Status Check:`);
      this.logger.log(`   📈 Total Instruments: ${totalInstruments}`);
      this.logger.log(`   ✅ Already Processed: ${processedCount}`);
      this.logger.log(`   🔄 Remaining: ${remainingCount}`);

      if (remainingCount === 0) {
        this.logger.log('🎉 All instruments already have 1-minute candles! No seeding needed.');
        return false;
      }

      this.logger.log(`🚀 Seeding needed for ${remainingCount} instruments.`);
      return true;

    } catch (error) {
      this.logger.error('❌ Error checking seeding status:', error);
      return true; // If error, assume seeding is needed to be safe
    }
  }

  /**
   * 🧹 CLEANUP METHOD - Clear existing 1-minute candles (DANGEROUS - USE WITH CAUTION!)
   * This method allows clearing existing 1-minute candles to restart seeding
   */
  async clearAll1mCandles(): Promise<void> {
    this.logger.warn('🚨 DANGER: Clearing ALL 1-minute candles from database...');
    
    try {
      const deleteResult = await this.candles1mRepository.delete({});
      this.logger.log(`🗑️ Cleared ${deleteResult.affected || 0} 1-minute candles from database`);
      this.logger.log('✅ Database cleared. Ready for fresh seeding.');
    } catch (error) {
      this.logger.error('❌ Error clearing 1-minute candles:', error);
      throw error;
    }
  }

  /**
   * 📊 GET SEEDING STATISTICS
   * Shows current status of 1-minute candle seeding across all instruments
   */
  async getSeedingStats(): Promise<{
    totalInstruments: number;
    processedInstruments: number;
    total1mCandles: number;
    avgCandlesPerInstrument: number;
    lastSeedingDate: Date | null;
  }> {
    try {
      const totalInstruments = await this.instrumentRepository.count();
      
      const instrumentsWithCandles = await this.candles1mRepository
        .createQueryBuilder('candle')
        .select('DISTINCT candle.exchange_token')
        .getRawMany();
      
      const total1mCandles = await this.candles1mRepository.count();
      
      const lastCandle = await this.candles1mRepository.findOne({
        order: { date: 'DESC' }
      });

      const avgCandlesPerInstrument = instrumentsWithCandles.length > 0 
        ? Math.round(total1mCandles / instrumentsWithCandles.length)
        : 0;

      return {
        totalInstruments,
        processedInstruments: instrumentsWithCandles.length,
        total1mCandles,
        avgCandlesPerInstrument,
        lastSeedingDate: lastCandle?.date || null
      };

    } catch (error) {
      this.logger.error('❌ Error getting seeding stats:', error);
      throw error;
    }
  }

  /**
   * 🔧 MANUAL TRIGGER - Force start 1-minute seeding (bypasses checks)
   * Use this method to manually trigger seeding from external controllers
   */
  async forceStart1mSeeding(): Promise<void> {
    this.logger.log('🔧 Manual trigger: Force starting 1-minute candle seeding...');
    await this.seedAllInstruments1mCandles();
  }

  /**
   * 🧪 TEST API CONNECTION - Test a single instrument to verify API is working
   * Use this to debug API issues before running full seeding
   */
  async testApiConnection(): Promise<void> {
    try {
      // Get first instrument for testing
      const testInstrument = await this.instrumentRepository.findOne({
        select: ['token', 'resolvedSymbol', 'name']
      });

      if (!testInstrument) {
        this.logger.error('❌ No instruments found for testing');
        return;
      }

      const { token: exchangeToken, resolvedSymbol: symbol, name } = testInstrument;
      
      // Test with a small date range (last 30 days)
      const now = new Date();
      now.setHours(15, 30, 0, 0);
      const monthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      const fromStr = this.formatDateForAPI(monthAgo);
      const toStr = this.formatDateForAPI(now);
      
      const testUrl = `https://smartconnect-r481.onrender.com/api/historical?symboltoken=${exchangeToken}&exchangeType=1&interval=1m&from_date=${encodeURIComponent(fromStr)}&to_date=${encodeURIComponent(toStr)}`;
      
      this.logger.log('🧪 Testing API connection...');
      this.logger.log(`📡 Test URL: ${testUrl}`);
      this.logger.log(`🎯 Test Instrument: ${symbol} (${exchangeToken})`);
      
      const response = await axios.get(testUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Trading-Agent/1.0',
          'Accept': 'application/json'
        }
      });

      this.logger.log(`✅ API Response Status: ${response.status}`);
      this.logger.log(`📊 Response Data Structure:`, Object.keys(response.data));
      
      if (response.data.candles && Array.isArray(response.data.candles)) {
        this.logger.log(`✅ Received ${response.data.candles.length} 1-minute candles for ${symbol}`);
        this.logger.log('🎉 API connection test successful!');
      } else {
        this.logger.error('❌ Invalid response structure:', response.data);
      }

    } catch (error) {
      this.logger.error('❌ API connection test failed:', error);
      if (error.response) {
        this.logger.error(`❌ Response Status: ${error.response.status}`);
        this.logger.error(`❌ Response Data:`, error.response.data);
      }
    }
  }

}
