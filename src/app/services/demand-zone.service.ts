import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import {
  GetDemandZonesQueryDto,
  DetectDemandZonesDto,
} from '../core/dtos/requests/demand-zone.dto';
import {
  DemandZoneResponseDto,
  PaginatedDemandZonesResponseDto,
  DemandZoneDetectionResponseDto,
  ZoneStrength,
  ZoneType,
} from '../core/dtos/responses/demand-zone.response.dto';
import { InstrumentService } from './instrument.service';
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

// Temporary interface for demand zones until we have proper entities
interface DemandZone {
  uuid: string;
  symbol: string;
  exchange_token: string;
  timeframe: string;
  zone_type: ZoneType;
  created_at: Date;
  zone_formed_at: Date;
  prices: {
    bottom: number;
    top: number;
    height: number;
    height_percentage: number;
  };
  strength: {
    strength: ZoneStrength;
    score: number;
    details?: string;
  };
  status: {
    is_active: boolean;
    is_tested: boolean;
    test_count: number;
    last_tested_at?: Date;
  };
  details: {
    leg_in_ohlc: {
      open: number;
      high: number;
      low: number;
      close: number;
      percentage_move: number;
      candle_range: number;
      candle_body: number;
    };
    leg_in_percentage: number;
    leg_out_ohlc: {
      open: number;
      high: number;
      low: number;
      close: number;
      percentage_move: number;
      candle_range: number;
      candle_body: number;
    };
    leg_out_percentage: number;
    base_candles: Array<{
      candle_number: number;
      open: number;
      high: number;
      low: number;
      close: number;
      timestamp: string;
      percentage_move: number;
      candle_range: number;
      candle_body: number;
      is_zone_start?: boolean;
      is_zone_end?: boolean;
    }>;
    zone_range: {
      low: number;
      high: number;
      range_points: number;
      range_percentage: number;
    };
    formation_summary: {
      total_candles: number;
      base_candles_count: number;
      base_candles_total_percentage: number;
      base_candles_avg_percentage: number;
      max_base_percentage: number;
      min_base_percentage: number;
      zone_consolidation_percentage: number;
      zone_strength_factors: string[];
    };
    volume_data?: {
      leg_in_volume: number;
      leg_out_volume: number;
      avg_base_volume: number;
    };
  };
  metadata?: {
    detection_version: string;
    market_session: string;
    volatility_context: string;
  };
}

@Injectable()
export class DemandZoneService {
  private readonly logger = new Logger(DemandZoneService.name);
  
  // Cache for detected zones and available symbols
  private detectedZones: DemandZone[] = [];
  private availableSymbols: Map<string, string[]> = new Map(); // timeframe -> symbols[]

  constructor(
    private readonly instrumentService: InstrumentService,
    @InjectRepository(Candles1m)
    private readonly candles1mRepository: Repository<Candles1m>,
    @InjectRepository(Candles3m)
    private readonly candles3mRepository: Repository<Candles3m>,
    @InjectRepository(Candles5m)
    private readonly candles5mRepository: Repository<Candles5m>,
    @InjectRepository(Candles10m)
    private readonly candles10mRepository: Repository<Candles10m>,
    @InjectRepository(Candles15m)
    private readonly candles15mRepository: Repository<Candles15m>,
    @InjectRepository(Candles30m)
    private readonly candles30mRepository: Repository<Candles30m>,
    @InjectRepository(Candles1h)
    private readonly candles1hRepository: Repository<Candles1h>,
    @InjectRepository(Candles2h)
    private readonly candles2hRepository: Repository<Candles2h>,
    @InjectRepository(Candles4h)
    private readonly candles4hRepository: Repository<Candles4h>,
    @InjectRepository(Candles1d)
    private readonly candles1dRepository: Repository<Candles1d>,
    @InjectRepository(Candles1w)
    private readonly candles1wRepository: Repository<Candles1w>,
    @InjectRepository(CandlesMonth)
    private readonly candlesMonthRepository: Repository<CandlesMonth>,
  ) {
    // Initialize available symbols and detect zones from database
    this.initializeFromDatabase();
  }

  /**
   * Initialize system from database by fetching available symbols and detecting zones
   */
  private async initializeFromDatabase() {
    try {
      await this.loadAvailableSymbols();
      await this.detectAndCacheZones();
      this.logger.log(`Initialized with ${this.detectedZones.length} demand zones from database`);
    } catch (error) {
      this.logger.warn(`Failed to initialize from database: ${error.message}`);
      this.detectedZones = [];
    }
  }

  /**
   * Load available symbols from all candle tables
   */
  private async loadAvailableSymbols() {
    const timeframes = ['1m', '3m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', 'month'];
    
    for (const timeframe of timeframes) {
      try {
        const repository = this.getCandleRepository(timeframe);
        const symbols = await repository
          .createQueryBuilder('candle')
          .select('DISTINCT candle.symbol', 'symbol')
          .getRawMany();
        
        this.availableSymbols.set(timeframe, symbols.map(s => s.symbol));
        this.logger.log(`Loaded ${symbols.length} symbols for ${timeframe} timeframe`);
      } catch (error) {
        this.logger.warn(`Failed to load symbols for ${timeframe}: ${error.message}`);
        this.availableSymbols.set(timeframe, []);
      }
    }
  }

  /**
   * Detect and cache demand zones from database
   */
  private async detectAndCacheZones() {
    // Include ALL key timeframes including weekly and monthly for comprehensive zone detection
    const timeframes = ['5m', '15m', '30m', '1h', '1d', '1w', 'month']; 
    
    for (const timeframe of timeframes) {
      const symbols = this.availableSymbols.get(timeframe) || [];
      
      // Adjust symbol limit based on timeframe - fewer symbols for longer timeframes due to processing time
      let symbolLimit = 10;
      if (timeframe === '1w') symbolLimit = 15; // Weekly zones are valuable, process more symbols
      if (timeframe === 'month') symbolLimit = 20; // Monthly zones are most valuable, process even more
      if (timeframe === '1d') symbolLimit = 12; // Daily zones are important too
      
      this.logger.log(`[INIT] Processing ${timeframe} timeframe: ${symbols.length} available symbols, analyzing first ${symbolLimit}`);
      
      for (const symbol of symbols.slice(0, symbolLimit)) {
        try {
          const zones = await this.detectZonesFromCandles(symbol, timeframe);
          this.detectedZones.push(...zones);
          
          if (zones.length > 0) {
            this.logger.log(`[INIT] Found ${zones.length} zones for ${symbol} ${timeframe}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to detect zones for ${symbol} ${timeframe}: ${error.message}`);
        }
      }
      
      // Log timeframe completion
      const timeframeZones = this.detectedZones.filter(z => z.timeframe === timeframe);
      this.logger.log(`[INIT] Completed ${timeframe}: ${timeframeZones.length} total zones detected`);
    }
  }

  /**
   * Detect demand zones from candle data for a specific symbol and timeframe
   */
  private async detectZonesFromCandles(symbol: string, timeframe: string): Promise<DemandZone[]> {
    try {
      const repository = this.getCandleRepository(timeframe);
      
      this.logger.log(`[DEBUG] Attempting to detect zones for ${symbol} ${timeframe} using repository: ${repository?.constructor?.name}`);
      
      // Get recent candles (last 100 candles for analysis)
      const candles = await repository
        .createQueryBuilder('candle')
        .where('candle.symbol = :symbol', { symbol })
        .orderBy('candle.date', 'DESC')
        .limit(100)
        .getMany();
      
      this.logger.log(`[DEBUG] Found ${candles.length} candles for ${symbol} ${timeframe}`);
      
      if (candles.length < 10) {
        this.logger.warn(`[DEBUG] Not enough data for ${symbol} ${timeframe}: only ${candles.length} candles found (need at least 10)`);
        
        // Try to get any available symbols from this timeframe
        const sampleCandles = await repository
          .createQueryBuilder('candle')
          .select(['candle.symbol'])
          .groupBy('candle.symbol')
          .limit(10)
          .getMany();
        
        const availableSymbols = sampleCandles.map(c => c.symbol).join(', ');
        this.logger.log(`[DEBUG] Available symbols in ${timeframe} table: ${availableSymbols || 'None'}`);
        
        return []; // Not enough data
      }
      
      // Show sample of data for debugging
      if (candles.length > 0) {
        const firstCandle = candles[0];
        const lastCandle = candles[candles.length - 1];
        this.logger.log(`[DEBUG] Data range for ${symbol} ${timeframe}: ${firstCandle.date || firstCandle.timestamp || 'unknown'} to ${lastCandle.date || lastCandle.timestamp || 'unknown'}`);
        this.logger.log(`[DEBUG] Sample candle structure: ${JSON.stringify(Object.keys(firstCandle))}`);
      }
      
      // Reverse to have chronological order for analysis
      candles.reverse();
      
      // Detect both DBR and RBR zones
      this.logger.log(`[DEBUG] Starting DBR zone detection for ${symbol} ${timeframe}`);
      const dbrZones = this.detectDropBaseRallyZones(candles, symbol, timeframe);
      this.logger.log(`[DEBUG] Found ${dbrZones.length} DBR zones for ${symbol} ${timeframe}`);
      
      this.logger.log(`[DEBUG] Starting RBR zone detection for ${symbol} ${timeframe}`);
      const rbrZones = this.detectRallyBaseRallyZones(candles, symbol, timeframe);
      this.logger.log(`[DEBUG] Found ${rbrZones.length} RBR zones for ${symbol} ${timeframe}`);
      
      const totalZones = [...dbrZones, ...rbrZones];
      this.logger.log(`[DEBUG] Total zones detected for ${symbol} ${timeframe}: ${totalZones.length}`);
      
      return totalZones;
    } catch (error) {
      this.logger.error(`Error detecting zones for ${symbol} ${timeframe}: ${error.message}`);
      this.logger.error(`Stack trace: ${error.stack}`);
      return [];
    }
  }

  /**
   * Get the appropriate repository for a given timeframe
   */
  private getCandleRepository(timeframe: string): Repository<any> {
    const timeframeMap = {
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
      '1w': this.candles1wRepository,
      'month': this.candlesMonthRepository, // Use 'month' as primary
      'monthly': this.candlesMonthRepository, // Keep for backward compatibility
    };
    
    return timeframeMap[timeframe] || this.candles15mRepository;
  }

  /**
   * Get demand zones with filtering and pagination
   */
  async getDemandZones(queryDto: GetDemandZonesQueryDto): Promise<PaginatedDemandZonesResponseDto> {
    const { page = 1, limit = 20, symbol, exchange_token, timeframe, zone_strength, is_active, is_tested, from_date, to_date } = queryDto;

    this.logger.log(`Getting demand zones with filters: ${JSON.stringify(queryDto)}`);

    // Filter zones based on query parameters
    let filteredZones = [...this.detectedZones];

    if (symbol) {
      filteredZones = filteredZones.filter(zone => zone.symbol === symbol);
    }

    if (exchange_token) {
      filteredZones = filteredZones.filter(zone => zone.exchange_token === exchange_token);
    }

    if (timeframe) {
      // Handle timeframe parameter normalization - accept both 'monthly' and 'month' but normalize to 'month'
      const normalizedTimeframe = timeframe === 'monthly' ? 'month' : timeframe;
      filteredZones = filteredZones.filter(zone => zone.timeframe === normalizedTimeframe);
    }

    if (zone_strength) {
      filteredZones = filteredZones.filter(zone => zone.strength.strength === zone_strength);
    }

    if (is_active !== undefined) {
      filteredZones = filteredZones.filter(zone => zone.status.is_active === is_active);
    }

    if (is_tested !== undefined) {
      filteredZones = filteredZones.filter(zone => zone.status.is_tested === is_tested);
    }

    if (from_date) {
      const fromDate = new Date(from_date);
      filteredZones = filteredZones.filter(zone => zone.zone_formed_at >= fromDate);
    }

    if (to_date) {
      const toDate = new Date(to_date);
      filteredZones = filteredZones.filter(zone => zone.zone_formed_at <= toDate);
    }

    // Apply pagination
    const total = filteredZones.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedZones = filteredZones.slice(startIndex, endIndex);

    this.logger.log(`Found ${total} zones, returning page ${page} with ${paginatedZones.length} zones`);

    return {
      data: paginatedZones.map(zone => this.mapToResponseDto(zone)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Get a specific demand zone by UUID
   */
  async getDemandZoneByUuid(uuid: string): Promise<DemandZoneResponseDto> {
    this.logger.log(`Getting demand zone by UUID: ${uuid}`);
    
    const zone = this.detectedZones.find(z => z.uuid === uuid);
    if (!zone) {
      throw new NotFoundException(`Demand zone with UUID ${uuid} not found`);
    }

    return this.mapToResponseDto(zone);
  }

  /**
   * Detect demand zones for given parameters
   */
  async detectDemandZones(detectDto: DetectDemandZonesDto): Promise<DemandZoneDetectionResponseDto> {
    const { symbol, exchange_token, timeframe = '15m', lookback_candles = 100, force_redetection = false } = detectDto;
    
    this.logger.log(`Starting demand zone detection with parameters: ${JSON.stringify(detectDto)}`);
    const startTime = Date.now();

    try {
      // Mock detection logic - replace with actual detection algorithm
      const zonesDetected = await this.performZoneDetection(symbol, exchange_token, timeframe, lookback_candles, force_redetection);
      
      const processingTime = Date.now() - startTime;
      const dateRange = this.getDateRange(lookback_candles);

      this.logger.log(`Detection completed: ${zonesDetected} zones detected in ${processingTime}ms`);

      return {
        message: 'Demand zones detected successfully',
        zones_detected: zonesDetected,
        processing_time_ms: processingTime,
        date_range: dateRange,
        parameters: {
          symbol,
          exchange_token,
          timeframe,
          lookback_candles,
        },
        statistics: {
          candles_analyzed: lookback_candles,
          potential_patterns: Math.floor(lookback_candles / 10),
          valid_zones: zonesDetected,
          filtered_zones: Math.floor(zonesDetected * 0.3),
        },
      };
    } catch (error) {
      this.logger.error(`Detection failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Detection failed: ${error.message}`);
    }
  }

  /**
   * Get zone statistics for a symbol
   */
  async getZoneStats(symbol: string, timeframe?: string): Promise<any> {
    this.logger.log(`Getting zone statistics for symbol: ${symbol}, timeframe: ${timeframe || 'all'}`);

    let zones = this.detectedZones.filter(zone => zone.symbol === symbol);
    if (timeframe) {
      zones = zones.filter(zone => zone.timeframe === timeframe);
    }

    const stats = {
      total_zones: zones.length,
      active_zones: zones.filter(z => z.status.is_active).length,
      strong_zones: zones.filter(z => z.strength.strength === 'strong').length,
      medium_zones: zones.filter(z => z.strength.strength === 'medium').length,
      weak_zones: zones.filter(z => z.strength.strength === 'weak').length,
      avg_test_count: zones.length > 0 ? zones.reduce((sum, z) => sum + z.status.test_count, 0) / zones.length : 0,
    };

    this.logger.log(`Zone statistics for ${symbol}: ${JSON.stringify(stats)}`);
    return stats;
  }

  /**
   * Update zone status
   */
  async updateZoneStatus(uuid: string, updateData: { is_active?: boolean; is_tested?: boolean }): Promise<void> {
    this.logger.log(`Updating zone status for UUID: ${uuid}, data: ${JSON.stringify(updateData)}`);

    const zone = this.detectedZones.find(z => z.uuid === uuid);
    if (!zone) {
      throw new NotFoundException(`Demand zone with UUID ${uuid} not found`);
    }

    if (updateData.is_active !== undefined) {
      zone.status.is_active = updateData.is_active;
    }

    if (updateData.is_tested !== undefined) {
      zone.status.is_tested = updateData.is_tested;
      if (updateData.is_tested) {
        zone.status.test_count += 1;
        zone.status.last_tested_at = new Date();
      }
    }

    this.logger.log(`Zone status updated successfully for UUID: ${uuid}`);
  }

  /**
   * Debug method to check candle data availability
   */
  async debugCandleDataAvailability(timeframe?: string, symbol?: string, limit: number = 10): Promise<any> {
    const results: any = { 
      timeframe_analysis: {},
      symbol_analysis: {},
      overall_summary: {
        total_timeframes_checked: 0,
        timeframes_with_data: 0,
        total_symbols_found: 0,
        recommendations: []
      }
    };

    const timeframesToCheck = timeframe ? [timeframe] : ['1m', '3m', '5m', '15m', '30m', '1h', '1d'];
    
    for (const tf of timeframesToCheck) {
      try {
        const repository = this.getCandleRepository(tf);
        this.logger.log(`[DEBUG] Checking ${tf} timeframe using ${repository?.constructor?.name}`);
        
        // Get total count
        const totalCount = await repository
          .createQueryBuilder('candle')
          .getCount();

        // Get available symbols - use simpler query to avoid SQL issues
        let symbolsQuery: any[] = [];
        let availableSymbols: string[] = [];
        
        try {
          symbolsQuery = await repository
            .createQueryBuilder('candle')
            .select('DISTINCT candle.symbol', 'symbol')
            .getRawMany();
          availableSymbols = symbolsQuery.map(c => c.symbol);
        } catch (symbolError) {
          // Try alternative column names if 'symbol' doesn't exist
          this.logger.warn(`[DEBUG] Symbol query failed for ${tf}, trying alternative columns: ${symbolError.message}`);
          try {
            // Try 'Symbol' or 'stock_symbol' or other common names
            const altQuery = await repository
              .createQueryBuilder('candle')
              .limit(5)
              .getMany();
            
            if (altQuery.length > 0) {
              const sampleCandle = altQuery[0];
              this.logger.log(`[DEBUG] Sample candle columns for ${tf}: ${JSON.stringify(Object.keys(sampleCandle))}`);
              
              // Try to find symbol-like column
              const possibleSymbolColumns = Object.keys(sampleCandle).filter(key => 
                key.toLowerCase().includes('symbol') || 
                key.toLowerCase().includes('stock') ||
                key.toLowerCase().includes('name')
              );
              
              if (possibleSymbolColumns.length > 0) {
                const symbolCol = possibleSymbolColumns[0];
                availableSymbols = [...new Set(altQuery.map(c => c[symbolCol]))];
                this.logger.log(`[DEBUG] Using column '${symbolCol}' as symbol for ${tf}`);
              }
            }
          } catch (altError) {
            this.logger.error(`[DEBUG] Alternative query also failed for ${tf}: ${altError.message}`);
          }
        }
        
        // If specific symbol requested, check it
        let symbolSpecificData = null;
        if (symbol) {
          const symbolCandles = await repository
            .createQueryBuilder('candle')
            .where('candle.symbol = :symbol', { symbol })
            .orderBy('candle.date', 'DESC')
            .limit(limit)
            .getMany();
            
          symbolSpecificData = {
            candle_count: symbolCandles.length,
            sample_candles: symbolCandles.slice(0, 3).map(c => ({
              symbol: c.symbol,
              date: c.date || c.timestamp || 'unknown',
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume || 'unknown'
            }))
          };
        }

        results.timeframe_analysis[tf] = {
          repository_name: repository?.constructor?.name,
          total_candles: totalCount,
          unique_symbols: availableSymbols.length,
          available_symbols: availableSymbols.slice(0, 10), // Show first 10
          symbol_specific: symbolSpecificData
        };

        results.overall_summary.total_timeframes_checked++;
        if (totalCount > 0) {
          results.overall_summary.timeframes_with_data++;
          results.overall_summary.total_symbols_found += availableSymbols.length;
        }

      } catch (error) {
        this.logger.error(`[DEBUG] Error checking ${tf}: ${error.message}`);
        results.timeframe_analysis[tf] = {
          error: error.message,
          status: 'failed'
        };
      }
    }

    // Generate recommendations
    if (results.overall_summary.timeframes_with_data === 0) {
      results.overall_summary.recommendations.push("No candle data found in any timeframe. Check if data seeding/import has been completed.");
    } else if (results.overall_summary.timeframes_with_data < results.overall_summary.total_timeframes_checked) {
      results.overall_summary.recommendations.push("Some timeframes have no data. Consider running data import for missing timeframes.");
    }

    if (symbol && !Object.values(results.timeframe_analysis).some((tf: any) => tf.symbol_specific?.candle_count > 0)) {
      results.overall_summary.recommendations.push(`Symbol '${symbol}' not found in any timeframe. Check if the symbol name is correct or if data exists for this symbol.`);
    }

    return results;
  }

  /**
   * Private method to perform actual zone detection
   * Updated to prioritize real data over mock detection
   */
  private async performZoneDetection(
    symbol?: string, 
    exchange_token?: string, 
    timeframe: string = '15m', 
    lookbackCandles: number = 100, 
    forceRedetection: boolean = false
  ): Promise<number> {
    
    this.logger.log(`[DEBUG] Starting zone detection: symbol=${symbol}, timeframe=${timeframe}, lookback=${lookbackCandles}, forceRedetection=${forceRedetection}`);
    
    // Try actual detection with database data first
    if (symbol) {
      try {
        const zones = await this.detectZonesFromCandles(symbol, timeframe);
        
        if (zones.length > 0) {
          this.logger.log(`[DEBUG] Real detection successful: found ${zones.length} zones`);
          
          // Avoid duplicates if not forcing redetection
          if (!forceRedetection) {
            const newZones = zones.filter(zone => 
              !this.detectedZones.some(existing => 
                existing.symbol === zone.symbol && 
                existing.timeframe === zone.timeframe && 
                existing.zone_type === zone.zone_type &&
                Math.abs(existing.prices.bottom - zone.prices.bottom) < 1
              )
            );
            this.detectedZones.push(...newZones);
            this.logger.log(`[DEBUG] Added ${newZones.length} new unique zones (${zones.length - newZones.length} were duplicates)`);
            return newZones.length;
          } else {
            // Force redetection - clear existing zones for this symbol/timeframe first
            this.detectedZones = this.detectedZones.filter(existing => 
              !(existing.symbol === symbol && existing.timeframe === timeframe)
            );
            this.detectedZones.push(...zones);
            this.logger.log(`[DEBUG] Force redetection: replaced zones with ${zones.length} new zones`);
            return zones.length;
          }
        } else {
          this.logger.warn(`[DEBUG] Real detection returned zero zones - this might indicate data issues`);
        }
      } catch (error) {
        this.logger.error(`[DEBUG] Real detection failed: ${error.message}`);
      }
    }
    
    // Fallback: Try detection on available symbols if no specific symbol provided
    if (!symbol) {
      this.logger.log(`[DEBUG] No symbol specified - trying detection on available symbols for timeframe ${timeframe}`);
      
      const repository = this.getCandleRepository(timeframe);
      try {
        // Get available symbols
        const sampleCandles = await repository
          .createQueryBuilder('candle')
          .select(['candle.symbol'])
          .groupBy('candle.symbol')
          .limit(10)
          .getMany();
        
        let totalZonesFound = 0;
        
        for (const candle of sampleCandles) {
          const symbolZones = await this.detectZonesFromCandles(candle.symbol, timeframe);
          if (symbolZones.length > 0) {
            this.detectedZones.push(...symbolZones);
            totalZonesFound += symbolZones.length;
          }
        }
        
        this.logger.log(`[DEBUG] Multi-symbol detection completed: ${totalZonesFound} total zones found`);
        return totalZonesFound;
      } catch (error) {
        this.logger.error(`[DEBUG] Multi-symbol detection failed: ${error.message}`);
      }
    }
    
    // Final fallback to mock detection (only if we have no real data at all)
    this.logger.warn(`[DEBUG] Using fallback mock detection - this indicates no real candle data is available`);
    return 0; // Return 0 instead of mock data to highlight the data issue
  }

  /**
   * Create a demand zone from actual candle data
   */
  private createZoneFromCandles(
    symbol: string, 
    exchange_token: string, 
    timeframe: string, 
    zone_type: ZoneType,
    legInCandle: any,
    baseCandles: any[],
    legOutCandle: any
  ): DemandZone {
    const uuid = this.generateUuid();
    
    // Calculate zone boundaries from actual candle data
    const baseBodyLows = baseCandles.map(c => Math.min(c.open, c.close));
    const baseBodyHighs = baseCandles.map(c => Math.max(c.open, c.close));
    
    const zoneLow = Math.min(...baseBodyLows);
    const zoneHigh = Math.max(...baseBodyHighs);
    const zoneHeight = zoneHigh - zoneLow;
    const zoneRangePercentage = ((zoneHeight) / zoneLow) * 100;
    
    // Calculate percentages for legs
    const legInPercentage = Math.abs(((legInCandle.close - legInCandle.open) / legInCandle.open) * 100);
    const legOutPercentage = Math.abs(((legOutCandle.close - legOutCandle.open) / legOutCandle.open) * 100);
    
    // Determine zone strength based on pattern quality
    const strength = this.calculateZoneStrength(legInPercentage, legOutPercentage, zoneRangePercentage, baseCandles.length);
    
    const zoneData: DemandZone = {
      uuid,
      symbol,
      exchange_token,
      timeframe,
      zone_type,
      created_at: new Date(),
      zone_formed_at: new Date(baseCandles[baseCandles.length - 1].date),
      prices: {
        bottom: parseFloat(zoneLow.toFixed(2)),
        top: parseFloat(zoneHigh.toFixed(2)),
        height: parseFloat(zoneHeight.toFixed(2)),
        height_percentage: parseFloat(zoneRangePercentage.toFixed(3))
      },
      strength: {
        strength,
        score: this.calculateStrengthScore(strength),
        details: `${zone_type} pattern with ${baseCandles.length} base candles`
      },
      status: {
        is_active: true,
        is_tested: false,
        test_count: 0
      },
      details: {
        leg_in_ohlc: {
          open: legInCandle.open,
          high: legInCandle.high,
          low: legInCandle.low,
          close: legInCandle.close,
          percentage_move: parseFloat(legInPercentage.toFixed(3)),
          candle_range: legInCandle.high - legInCandle.low,
          candle_body: Math.abs(legInCandle.close - legInCandle.open)
        },
        leg_in_percentage: parseFloat(legInPercentage.toFixed(3)),
        leg_out_ohlc: {
          open: legOutCandle.open,
          high: legOutCandle.high,
          low: legOutCandle.low,
          close: legOutCandle.close,
          percentage_move: parseFloat(legOutPercentage.toFixed(3)),
          candle_range: legOutCandle.high - legOutCandle.low,
          candle_body: Math.abs(legOutCandle.close - legOutCandle.open)
        },
        leg_out_percentage: parseFloat(legOutPercentage.toFixed(3)),
        base_candles: baseCandles.map((candle, index) => ({
          candle_number: index + 1,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          timestamp: candle.date.toISOString(),
          percentage_move: parseFloat((((candle.close - candle.open) / candle.open) * 100).toFixed(3)),
          candle_range: candle.high - candle.low,
          candle_body: Math.abs(candle.close - candle.open),
          is_zone_start: index === 0,
          is_zone_end: index === baseCandles.length - 1
        })),
        zone_range: {
          low: parseFloat(zoneLow.toFixed(2)),
          high: parseFloat(zoneHigh.toFixed(2)),
          range_points: parseFloat(zoneHeight.toFixed(2)),
          range_percentage: parseFloat(zoneRangePercentage.toFixed(3))
        },
        formation_summary: {
          total_candles: baseCandles.length + 2, // base + leg in + leg out
          base_candles_count: baseCandles.length,
          base_candles_total_percentage: parseFloat((baseCandles.reduce((sum, c) => 
            sum + Math.abs(((c.close - c.open) / c.open) * 100), 0)).toFixed(3)),
          base_candles_avg_percentage: parseFloat((baseCandles.reduce((sum, c) => 
            sum + Math.abs(((c.close - c.open) / c.open) * 100), 0) / baseCandles.length).toFixed(3)),
          max_base_percentage: parseFloat(Math.max(...baseCandles.map(c => 
            Math.abs(((c.close - c.open) / c.open) * 100))).toFixed(3)),
          min_base_percentage: parseFloat(Math.min(...baseCandles.map(c => 
            Math.abs(((c.close - c.open) / c.open) * 100))).toFixed(3)),
          zone_consolidation_percentage: parseFloat(zoneRangePercentage.toFixed(3)),
          zone_strength_factors: this.getStrengthFactors(strength)
        }
      },
      metadata: {
        detection_version: '2.0.0-database',
        market_session: 'regular',
        volatility_context: 'normal'
      }
    };
    
    return zoneData;
  }

  /**
   * Calculate zone strength based on pattern quality  
   */
  private calculateZoneStrength(legInPercentage: number, legOutPercentage: number, zoneRangePercentage: number, baseCandleCount: number): ZoneStrength {
    let score = 0;
    
    // Higher leg percentages = stronger zone
    if (legInPercentage > 2.5) score += 0.3;
    if (legOutPercentage > 2.5) score += 0.3;
    
    // Tighter consolidation = stronger zone  
    if (zoneRangePercentage < 1.0) score += 0.2;
    
    // Fewer base candles = cleaner pattern
    if (baseCandleCount <= 2) score += 0.2;
    
    if (score >= 0.7) return ZoneStrength.STRONG;
    if (score >= 0.4) return ZoneStrength.MEDIUM;
    return ZoneStrength.WEAK;
  }

  /**
   * Calculate strength score
   */
  private calculateStrengthScore(strength: ZoneStrength): number {
    switch (strength) {
      case ZoneStrength.STRONG: return 0.8 + Math.random() * 0.2;
      case ZoneStrength.MEDIUM: return 0.5 + Math.random() * 0.3;
      case ZoneStrength.WEAK: return 0.2 + Math.random() * 0.3;
      default: return 0.5;
    }
  }

  /**
   * Get strength factors based on zone strength
   */
  private getStrengthFactors(strength: ZoneStrength): string[] {
    const strongFactors = ['strong_leg_in', 'tight_consolidation', 'volume_spike'];
    const mediumFactors = ['price_rejection', 'momentum_divergence'];
    const weakFactors = ['basic_pattern'];
    
    switch (strength) {
      case ZoneStrength.STRONG: return strongFactors;
      case ZoneStrength.MEDIUM: return [...mediumFactors, strongFactors[0]];
      case ZoneStrength.WEAK: return weakFactors;
      default: return mediumFactors;
    }
  }

  /**
   * Get timeframe-specific percentage thresholds for leg candles using comprehensive mapping
   */
  private getLegCandleThresholds(timeframe: string): { rallyCandleThreshold: number; dropCandleThreshold: number } {
    const thresholdMap: Record<string, any> = {
      '1m': { legInMinPercentage: 1.0, legOutMinPercentage: 1.0, baseMaxPercentage: 0.5, maxBaseCandleCount: 4 },
      '3m': { legInMinPercentage: 1.2, legOutMinPercentage: 1.2, baseMaxPercentage: 0.6, maxBaseCandleCount: 4 },
      '5m': { legInMinPercentage: 1.5, legOutMinPercentage: 1.5, baseMaxPercentage: 0.8, maxBaseCandleCount: 4 },
      '10m': { legInMinPercentage: 1.8, legOutMinPercentage: 1.8, baseMaxPercentage: 0.9, maxBaseCandleCount: 4 },
      '15m': { legInMinPercentage: 2.0, legOutMinPercentage: 2.0, baseMaxPercentage: 1.0, maxBaseCandleCount: 4 },
      '30m': { legInMinPercentage: 2.2, legOutMinPercentage: 2.2, baseMaxPercentage: 1.2, maxBaseCandleCount: 4 },
      '1h': { legInMinPercentage: 2.3, legOutMinPercentage: 2.3, baseMaxPercentage: 1.3, maxBaseCandleCount: 4 },
      '2h': { legInMinPercentage: 2.4, legOutMinPercentage: 2.4, baseMaxPercentage: 1.4, maxBaseCandleCount: 4 },
      '4h': { legInMinPercentage: 2.4, legOutMinPercentage: 2.4, baseMaxPercentage: 1.4, maxBaseCandleCount: 5 },
      '1d': { legInMinPercentage: 2.5, legOutMinPercentage: 2.5, baseMaxPercentage: 1.5, maxBaseCandleCount: 5 },
      '1w': { legInMinPercentage: 5.0, legOutMinPercentage: 5.0, baseMaxPercentage: 2.5, maxBaseCandleCount: 5 },
      'month': { legInMinPercentage: 10.0, legOutMinPercentage: 10.0, baseMaxPercentage: 5.0, maxBaseCandleCount: 5 },
    };

    const thresholds = thresholdMap[timeframe];
    if (!thresholds) {
      // Default for unsupported timeframes
      return { rallyCandleThreshold: 2.0, dropCandleThreshold: -1.5 };
    }

    return { 
      rallyCandleThreshold: thresholds.legInMinPercentage, 
      dropCandleThreshold: -thresholds.legInMinPercentage  // Negative for drops
    };
  }

  /**
   * Get timeframe-specific base zone consolidation thresholds using comprehensive mapping
   */
  private getBaseZoneThreshold(timeframe: string): number {
    const thresholdMap: Record<string, any> = {
      '1m': { legInMinPercentage: 1.0, legOutMinPercentage: 1.0, baseMaxPercentage: 0.5, maxBaseCandleCount: 4 },
      '3m': { legInMinPercentage: 1.2, legOutMinPercentage: 1.2, baseMaxPercentage: 0.6, maxBaseCandleCount: 4 },
      '5m': { legInMinPercentage: 1.5, legOutMinPercentage: 1.5, baseMaxPercentage: 0.8, maxBaseCandleCount: 4 },
      '10m': { legInMinPercentage: 1.8, legOutMinPercentage: 1.8, baseMaxPercentage: 0.9, maxBaseCandleCount: 4 },
      '15m': { legInMinPercentage: 2.0, legOutMinPercentage: 2.0, baseMaxPercentage: 1.0, maxBaseCandleCount: 4 },
      '30m': { legInMinPercentage: 2.2, legOutMinPercentage: 2.2, baseMaxPercentage: 1.2, maxBaseCandleCount: 4 },
      '1h': { legInMinPercentage: 2.3, legOutMinPercentage: 2.3, baseMaxPercentage: 1.3, maxBaseCandleCount: 4 },
      '2h': { legInMinPercentage: 2.4, legOutMinPercentage: 2.4, baseMaxPercentage: 1.4, maxBaseCandleCount: 4 },
      '4h': { legInMinPercentage: 2.4, legOutMinPercentage: 2.4, baseMaxPercentage: 1.4, maxBaseCandleCount: 5 },
      '1d': { legInMinPercentage: 2.5, legOutMinPercentage: 2.5, baseMaxPercentage: 1.5, maxBaseCandleCount: 5 },
      '1w': { legInMinPercentage: 5.0, legOutMinPercentage: 5.0, baseMaxPercentage: 2.5, maxBaseCandleCount: 5 },
      'month': { legInMinPercentage: 10.0, legOutMinPercentage: 10.0, baseMaxPercentage: 5.0, maxBaseCandleCount: 5 },
    };

    const thresholds = thresholdMap[timeframe];
    if (!thresholds) {
      // Default for unsupported timeframes
      return 1.5;
    }

    return thresholds.baseMaxPercentage;
  }

  /**
   * Get timeframe-specific maximum base candle count
   */
  private getMaxBaseCandleCount(timeframe: string): number {
    const thresholdMap: Record<string, any> = {
      '1m': { maxBaseCandleCount: 4 },
      '3m': { maxBaseCandleCount: 4 },
      '5m': { maxBaseCandleCount: 4 },
      '10m': { maxBaseCandleCount: 4 },
      '15m': { maxBaseCandleCount: 4 },
      '30m': { maxBaseCandleCount: 4 },
      '1h': { maxBaseCandleCount: 4 },
      '2h': { maxBaseCandleCount: 4 },
      '4h': { maxBaseCandleCount: 5 },
      '1d': { maxBaseCandleCount: 5 },
      '1w': { maxBaseCandleCount: 5 },
      'month': { maxBaseCandleCount: 5 },
    };

    const thresholds = thresholdMap[timeframe];
    return thresholds ? thresholds.maxBaseCandleCount : 4;
  }
  private mapToResponseDto(zone: DemandZone): DemandZoneResponseDto {
    return {
      uuid: zone.uuid,
      symbol: zone.symbol,
      exchange_token: zone.exchange_token,
      timeframe: zone.timeframe,
      zone_type: zone.zone_type,
      created_at: zone.created_at,
      zone_formed_at: zone.zone_formed_at,
      prices: zone.prices,
      strength: zone.strength,
      status: zone.status,
      details: zone.details,
      metadata: zone.metadata,
    };
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private getRandomSymbol(): string {
    const symbols = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT'];
    return symbols[Math.floor(Math.random() * symbols.length)];
  }

  private getRandomExchangeToken(): string {
    // Correct exchange tokens matching the symbols above
    const tokens = ['2885', '2953', '1594', '1333', '1270', '3045', '10604', '1660', '1922', '11483'];
    return tokens[Math.floor(Math.random() * tokens.length)];
  }

  /**
   * Get a matching symbol and exchange token pair
   */
  private getRandomSymbolTokenPair(requestedSymbol?: string, requestedToken?: string): { symbol: string; exchange_token: string } {
    // Symbol to exchange token mapping (correct pairs)
    const symbolTokenMap = {
      'RELIANCE': '2885',
      'TCS': '2953',
      'INFY': '1594', 
      'HDFCBANK': '1333',
      'ICICIBANK': '1270',
      'SBIN': '3045',
      'BHARTIARTL': '10604',
      'ITC': '1660',
      'KOTAKBANK': '1922',
      'LT': '11483'
    };

    // If both symbol and token are provided, use them
    if (requestedSymbol && requestedToken) {
      return { symbol: requestedSymbol, exchange_token: requestedToken };
    }

    // If only symbol is provided, get its matching token
    if (requestedSymbol && symbolTokenMap[requestedSymbol]) {
      return { symbol: requestedSymbol, exchange_token: symbolTokenMap[requestedSymbol] };
    }

    // If only token is provided, find its matching symbol
    if (requestedToken) {
      const symbolEntry = Object.entries(symbolTokenMap).find(([symbol, token]) => token === requestedToken);
      if (symbolEntry) {
        return { symbol: symbolEntry[0], exchange_token: symbolEntry[1] };
      }
    }

    // Default: pick a random pair
    const symbols = Object.keys(symbolTokenMap);
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    return { symbol: randomSymbol, exchange_token: symbolTokenMap[randomSymbol] };
  }

  private getRandomStrength(): ZoneStrength {
    const strengths: ZoneStrength[] = [ZoneStrength.WEAK, ZoneStrength.MEDIUM, ZoneStrength.STRONG];
    const weights = [0.3, 0.5, 0.2]; // 30% weak, 50% medium, 20% strong
    const random = Math.random();
    
    if (random < weights[0]) return strengths[0];
    if (random < weights[0] + weights[1]) return strengths[1];
    return strengths[2];
  }

  private getRandomStrengthFactors(): string[] {
    const allFactors = [
      'volume_spike',
      'price_rejection',
      'strong_leg_in',
      'tight_consolidation',
      'multiple_tests',
      'breakout_continuation',
      'institutional_activity',
      'support_confluence',
      'momentum_divergence'
    ];
    
    // Return 1-3 random factors
    const numFactors = 1 + Math.floor(Math.random() * 3);
    const selectedFactors = [];
    const availableFactors = [...allFactors];
    
    for (let i = 0; i < numFactors && availableFactors.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableFactors.length);
      selectedFactors.push(availableFactors.splice(randomIndex, 1)[0]);
    }
    
    return selectedFactors;
  }

  private getDateRange(lookbackCandles: number): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - Math.floor(lookbackCandles / 10)); // Rough estimate
    
    return { from, to };
  }

  /**
   * DROP-BASE-RALLY (DBR) Detection Algorithm with timeframe-specific thresholds
   */
  private detectDropBaseRallyZones(candles: any[], symbol: string, timeframe: string): DemandZone[] {
    const zones: DemandZone[] = [];
    const { rallyCandleThreshold, dropCandleThreshold } = this.getLegCandleThresholds(timeframe);
    const baseZoneThreshold = this.getBaseZoneThreshold(timeframe);
    const maxBaseCandleCount = this.getMaxBaseCandleCount(timeframe);
    
    for (let i = 0; i < candles.length - 6; i++) { // Need at least 6 candles ahead
      const legInCandle = candles[i];
      
      // Step 1: Leg-In Drop - Must be red with timeframe-specific threshold% body move
      if (this.isRedCandle(legInCandle) && this.getCandleBodyPercentage(legInCandle) >= Math.abs(dropCandleThreshold)) {
        
        // Step 2: Collect and validate base candles (1 to maxBaseCandleCount candles max)
        const baseCandles = [];
        let baseEndIndex = i + 1;
        
        // Check up to maxBaseCandleCount candles for base formation
        for (let j = i + 1; j <= Math.min(i + maxBaseCandleCount, candles.length - 2); j++) {
          const baseCandle = candles[j];
          const bodyPercentage = this.getCandleBodyPercentage(baseCandle);
          
          // Base candle must have small body move (use dynamic threshold based on timeframe)
          const maxIndividualCandleThreshold = Math.min(2.0, baseZoneThreshold * 2); // Max 2% or double the base zone threshold
          if (bodyPercentage <= maxIndividualCandleThreshold) {
            baseCandles.push(baseCandle);
            baseEndIndex = j;
          } else {
            break; // Stop if candle doesn't meet base criteria
          }
        }
        
        // Must have at least 1 base candle and max maxBaseCandleCount
        if (baseCandles.length >= 1 && baseCandles.length <= maxBaseCandleCount && baseEndIndex + 1 < candles.length) {
          
          // Check base zone consolidation range
          const baseBodyLows = baseCandles.map(c => Math.min(c.open, c.close));
          const baseBodyHighs = baseCandles.map(c => Math.max(c.open, c.close));
          
          const zoneLow = Math.min(...baseBodyLows);
          const zoneHigh = Math.max(...baseBodyHighs);
          const baseZonePercentage = ((zoneHigh - zoneLow) / zoneLow) * 100;
          
          // Base zone range must be within threshold
          if (baseZonePercentage <= baseZoneThreshold) {
            
            // Step 3: Leg-Out Rally - Must be green with threshold% body move
            const legOutCandle = candles[baseEndIndex + 1];
            
            if (this.isGreenCandle(legOutCandle) && this.getCandleBodyPercentage(legOutCandle) >= rallyCandleThreshold) {
              
              const zoneHeight = zoneHigh - zoneLow;
              
              // Create DBR demand zone
              const zone: DemandZone = {
                uuid: this.generateUuid(),
                symbol: symbol,
                exchange_token: this.getSymbolExchangeToken(symbol),
                timeframe: timeframe,
                zone_type: ZoneType.DROP_BASE_RALLY,
                created_at: new Date(),
                zone_formed_at: new Date(legInCandle.date),
                prices: {
                  bottom: zoneLow,
                  top: zoneHigh,
                  height: zoneHeight,
                  height_percentage: (zoneHeight / zoneLow) * 100,
                },
                strength: {
                  strength: this.calculateDBRStrength(legInCandle, baseCandles, legOutCandle),
                  score: this.calculateDBRScore(legInCandle, baseCandles, legOutCandle),
                  details: `DBR: Leg-In Drop ${this.getCandleBodyPercentage(legInCandle).toFixed(1)}%, ${baseCandles.length} base candles, Leg-Out Rally ${this.getCandleBodyPercentage(legOutCandle).toFixed(1)}%`,
                },
                status: {
                  is_active: true,
                  is_tested: false,
                  test_count: 0,
                  last_tested_at: undefined,
                },
                details: this.createDBRDetails(legInCandle, baseCandles, legOutCandle, zoneHigh, zoneLow),
                metadata: {
                  detection_version: '2.0.0',
                  market_session: 'regular',
                  volatility_context: 'normal',
                },
              };
              
              zones.push(zone);
              
              // Skip ahead to avoid overlapping zones
              i = baseEndIndex + 1;
            }
          }
        }
      }
    }
    
    return zones;
  }

  /**
   * RALLY-BASE-RALLY (RBR) Detection Algorithm with timeframe-specific thresholds
   */
  private detectRallyBaseRallyZones(candles: any[], symbol: string, timeframe: string): DemandZone[] {
    const zones: DemandZone[] = [];
    const { rallyCandleThreshold } = this.getLegCandleThresholds(timeframe);
    const baseZoneThreshold = this.getBaseZoneThreshold(timeframe);
    const maxBaseCandleCount = this.getMaxBaseCandleCount(timeframe);
    
    for (let i = 0; i < candles.length - 6; i++) { // Need at least 6 candles ahead
      const legInCandle = candles[i];
      
      // Step 1: Leg-In Rally - Must be green with timeframe-specific threshold% body move
      if (this.isGreenCandle(legInCandle) && this.getCandleBodyPercentage(legInCandle) >= rallyCandleThreshold) {
        
        // Step 2: Collect and validate base candles (1 to maxBaseCandleCount candles max)
        const baseCandles = [];
        let baseEndIndex = i + 1;
        
        // Check up to maxBaseCandleCount candles for base formation
        for (let j = i + 1; j <= Math.min(i + maxBaseCandleCount, candles.length - 2); j++) {
          const baseCandle = candles[j];
          const bodyPercentage = this.getCandleBodyPercentage(baseCandle);
          
          // Base candle must have small body move (use dynamic threshold based on timeframe)
          const maxIndividualCandleThreshold = Math.min(2.0, baseZoneThreshold * 2); // Max 2% or double the base zone threshold
          if (bodyPercentage <= maxIndividualCandleThreshold) {
            baseCandles.push(baseCandle);
            baseEndIndex = j;
          } else {
            break; // Stop if candle doesn't meet base criteria
          }
        }
        
        // Must have at least 1 base candle and max maxBaseCandleCount
        if (baseCandles.length >= 1 && baseCandles.length <= maxBaseCandleCount && baseEndIndex + 1 < candles.length) {
          
          // Check base zone consolidation range
          const baseBodyLows = baseCandles.map(c => Math.min(c.open, c.close));
          const baseBodyHighs = baseCandles.map(c => Math.max(c.open, c.close));
          
          const zoneLow = Math.min(...baseBodyLows);
          const zoneHigh = Math.max(...baseBodyHighs);
          const baseZonePercentage = ((zoneHigh - zoneLow) / zoneLow) * 100;
          
          // Base zone range must be within threshold
          if (baseZonePercentage <= baseZoneThreshold) {
            
            // Step 3: Leg-Out Rally - Must be green with threshold% body move
            const legOutCandle = candles[baseEndIndex + 1];
            
            if (this.isGreenCandle(legOutCandle) && this.getCandleBodyPercentage(legOutCandle) >= rallyCandleThreshold) {
              
              const zoneHeight = zoneHigh - zoneLow;
              
              // Create RBR demand zone
              const zone: DemandZone = {
                uuid: this.generateUuid(),
                symbol: symbol,
                exchange_token: this.getSymbolExchangeToken(symbol),
                timeframe: timeframe,
                zone_type: ZoneType.RALLY_BASE_RALLY,
                created_at: new Date(),
                zone_formed_at: new Date(legInCandle.date),
                prices: {
                  bottom: zoneLow,
                  top: zoneHigh,
                  height: zoneHeight,
                  height_percentage: (zoneHeight / zoneLow) * 100,
                },
                strength: {
                  strength: this.calculateRBRStrength(legInCandle, baseCandles, legOutCandle),
                  score: this.calculateRBRScore(legInCandle, baseCandles, legOutCandle),
                  details: `RBR: Leg-In ${this.getCandleBodyPercentage(legInCandle).toFixed(1)}%, ${baseCandles.length} base candles, Leg-Out ${this.getCandleBodyPercentage(legOutCandle).toFixed(1)}%`,
                },
                status: {
                  is_active: true,
                  is_tested: false,
                  test_count: 0,
                  last_tested_at: undefined,
                },
                details: this.createRBRDetails(legInCandle, baseCandles, legOutCandle, zoneHigh, zoneLow),
                metadata: {
                  detection_version: '2.0.0',
                  market_session: 'regular',
                  volatility_context: 'normal',
                },
              };
              
              zones.push(zone);
              
              // Skip ahead to avoid overlapping zones
              i = baseEndIndex + 1;
            }
          }
        }
      }
    }
    
    return zones;
  }
  
  /**
   * Enable actual zone detection with real candle data (when available)
   * This method replaces the mock detection with real RBR and DBR algorithms
   */
  public async detectZonesWithRealData(
    symbol: string, 
    exchange_token: string, 
    timeframe: string, 
    candles: any[]
  ): Promise<DemandZone[]> {
    const detectedZones: DemandZone[] = [];
    
    if (candles && candles.length > 0) {
      // Detect DROP-BASE-RALLY zones
      const dbrZones = this.detectDropBaseRallyZones(candles, symbol, timeframe);
      detectedZones.push(...dbrZones);
      
      // Detect RALLY-BASE-RALLY zones 
      const rbrZones = this.detectRallyBaseRallyZones(candles, symbol, timeframe);
      detectedZones.push(...rbrZones);
      
      console.log(`[DemandZoneService] Detected ${dbrZones.length} DBR zones and ${rbrZones.length} RBR zones for ${symbol} ${timeframe}`);
    }
    
    return detectedZones;
  }

  /**
   * Helper method to check if candle is green (bullish)
   */
  private isGreenCandle(candle: any): boolean {
    return candle.close > candle.open;
  }
  
  /**
   * Helper method to check if candle is red (bearish)
   */
  private isRedCandle(candle: any): boolean {
    return candle.close < candle.open;
  }
  
  /**
   * Helper method to calculate candle body percentage move
   */
  private getCandleBodyPercentage(candle: any): number {
    return Math.abs((candle.close - candle.open) / candle.open) * 100;
  }
  
  /**
   * Calculate DBR zone strength based on leg sizes and base consolidation
   */
  private calculateDBRStrength(legIn: any, baseCandles: any[], legOut: any): ZoneStrength {
    const legInPercentage = this.getCandleBodyPercentage(legIn);
    const legOutPercentage = this.getCandleBodyPercentage(legOut);
    const avgLegPercentage = (legInPercentage + legOutPercentage) / 2;
    
    if (avgLegPercentage >= 8) return ZoneStrength.STRONG;
    if (avgLegPercentage >= 6) return ZoneStrength.MEDIUM;
    return ZoneStrength.WEAK;
  }
  
  /**
   * Calculate DBR zone score
   */
  private calculateDBRScore(legIn: any, baseCandles: any[], legOut: any): number {
    const legInPercentage = this.getCandleBodyPercentage(legIn);
    const legOutPercentage = this.getCandleBodyPercentage(legOut);
    const baseCount = baseCandles.length;
    
    // Higher score for stronger legs and good base consolidation
    let score = 0.5; // Base score
    score += Math.min(legInPercentage / 10, 0.2); // Leg-in contribution
    score += Math.min(legOutPercentage / 10, 0.2); // Leg-out contribution
    score += Math.max(0, (5 - baseCount) / 10); // Fewer base candles = better
    
    return Math.min(score, 1.0); // Cap at 1.0
  }
  
  /**
   * Create DBR zone details
   */
  private createDBRDetails(legIn: any, baseCandles: any[], legOut: any, zoneHigh: number, zoneLow: number): any {
    return {
      pattern_type: 'DROP-BASE-RALLY',
      leg_in_candle: {
        timestamp: legIn.date,
        open: legIn.open,
        high: legIn.high,
        low: legIn.low,
        close: legIn.close,
        body_percentage: this.getCandleBodyPercentage(legIn),
        candle_type: 'drop'
      },
      base_candles: baseCandles.map((candle, index) => ({
        sequence: index + 1,
        timestamp: candle.date,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        body_percentage: this.getCandleBodyPercentage(candle),
      })),
      leg_out_candle: {
        timestamp: legOut.date,
        open: legOut.open,
        high: legOut.high,
        low: legOut.low,
        close: legOut.close,
        body_percentage: this.getCandleBodyPercentage(legOut),
        candle_type: 'rally'
      },
      zone_metrics: {
        zone_high: zoneHigh,
        zone_low: zoneLow,
        zone_height: zoneHigh - zoneLow,
        consolidation_percentage: ((zoneHigh - zoneLow) / zoneLow) * 100,
      }
    };
  }
  
  /**
   * Calculate RBR zone strength based on leg sizes and base consolidation
   */
  private calculateRBRStrength(legIn: any, baseCandles: any[], legOut: any): ZoneStrength {
    const legInPercentage = this.getCandleBodyPercentage(legIn);
    const legOutPercentage = this.getCandleBodyPercentage(legOut);
    const avgLegPercentage = (legInPercentage + legOutPercentage) / 2;
    
    if (avgLegPercentage >= 8) return ZoneStrength.STRONG;
    if (avgLegPercentage >= 6) return ZoneStrength.MEDIUM;
    return ZoneStrength.WEAK;
  }
  
  /**
   * Calculate RBR zone score
   */
  private calculateRBRScore(legIn: any, baseCandles: any[], legOut: any): number {
    const legInPercentage = this.getCandleBodyPercentage(legIn);
    const legOutPercentage = this.getCandleBodyPercentage(legOut);
    const baseCount = baseCandles.length;
    
    // Higher score for stronger legs and good base consolidation
    let score = 0.5; // Base score
    score += Math.min(legInPercentage / 10, 0.2); // Leg-in contribution
    score += Math.min(legOutPercentage / 10, 0.2); // Leg-out contribution
    score += (baseCount - 1) * 0.025; // Base consolidation bonus
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Create detailed information for RBR zones
   */
  private createRBRDetails(legIn: any, baseCandles: any[], legOut: any, zoneHigh: number, zoneLow: number): any {
    const legInPercentage = this.getCandleBodyPercentage(legIn);
    const legOutPercentage = this.getCandleBodyPercentage(legOut);
    
    // Process base candles with individual percentage calculations
    const processedBaseCandles = baseCandles.map((candle, index) => ({
      candle_number: index + 1,
      open: parseFloat(candle.open.toFixed(2)),
      high: parseFloat(candle.high.toFixed(2)),
      low: parseFloat(candle.low.toFixed(2)),
      close: parseFloat(candle.close.toFixed(2)),
      timestamp: candle.date,
      percentage_move: parseFloat(this.getCandleBodyPercentage(candle).toFixed(3)),
      candle_range: parseFloat((candle.high - candle.low).toFixed(2)),
      candle_body: parseFloat((candle.close - candle.open).toFixed(2)),
      is_zone_start: index === 0,
      is_zone_end: index === baseCandles.length - 1
    }));
    
    // Calculate percentage from 1st base candle LOW to LAST base candle HIGH
    const firstBaseLow = processedBaseCandles[0].low;
    const lastBaseHigh = processedBaseCandles[processedBaseCandles.length - 1].high;
    const baseCandlesTotalPercentage = ((lastBaseHigh - firstBaseLow) / firstBaseLow) * 100;
    
    const basePercentages = processedBaseCandles.map(c => c.percentage_move);
    const baseCandlesAvgPercentage = basePercentages.reduce((sum, p) => sum + p, 0) / basePercentages.length;
    const maxBasePercentage = Math.max(...basePercentages);
    const minBasePercentage = Math.min(...basePercentages);
    const zoneConsolidationPercentage = ((zoneHigh - zoneLow) / zoneLow) * 100;
    
    return {
      leg_in_ohlc: {
        open: parseFloat(legIn.open.toFixed(2)),
        high: parseFloat(legIn.high.toFixed(2)),
        low: parseFloat(legIn.low.toFixed(2)),
        close: parseFloat(legIn.close.toFixed(2)),
        percentage_move: parseFloat(legInPercentage.toFixed(3)),
        candle_range: parseFloat((legIn.high - legIn.low).toFixed(2)),
        candle_body: parseFloat((legIn.close - legIn.open).toFixed(2)),
      },
      leg_in_percentage: parseFloat(legInPercentage.toFixed(2)),
      leg_out_ohlc: {
        open: parseFloat(legOut.open.toFixed(2)),
        high: parseFloat(legOut.high.toFixed(2)),
        low: parseFloat(legOut.low.toFixed(2)),
        close: parseFloat(legOut.close.toFixed(2)),
        percentage_move: parseFloat(legOutPercentage.toFixed(3)),
        candle_range: parseFloat((legOut.high - legOut.low).toFixed(2)),
        candle_body: parseFloat((legOut.close - legOut.open).toFixed(2)),
      },
      leg_out_percentage: parseFloat(legOutPercentage.toFixed(2)),
      base_candles: processedBaseCandles,
      zone_range: {
        low: parseFloat(zoneLow.toFixed(2)),
        high: parseFloat(zoneHigh.toFixed(2)),
        points: parseFloat((zoneHigh - zoneLow).toFixed(2)),
        percentage: parseFloat(zoneConsolidationPercentage.toFixed(3))
      },
      formation_summary: {
        total_candles: processedBaseCandles.length + 2, // base candles + leg in + leg out
        base_candles_count: processedBaseCandles.length,
        base_candles_total_percentage: parseFloat(baseCandlesTotalPercentage.toFixed(3)),
        base_candles_avg_percentage: parseFloat(baseCandlesAvgPercentage.toFixed(3)),
        max_base_percentage: parseFloat(maxBasePercentage.toFixed(3)),
        min_base_percentage: parseFloat(minBasePercentage.toFixed(3)),
        zone_consolidation_percentage: parseFloat(zoneConsolidationPercentage.toFixed(3)),
        zone_strength_factors: [
          `Strong leg-in rally: ${legInPercentage.toFixed(1)}%`,
          `${processedBaseCandles.length} candle consolidation`,
          `Strong leg-out rally: ${legOutPercentage.toFixed(1)}%`,
          'RBR bullish continuation pattern'
        ]
      }
    };
  }

  /**
   * Get exchange token for symbol (helper method)
   */
  private getSymbolExchangeToken(symbol: string): string {
    const tokenMap = {
      'RELIANCE': '2885',
      'TCS': '11536', 
      'INFY': '408065',
      'HDFC': '175361',
      'ICICIBANK': '4963'
    };
    return tokenMap[symbol] || '2885';
  }

  /**
   * Get realistic current market prices from database or fallback to estimation
   */
  private async getRealisticPriceFromDatabase(symbol: string, exchange_token?: string): Promise<number> {
    // Try to get actual price from database first
    const timeframes = ['1d', '1h', '15m', '5m']; // Try different timeframes
    
    for (const timeframe of timeframes) {
      try {
        const repository = this.getCandleRepository(timeframe);
        
        // Search by symbol first, then by exchange_token if available
        let latestCandle;
        
        if (symbol) {
          latestCandle = await repository
            .createQueryBuilder('candle')
            .where('candle.symbol = :symbol', { symbol })
            .orderBy('candle.date', 'DESC')
            .limit(1)
            .getOne();
        }
        
        if (!latestCandle && exchange_token) {
          latestCandle = await repository
            .createQueryBuilder('candle')
            .where('candle.exchange_token = :exchange_token', { exchange_token })
            .orderBy('candle.date', 'DESC')
            .limit(1)
            .getOne();
        }

        if (latestCandle) {
          const price = parseFloat(latestCandle.close);
          // Add small random variation (±0.5%) to simulate intraday movement
          const variation = price * (Math.random() - 0.5) * 0.01;
          this.logger.log(`Found database price for ${symbol}: ₹${price.toFixed(2)}`);
          return price + variation;
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch ${timeframe} price for ${symbol}: ${error.message}`);
      }
    }
    
    // Fallback: Return a reasonable estimated price based on typical stock ranges
    const fallbackPrice = 800 + Math.random() * 2000; // ₹800-2800 range
    this.logger.warn(`Using fallback price for ${symbol}: ₹${fallbackPrice.toFixed(2)}`);
    return fallbackPrice;
  }

  /**
   * Fetch actual historical price data from database for a given exchange token
   */
  private async getLatestPriceFromDatabase(exchange_token: string, timeframe: string = '15m'): Promise<{ high: number; low: number; close: number } | null> {
    try {
      const repository = this.getCandleRepository(timeframe);
      
      // Get the latest candle for this exchange_token
      const latestCandle = await repository
        .createQueryBuilder('candle')
        .where('candle.exchange_token = :exchange_token', { exchange_token })
        .orderBy('candle.created_at', 'DESC')
        .limit(1)
        .getOne();

      if (latestCandle) {
        return {
          high: parseFloat(latestCandle.high),
          low: parseFloat(latestCandle.low),
          close: parseFloat(latestCandle.close)
        };
      }

      return null;
    } catch (error) {
      this.logger.warn(`Failed to fetch price data for token ${exchange_token}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get realistic price range for demand zone based on actual historical data
   */
  private async getRealisticPriceRange(exchange_token: string, symbol: string, timeframe: string): Promise<{ min: number; max: number }> {
    // Try to get actual price data from database
    const priceData = await this.getLatestPriceFromDatabase(exchange_token, timeframe);
    
    if (priceData) {
      // Use actual price data with some variation
      const basePrice = priceData.close;
      const priceRange = Math.abs(priceData.high - priceData.low);
      const variation = Math.max(priceRange, basePrice * 0.02); // At least 2% variation
      
      return {
        min: basePrice - variation,
        max: basePrice + variation
      };
    }

    // Fallback to symbol-based estimation if no database data available
    const symbolToPrice = {
      'RELIANCE': { base: 1372, variation: 50 },
      'TCS': { base: 4150, variation: 150 },
      'INFY': { base: 1890, variation: 80 },
      'HDFCBANK': { base: 1750, variation: 70 },
      'ICICIBANK': { base: 1280, variation: 50 },
      'SBIN': { base: 850, variation: 40 },
      'BHARTIARTL': { base: 1650, variation: 60 },
      'ITC': { base: 460, variation: 20 },
      'LT': { base: 3800, variation: 150 },
      'HCLTECH': { base: 1890, variation: 80 },
    };

    const priceInfo = symbolToPrice[symbol] || { base: 1000, variation: 50 };
    
    return {
      min: priceInfo.base - priceInfo.variation,
      max: priceInfo.base + priceInfo.variation
    };
  }
}