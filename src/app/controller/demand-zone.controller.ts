import {
  Controller,
  Get,
  Post,
  Put,
  Query,
  Param,
  Body,
  ParseUUIDPipe,
  ValidationPipe,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { DemandZoneService } from '../services/demand-zone.service';
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
import { ApiResponseSuccess } from '../core/decorators/api-response-success.decorator';

@ApiTags('Demand Zones')
@Controller('demand-zones')
export class DemandZoneController {
  constructor(
    private readonly demandZoneService: DemandZoneService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get demand zones',
    description: 'Retrieves demand zones with optional filtering by symbol, timeframe, strength, and date range. Supports pagination.',
  })
  @ApiResponseSuccess(PaginatedDemandZonesResponseDto)
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getDemandZones(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    queryDto: GetDemandZonesQueryDto,
  ): Promise<PaginatedDemandZonesResponseDto> {
    return this.demandZoneService.getDemandZones(queryDto);
  }

  @Post('detect')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Detect and create demand zones',
    description: 'Analyzes candle data to detect demand zone patterns and saves them to the database. Uses sophisticated algorithms to identify both DROP-BASE-RALLY (DBR) patterns (leg-in red candle, base consolidation, leg-out green candle) and RALLY-BASE-RALLY (RBR) patterns (leg-in green candle, base consolidation, leg-out red candle) with timeframe-specific thresholds.',
  })
  @ApiCreatedResponse({
    description: 'Demand zones detected and created successfully',
    type: DemandZoneDetectionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid detection parameters or insufficient data' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async detectDemandZones(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    detectDto: DetectDemandZonesDto,
  ): Promise<DemandZoneDetectionResponseDto> {
    return this.demandZoneService.detectDemandZones(detectDto);
  }

  @Get('stats/:symbol')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get demand zone statistics',
    description: 'Retrieves statistics about demand zones for a specific symbol, including counts by strength and test metrics.',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol to get statistics for',
    example: 'RELIANCE',
  })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    description: 'Timeframe to filter statistics',
    example: '15m',
  })
  @ApiOkResponse({
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', example: 'RELIANCE' },
        timeframe: { type: 'string', example: '15m' },
        total_zones: { type: 'number', example: 25 },
        active_zones: { type: 'number', example: 18 },
        strong_zones: { type: 'number', example: 8 },
        medium_zones: { type: 'number', example: 10 },
        weak_zones: { type: 'number', example: 7 },
        avg_test_count: { type: 'number', example: 1.2 },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid symbol or timeframe' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getDemandZoneStats(
    @Param('symbol') symbol: string,
    @Query('timeframe') timeframe?: string,
  ) {
    const stats = await this.demandZoneService.getZoneStats(symbol, timeframe);
    return {
      symbol,
      timeframe: timeframe || 'all',
      ...stats,
    };
  }

  @Put(':uuid/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update demand zone status',
    description: 'Updates the status of a demand zone (active/inactive, tested/untested).',
  })
  @ApiParam({
    name: 'uuid',
    description: 'Unique identifier of the demand zone',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: 'Zone status updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Demand zone status updated successfully' },
        uuid: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid UUID format or update parameters' })
  @ApiNotFoundResponse({ description: 'Demand zone not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async updateDemandZoneStatus(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateDto: { is_active?: boolean; is_tested?: boolean },
  ) {
    await this.demandZoneService.updateZoneStatus(uuid, updateDto);
    return {
      message: 'Demand zone status updated successfully',
      uuid,
    };
  }

  @Get('active/:symbol/:timeframe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get active demand zones for trading',
    description: 'Retrieves all active demand zones for a specific symbol and timeframe, useful for real-time trading decisions.',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol',
    example: 'RELIANCE',
  })
  @ApiParam({
    name: 'timeframe',
    description: 'Timeframe for demand zones',
    example: '15m',
  })
  @ApiResponseSuccess(DemandZoneResponseDto, 200, true)
  @ApiBadRequestResponse({ description: 'Invalid symbol or timeframe' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getActiveDemandZones(
    @Param('symbol') symbol: string,
    @Param('timeframe') timeframe: string,
  ): Promise<DemandZoneResponseDto[]> {
    const queryDto: GetDemandZonesQueryDto = {
      symbol,
      timeframe,
      is_active: true,
      limit: 50, // Get more results for active zones
    };
    
    const result = await this.demandZoneService.getDemandZones(queryDto);
    return result.data;
  }

  @Get('by-token/:exchange_token/:timeframe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get demand zones by exchange token',
    description: 'Retrieves demand zones for a specific instrument using exchange token and timeframe.',
  })
  @ApiParam({
    name: 'exchange_token',
    description: 'Exchange token of the instrument',
    example: '2885',
  })
  @ApiParam({
    name: 'timeframe',
    description: 'Timeframe for demand zones',
    example: '15m',
  })
  @ApiQuery({
    name: 'active_only',
    required: false,
    description: 'Filter active zones only',
    example: 'true',
  })
  @ApiResponseSuccess(DemandZoneResponseDto, 200, true)
  @ApiBadRequestResponse({ description: 'Invalid exchange token or timeframe' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getDemandZonesByToken(
    @Param('exchange_token') exchange_token: string,
    @Param('timeframe') timeframe: string,
    @Query('active_only') active_only: string = 'true',
  ): Promise<DemandZoneResponseDto[]> {
    const queryDto: GetDemandZonesQueryDto = {
      exchange_token,
      timeframe,
      is_active: active_only === 'true',
      limit: 50,
    };
    
    const result = await this.demandZoneService.getDemandZones(queryDto);
    return result.data;
  }

  @Get('thresholds/:timeframe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get timeframe-specific detection thresholds',
    description: 'Returns the percentage thresholds used for demand zone detection for a specific timeframe. This helps understand how the algorithm adapts to different timeframes based on human trading behavior.',
  })
  @ApiParam({
    name: 'timeframe',
    description: 'Timeframe to get thresholds for',
    example: '1d',
    enum: ['1m', '3m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', 'month'],
  })
  @ApiOkResponse({
    description: 'Thresholds retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        timeframe: { type: 'string', example: '1d' },
        leg_in_min_percentage: { type: 'number', example: 2.5, description: 'Minimum percentage for leg-in red candle' },
        leg_out_min_percentage: { type: 'number', example: 2.5, description: 'Minimum percentage for leg-out green candle' },
        base_max_percentage: { type: 'number', example: 1.5, description: 'Maximum percentage for base candles' },
        max_base_candle_count: { type: 'number', example: 5, description: 'Maximum number of base candles allowed' },
        description: { 
          type: 'string', 
          example: 'Daily timeframe uses human trader visual thresholds - big moves of 2.5%+ for legs, small moves of 1.5% or less for base' 
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid timeframe' })
  async getTimeframeThresholds(
    @Param('timeframe') timeframe: string,
  ) {
    // This exposes the threshold logic for API documentation and testing
    const descriptions = {
      '1m': 'Very short timeframe - smaller movements expected',
      '3m': 'Short intraday timeframe - small movements',
      '5m': 'Popular intraday scalping timeframe',
      '10m': 'Medium intraday timeframe',
      '15m': 'Standard intraday analysis timeframe',
      '30m': 'Extended intraday timeframe',
      '1h': 'Hourly analysis - moderate movements',
      '2h': 'Two-hour analysis - moderate to larger movements',
      '4h': 'Four-hour swing analysis',
      '1d': 'Daily analysis - Human traders look for 2.5%+ leg moves and 1.5% or smaller base candles',
      '1w': 'Weekly analysis - Human traders look for 5%+ leg moves and 2.5% or smaller base candles',
      'month': 'Monthly analysis - Human traders look for 10%+ leg moves and 5% or smaller base candles',
    };

    // Expose threshold logic
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
      throw new BadRequestException(`Unsupported timeframe: ${timeframe}`);
    }

    return {
      timeframe,
      leg_in_min_percentage: thresholds.legInMinPercentage,
      leg_out_min_percentage: thresholds.legOutMinPercentage,
      base_max_percentage: thresholds.baseMaxPercentage,
      max_base_candle_count: thresholds.maxBaseCandleCount,
      description: descriptions[timeframe] || 'Standard timeframe analysis',
    };
  }

  @Get('debug/candle-data/:timeframe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Debug: Check available candle data',
    description: 'Check if candle data exists in the database for the specified timeframe. This helps debug why zones might not be detected.',
  })
  @ApiParam({
    name: 'timeframe',
    description: 'Timeframe to check',
    example: '1d',
  })
  @ApiQuery({
    name: 'symbol',
    required: false,
    description: 'Optional symbol to check',
    example: 'RELIANCE',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records to check',
    example: '10',
  })
  async debugCandleData(
    @Param('timeframe') timeframe: string,
    @Query('symbol') symbol?: string,
    @Query('limit') limit: string = '10',
  ) {
    try {
      const debugResult = await this.demandZoneService.debugCandleDataAvailability(timeframe, symbol, parseInt(limit));
      
      return {
        success: true,
        timeframe,
        symbol: symbol || 'ALL',
        limit: parseInt(limit),
        debug_analysis: debugResult,
        message: 'Check the debug_analysis object for detailed information about data availability'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error checking candle data',
        error: error.message,
        timeframe,
        symbol: symbol || 'ALL',
        suggestion: 'Check if candle data exists in the database for this timeframe',
      };
    }
  }

  @Get('debug/data-overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Debug: Get complete data overview',
    description: 'Get a comprehensive overview of all available candle data across all timeframes. Use this to understand what data is available for zone detection.',
  })
  @ApiQuery({
    name: 'symbol',
    required: false,
    description: 'Optional symbol to focus on',
    example: 'RELIANCE',
  })
  async debugDataOverview(
    @Query('symbol') symbol?: string,
  ) {
    try {
      const overview = await this.demandZoneService.debugCandleDataAvailability(undefined, symbol, 5);
      
      return {
        success: true,
        message: 'Complete data overview retrieved',
        symbol_focus: symbol || 'ALL',
        overview,
        next_steps: [
          'If no data is found, run data seeding/import',
          'If data exists but zones are not detected, check detection algorithm logs',
          'Use specific timeframe debug endpoint for detailed analysis',
          'Try detection with symbols that have data available'
        ]
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error getting data overview',
        error: error.message,
      };
    }
  }

  @Post('test-detection')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test demand zone detection with detailed logging',
    description: 'A test endpoint to trigger demand zone detection with comprehensive logging. Use this to debug and see all the detection process logs in the console.',
  })
  @ApiOkResponse({
    description: 'Test detection completed - check server logs for detailed information',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Test detection completed - check server logs' },
        zones_found: { type: 'number', example: 2 },
        test_parameters: { 
          type: 'object',
          properties: {
            timeframe: { type: 'string', example: '1d' },
            lookback_candles: { type: 'number', example: 50 },
          }
        },
      },
    },
  })
  async testDemandZoneDetection(
    @Body() testDto: { 
      symbol?: string; 
      timeframe?: string; 
      lookback_candles?: number 
    } = {}
  ) {
    const { 
      symbol = 'RELIANCE', 
      timeframe = '1d', 
      lookback_candles = 50 
    } = testDto;

    console.log('\n🚀 ===== MANUAL TEST DETECTION STARTED =====');
    console.log(`Testing with: Symbol=${symbol}, Timeframe=${timeframe}, Lookback=${lookback_candles}`);
    
    try {
      const result = await this.demandZoneService.detectDemandZones({
        symbol,
        timeframe,
        lookback_candles,
      });

      console.log('✅ Test completed successfully!');
      console.log(`Zones detected: ${result.zones_detected}`);
      console.log('🚀 ===== MANUAL TEST DETECTION ENDED =====\n');

      return {
        message: 'Test detection completed - check server logs for detailed information',
        zones_found: result.zones_detected,
        test_parameters: {
          symbol,
          timeframe,
          lookback_candles,
        },
        result,
      };
    } catch (error) {
      console.error('❌ Test detection failed:', error.message);
      console.log('🚀 ===== MANUAL TEST DETECTION ENDED WITH ERROR =====\n');
      
      return {
        message: 'Test detection failed - check server logs for error details',
        error: error.message,
        test_parameters: {
          symbol,
          timeframe,
          lookback_candles,
        },
      };
    }
  }

  @Get('all-stocks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get demand zones for all stocks',
    description: 'Retrieves demand zones for all stocks. Can filter by specific timeframe OR get ALL timeframes. Supports comprehensive filtering and pagination.',
  })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    description: 'Filter by specific timeframe (leave empty for ALL timeframes)',
    example: '1d',
    enum: ['1m', '3m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', 'month'],
  })
  @ApiQuery({
    name: 'include_timeframes',
    required: false,
    description: 'When timeframe is empty, specify comma-separated timeframes to include (default: all)',
    example: '1m,5m,15m,1h,1d',
  })
  @ApiQuery({
    name: 'zone_strength',
    required: false,
    description: 'Filter by zone strength',
    example: 'strong',
    enum: ['weak', 'medium', 'strong'],
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    description: 'Filter by zone status',
    example: 'true',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: '1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (max 100). When getting all timeframes, this applies to final pagination.',
    example: '50',
  })
  @ApiResponseSuccess(PaginatedDemandZonesResponseDto)
  async getAllStocksDemandZones(
    @Query('timeframe') timeframe?: string,
    @Query('include_timeframes') includeTimeframes?: string,
    @Query('zone_strength') zone_strength?: string,
    @Query('is_active') is_active?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    // If no specific timeframe is provided, handle all timeframes
    if (!timeframe) {
      return this.getAllStocksAllTimeframes(includeTimeframes, zone_strength, is_active, page, limit);
    }

    // Single timeframe mode (existing logic)
      const queryDto: GetDemandZonesQueryDto = {
        timeframe,
        zone_strength: zone_strength as ZoneStrength,
        is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100), // Limit max to 100 for performance
      };    console.log(`\n📊 ===== FETCHING ALL STOCKS DEMAND ZONES (SINGLE TIMEFRAME) =====`);
    console.log(`🎯 Mode: ALL STOCKS for ${timeframe} timeframe`);
    console.log(`📊 Filters: strength=${zone_strength || 'ALL'}, active=${is_active || 'ALL'}`);
    console.log(`📄 Pagination: page=${page}, limit=${queryDto.limit}`);

    const result = await this.demandZoneService.getDemandZones(queryDto);
    
    console.log(`✅ Retrieved ${result.data.length} zones (Total: ${result.meta.total})`);
    console.log(`📊 =======================================\n`);

    return result;
  }

  /**
   * Helper method to get all stocks across all timeframes
   */
  private async getAllStocksAllTimeframes(
    includeTimeframes?: string,
    zone_strength?: string,
    is_active?: string,
    page: string = '1',
    limit: string = '50',
  ) {
    // Parse timeframes to include
    const allTimeframes = ['1m', '3m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', 'month'];
    const timeframes = includeTimeframes 
      ? includeTimeframes.split(',').map(tf => tf.trim()).filter(tf => allTimeframes.includes(tf))
      : allTimeframes;
    
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    
    console.log(`\n🌐 ===== FETCHING ALL STOCKS ALL TIMEFRAMES =====`);
    console.log(`🎯 Mode: ALL STOCKS across ${timeframes.length} timeframes`);
    console.log(`📊 Filters: strength=${zone_strength || 'ALL'}, active=${is_active || 'ALL'}`);
    console.log(`📋 Timeframes: [${timeframes.join(', ')}]`);
    console.log(`📄 Pagination: page=${page}, limit=${limitNum}`);

    const allZones: DemandZoneResponseDto[] = [];
    const zonesByTimeframe: Record<string, DemandZoneResponseDto[]> = {};
    const symbolsSet = new Set<string>();

    // Fetch zones for each timeframe
    for (const tf of timeframes) {
      const queryDto: GetDemandZonesQueryDto = {
        timeframe: tf,
        zone_strength: zone_strength as ZoneStrength,
        is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        page: 1,
        limit: 1000, // Get more zones per timeframe for aggregation
      };

      try {
        const result = await this.demandZoneService.getDemandZones(queryDto);
        if (result.data.length > 0) {
          zonesByTimeframe[tf] = result.data;
          allZones.push(...result.data);
          
          // Collect unique symbols
          result.data.forEach(zone => symbolsSet.add(zone.symbol));
          
          console.log(`✅ ${tf}: ${result.data.length} zones found`);
        } else {
          console.log(`⚪ ${tf}: No zones found`);
        }
      } catch (error) {
        console.error(`❌ ${tf}: Error fetching zones - ${error.message}`);
      }
    }

    // Apply pagination to the aggregated results
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedZones = allZones.slice(startIndex, endIndex);

    console.log(`📊 Summary: ${allZones.length} total zones across ${Object.keys(zonesByTimeframe).length} timeframes`);
    console.log(`📈 Symbols covered: ${symbolsSet.size}`);
    console.log(`📄 Paginated: ${paginatedZones.length} zones (page ${pageNum})`);
    console.log(`🌐 ==========================================\n`);

    return {
      data: paginatedZones,
      meta: {
        total: allZones.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(allZones.length / limitNum),
      },
      summary: {
        total_zones: allZones.length,
        timeframes_covered: Object.keys(zonesByTimeframe).length,
        symbols_covered: symbolsSet.size,
        zones_by_timeframe: Object.fromEntries(
          Object.entries(zonesByTimeframe).map(([tf, zones]) => [tf, zones.length])
        ),
      },
    };
  }

  @Get('all-timeframes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get ALL stocks across ALL timeframes (Enhanced Bulk Endpoint)',
    description: 'Gets demand zones for ALL STOCKS across ALL TIMEFRAMES by default. Perfect for comprehensive market analysis. Use all_stocks=false to filter by specific stock.',
  })
  @ApiQuery({
    name: 'all_stocks',
    required: false,
    description: 'Get ALL stocks (true) or filter by specific stock (false). Default: true',
    example: 'true',
    enum: ['true', 'false'],
  })
  @ApiQuery({
    name: 'symbol',
    required: false,
    description: 'Filter by specific symbol (only when all_stocks=false)',
    example: 'RELIANCE',
  })
  @ApiQuery({
    name: 'exchange_token',
    required: false,
    description: 'Filter by specific exchange token (only when all_stocks=false)',
    example: '2885',
  })
  @ApiQuery({
    name: 'zone_strength',
    required: false,
    description: 'Optional: Filter by zone strength (Default: ALL strengths)',
    enum: ['weak', 'medium', 'strong'],
    example: 'strong',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    description: 'Optional: Filter by zone status (Default: ALL zones)',
    example: 'true',
  })
  @ApiQuery({
    name: 'limit_per_timeframe',
    required: false,
    description: 'Optional: Limit zones per timeframe (Default: 100, Max: 300)',
    example: '100',
  })
  @ApiQuery({
    name: 'include_timeframes',
    required: false,
    description: 'Optional: Comma-separated timeframes (Default: ALL TIMEFRAMES)',
    example: '1m,5m,15m,1h,1d',
  })
  @ApiOkResponse({
    description: 'Zones retrieved successfully grouped by timeframe',
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            total_zones: { type: 'number', example: 45 },
            timeframes_with_zones: { type: 'number', example: 6 },
            symbols_covered: { type: 'number', example: 12 },
          },
        },
        zones_by_timeframe: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: { $ref: '#/components/schemas/DemandZoneResponseDto' },
          },
        },
      },
    },
  })
  async getAllTimeframesDemandZones(
    @Query('all_stocks') allStocks: string = 'true',
    @Query('symbol') symbol?: string,
    @Query('exchange_token') exchange_token?: string,
    @Query('zone_strength') zone_strength?: string,
    @Query('is_active') is_active?: string,
    @Query('limit_per_timeframe') limitPerTimeframe: string = '100',
    @Query('include_timeframes') includeTimeframes?: string,
  ) {
    // Parse timeframes to include
    const allTimeframes = ['1m', '3m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', 'month'];
    const timeframes = includeTimeframes 
      ? includeTimeframes.split(',').map(tf => tf.trim()).filter(tf => allTimeframes.includes(tf))
      : allTimeframes;
    
    const limitPerTf = Math.min(parseInt(limitPerTimeframe), 300); // Increased max limit
    
    // Handle all_stocks parameter logic
    const isAllStocks = allStocks === 'true' || allStocks === undefined;
    const finalSymbol = isAllStocks ? undefined : symbol;
    const finalExchangeToken = isAllStocks ? undefined : exchange_token;
    
    const zonesByTimeframe: Record<string, DemandZoneResponseDto[]> = {};
    let totalZones = 0;
    const symbolsSet = new Set<string>();

    console.log(`\n⏰ ===== FETCHING ALL TIMEFRAMES DEMAND ZONES =====`);
    console.log(`🎯 Mode: ${isAllStocks ? '🌐 ALL STOCKS' : '🔍 SINGLE STOCK'} across ${timeframes.length} timeframes`);
    console.log(`📊 Stock Filter: all_stocks=${allStocks}, symbol=${finalSymbol || 'ALL'}, exchange_token=${finalExchangeToken || 'ALL'}`);
    console.log(`📊 Other Filters: strength=${zone_strength || 'ALL'}, active=${is_active || 'ALL'}`);
    console.log(`📋 Timeframes: [${timeframes.join(', ')}]`);
    console.log(`🔢 Limit per timeframe: ${limitPerTf}`);

    const detailedResults: Record<string, any> = {};
    const strengthBreakdown: Record<string, { strong: number; medium: number; weak: number }> = {};

    // Fetch zones for each timeframe
    for (const timeframe of timeframes) {
      const queryDto: GetDemandZonesQueryDto = {
        symbol: finalSymbol,
        exchange_token: finalExchangeToken,
        timeframe,
        zone_strength: zone_strength as ZoneStrength,
        is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        page: 1,
        limit: limitPerTf,
      };

      try {
        const result = await this.demandZoneService.getDemandZones(queryDto);
        
        if (result.data.length > 0) {
          zonesByTimeframe[timeframe] = result.data;
          totalZones += result.data.length;
          
          // Collect unique symbols and detailed analysis
          const timeframeSymbols = new Set<string>();
          const zoneTypes = { DBR: 0, RBR: 0 };
          const strengthCounts = { strong: 0, medium: 0, weak: 0 };
          
          result.data.forEach(zone => {
            symbolsSet.add(zone.symbol);
            timeframeSymbols.add(zone.symbol);
            
            // Count zone types
            if (zone.zone_type === ZoneType.DROP_BASE_RALLY) zoneTypes.DBR++;
            else if (zone.zone_type === ZoneType.RALLY_BASE_RALLY) zoneTypes.RBR++;
            
            // Count strengths
            if (zone.strength.strength === 'strong') strengthCounts.strong++;
            else if (zone.strength.strength === 'medium') strengthCounts.medium++;
            else if (zone.strength.strength === 'weak') strengthCounts.weak++;
          });
          
          strengthBreakdown[timeframe] = strengthCounts;
          
          detailedResults[timeframe] = {
            total_zones: result.data.length,
            total_available: result.meta.total,
            symbols_count: timeframeSymbols.size,
            symbols: Array.from(timeframeSymbols).slice(0, 5), // Show first 5 symbols
            zone_types: zoneTypes,
            strength_breakdown: strengthCounts,
            pagination: {
              page: result.meta.page,
              total_pages: result.meta.totalPages,
              showing: `${result.data.length} of ${result.meta.total}`
            }
          };
          
          console.log(`✅ ${timeframe}: ${result.data.length} zones found (${result.meta.total} total available)`);
          console.log(`   📈 Symbols: ${timeframeSymbols.size} (${Array.from(timeframeSymbols).slice(0, 3).join(', ')}${timeframeSymbols.size > 3 ? '...' : ''})`);
          console.log(`   🎯 Types: ${zoneTypes.DBR} DBR, ${zoneTypes.RBR} RBR`);
          console.log(`   💪 Strength: ${strengthCounts.strong} strong, ${strengthCounts.medium} medium, ${strengthCounts.weak} weak`);
          
        } else {
          detailedResults[timeframe] = {
            total_zones: 0,
            total_available: result.meta.total,
            reason: result.meta.total === 0 ? 'No zones detected in this timeframe' : 'Filtered out by current criteria'
          };
          console.log(`⚪ ${timeframe}: No zones found (${result.meta.total} total available, filtered by criteria)`);
        }
      } catch (error) {
        console.error(`❌ ${timeframe}: Error fetching zones - ${error.message}`);
        detailedResults[timeframe] = {
          error: error.message,
          total_zones: 0
        };
      }
    }

    // Calculate overall statistics
    const overallStrength = {
      strong: Object.values(strengthBreakdown).reduce((sum, tf) => sum + tf.strong, 0),
      medium: Object.values(strengthBreakdown).reduce((sum, tf) => sum + tf.medium, 0),
      weak: Object.values(strengthBreakdown).reduce((sum, tf) => sum + tf.weak, 0)
    };

    console.log(`\n📊 ========== COMPREHENSIVE SUMMARY ==========`);
    console.log(`📈 Total Zones Found: ${totalZones}`);
    console.log(`📅 Timeframes with Data: ${Object.keys(zonesByTimeframe).length}/${timeframes.length}`);
    console.log(`🏢 Unique Symbols Covered: ${symbolsSet.size}`);
    console.log(`💪 Overall Strength Distribution:`);
    console.log(`   🔥 Strong: ${overallStrength.strong} (${((overallStrength.strong / totalZones) * 100).toFixed(1)}%)`);
    console.log(`   ⚡ Medium: ${overallStrength.medium} (${((overallStrength.medium / totalZones) * 100).toFixed(1)}%)`);
    console.log(`   📊 Weak: ${overallStrength.weak} (${((overallStrength.weak / totalZones) * 100).toFixed(1)}%)`);
    
    if (symbolsSet.size > 0) {
      console.log(`\n🏢 Top Symbols: ${Array.from(symbolsSet).slice(0, 10).join(', ')}${symbolsSet.size > 10 ? `... (+${symbolsSet.size - 10} more)` : ''}`);
    }
    
    console.log(`\n📋 Detailed Timeframe Breakdown:`);
    Object.entries(detailedResults).forEach(([tf, details]) => {
      if (details.total_zones > 0) {
        console.log(`   ${tf}: ${details.total_zones} zones | ${details.symbols_count} symbols | Strong:${details.strength_breakdown.strong} Med:${details.strength_breakdown.medium} Weak:${details.strength_breakdown.weak}`);
      }
    });
    
    console.log(`⏰ ============================================\n`);

    // Add formation timestamps to all zones and enhance with Indian timezone
    const enhancedZonesByTimeframe = {};
    Object.entries(zonesByTimeframe).forEach(([timeframe, zones]) => {
      enhancedZonesByTimeframe[timeframe] = zones.map(zone => {
        // Helper function to format dates in Indian timezone
        const formatIndianTime = (dateStr: string | Date) => {
          if (!dateStr) return null;
          const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
          return new Date(date.getTime() + (5.5 * 60 * 60 * 1000)).toISOString(); // Indian timezone is UTC+5:30
        };

        // Enhance zone details with formation timestamps using any type for flexibility
        let enhancedDetails: any = {};
        
        if (zone.details) {
          // Build the object in the exact order we want
          
          // Add pattern_type first if it exists
          if ((zone.details as any).pattern_type) {
            enhancedDetails.pattern_type = (zone.details as any).pattern_type;
          }

          // Add leg_in_candle with timestamps (for DBR patterns)
          if ((zone.details as any).leg_in_candle?.timestamp) {
            const legInTimestamp = (zone.details as any).leg_in_candle.timestamp;
            enhancedDetails.leg_in_candle = {
              ...(zone.details as any).leg_in_candle,
              leg_in_formed_at: formatIndianTime(legInTimestamp),
              leg_in_formed_at_readable: new Date(legInTimestamp).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                weekday: 'short',
                timeZone: 'Asia/Kolkata'
              }),
              leg_in_formed_time: new Date(legInTimestamp).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
              })
            };
          }

          // Add leg_in_ohlc with timestamps (for RBR patterns)
          if (zone.details.leg_in_ohlc && !(zone.details as any).leg_in_candle) {
            const zoneTimestamp = zone.zone_formed_at || zone.created_at;
            enhancedDetails.leg_in_ohlc = {
              ...zone.details.leg_in_ohlc,
              leg_in_formed_at: formatIndianTime(zoneTimestamp),
              leg_in_formed_at_readable: new Date(zoneTimestamp).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                weekday: 'short',
                timeZone: 'Asia/Kolkata'
              }),
              leg_in_formed_time: new Date(zoneTimestamp).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
              })
            };
          }

          // Add leg_in_percentage if it exists
          if ((zone.details as any).leg_in_percentage) {
            enhancedDetails.leg_in_percentage = (zone.details as any).leg_in_percentage;
          }

          // Add base_candles with timestamps
          if (zone.details.base_candles && Array.isArray(zone.details.base_candles)) {
            enhancedDetails.base_candles = zone.details.base_candles.map(baseCandle => ({
              ...baseCandle,
              base_percentage: baseCandle.percentage_move || 
                Math.abs(((baseCandle.close - baseCandle.open) / baseCandle.open) * 100),
              base_formed_at: formatIndianTime(baseCandle.timestamp),
              base_formed_at_readable: new Date(baseCandle.timestamp).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                weekday: 'short',
                timeZone: 'Asia/Kolkata'
              }),
              base_formed_time: new Date(baseCandle.timestamp).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
              })
            }));

            // Add base_candles_percentage RIGHT AFTER base_candles
            enhancedDetails.base_candles_percentage = parseFloat((zone.details.base_candles.reduce((sum, baseCandle) => {
              return sum + (baseCandle.percentage_move || Math.abs(((baseCandle.close - baseCandle.open) / baseCandle.open) * 100));
            }, 0) / zone.details.base_candles.length).toFixed(2));
          }

          // Add leg_out_candle with timestamps (for DBR patterns)
          if ((zone.details as any).leg_out_candle?.timestamp) {
            const legOutTimestamp = (zone.details as any).leg_out_candle.timestamp;
            enhancedDetails.leg_out_candle = {
              ...(zone.details as any).leg_out_candle,
              leg_out_formed_at: formatIndianTime(legOutTimestamp),
              leg_out_formed_at_readable: new Date(legOutTimestamp).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                weekday: 'short',
                timeZone: 'Asia/Kolkata'
              }),
              leg_out_formed_time: new Date(legOutTimestamp).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
              })
            };
          }

          // Add leg_out_ohlc with timestamps (for RBR patterns)
          if (zone.details.leg_out_ohlc && !(zone.details as any).leg_out_candle) {
            const baseEnd = zone.details.base_candles && zone.details.base_candles.length > 0 ? 
              zone.details.base_candles[zone.details.base_candles.length - 1].timestamp : 
              zone.zone_formed_at || zone.created_at;
            
            enhancedDetails.leg_out_ohlc = {
              ...zone.details.leg_out_ohlc,
              leg_out_formed_at: formatIndianTime(baseEnd),
              leg_out_formed_at_readable: new Date(baseEnd).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                weekday: 'short',
                timeZone: 'Asia/Kolkata'
              }),
              leg_out_formed_time: new Date(baseEnd).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
              })
            };
          }

          // Add leg_out_percentage if it exists
          if ((zone.details as any).leg_out_percentage) {
            enhancedDetails.leg_out_percentage = (zone.details as any).leg_out_percentage;
          }

          // Add any remaining fields that we haven't handled
          Object.keys(zone.details).forEach(key => {
            if (!enhancedDetails.hasOwnProperty(key)) {
              enhancedDetails[key] = (zone.details as any)[key];
            }
          });
        }

        return {
          ...zone,
          // Fix zone_formed_at if it's null - use created_at as fallback
          zone_formed_at: zone.zone_formed_at || zone.created_at,
          // Enhanced details with formation timestamps
          details: enhancedDetails,
          formation_details: {
            zone_formation_date: formatIndianTime(zone.zone_formed_at || zone.created_at),
            zone_formation_date_readable: new Date(zone.zone_formed_at || zone.created_at).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short', 
              day: 'numeric',
              weekday: 'short',
              timeZone: 'Asia/Kolkata'
            }),
            zone_formation_time: new Date(zone.zone_formed_at || zone.created_at).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
              timeZone: 'Asia/Kolkata'
            })
          }
        };
      });
    });

    return {
      summary: {
        total_zones: totalZones,
        timeframes_with_zones: Object.keys(zonesByTimeframe).length,
        symbols_covered: symbolsSet.size,
        overall_strength_distribution: overallStrength,
        top_symbols: Array.from(symbolsSet).slice(0, 10),
        requested_filters: {
          all_stocks: allStocks,
          symbol: finalSymbol || 'ALL',
          exchange_token: finalExchangeToken || 'ALL',
          zone_strength: zone_strength || 'ALL',
          is_active: is_active || 'ALL',
          limit_per_timeframe: limitPerTf,
          include_timeframes: includeTimeframes || 'ALL',
        },
      },
      detailed_analysis: detailedResults,
      zones_by_timeframe: enhancedZonesByTimeframe,
    };
  }

  @Get('bulk-overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get bulk overview of all demand zones',
    description: 'Provides a comprehensive overview of all demand zones across stocks and timeframes with summary statistics.',
  })
  @ApiQuery({
    name: 'include_zones',
    required: false,
    description: 'Include actual zone data (false for summary only)',
    example: 'true',
  })
  @ApiOkResponse({
    description: 'Bulk overview retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            total_zones: { type: 'number' },
            active_zones: { type: 'number' },
            total_stocks: { type: 'number' },
            total_timeframes: { type: 'number' },
          },
        },
        by_timeframe: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              total: { type: 'number' },
              active: { type: 'number' },
              strong: { type: 'number' },
              medium: { type: 'number' },
              weak: { type: 'number' },
            },
          },
        },
        by_strength: {
          type: 'object',
          properties: {
            strong: { type: 'number' },
            medium: { type: 'number' },
            weak: { type: 'number' },
          },
        },
        top_stocks_by_zone_count: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              total_zones: { type: 'number' },
              active_zones: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getBulkOverview(@Query('include_zones') includeZones: string = 'false') {
    console.log(`\n📈 ===== GENERATING BULK OVERVIEW =====`);
    console.log(`Include zones data: ${includeZones}`);

    // Get all zones without pagination for overview
    const allZonesResult = await this.demandZoneService.getDemandZones({
      page: 1,
      limit: 10000, // Large limit to get overview
    });

    const zones = allZonesResult.data;
    
    // Calculate summary statistics
    const summary = {
      total_zones: zones.length,
      active_zones: zones.filter(z => z.status.is_active).length,
      total_stocks: new Set(zones.map(z => z.symbol)).size,
      total_timeframes: new Set(zones.map(z => z.timeframe)).size,
    };

    // Group by timeframe
    const byTimeframe: Record<string, any> = {};
    zones.forEach(zone => {
      if (!byTimeframe[zone.timeframe]) {
        byTimeframe[zone.timeframe] = {
          total: 0,
          active: 0,
          strong: 0,
          medium: 0,
          weak: 0,
        };
      }
      byTimeframe[zone.timeframe].total++;
      if (zone.status.is_active) byTimeframe[zone.timeframe].active++;
      byTimeframe[zone.timeframe][zone.strength.strength]++;
    });

    // Group by strength
    const byStrength = {
      strong: zones.filter(z => z.strength.strength === 'strong').length,
      medium: zones.filter(z => z.strength.strength === 'medium').length,
      weak: zones.filter(z => z.strength.strength === 'weak').length,
    };

    // Top stocks by zone count
    const stockCounts: Record<string, { total: number, active: number }> = {};
    zones.forEach(zone => {
      if (!stockCounts[zone.symbol]) {
        stockCounts[zone.symbol] = { total: 0, active: 0 };
      }
      stockCounts[zone.symbol].total++;
      if (zone.status.is_active) stockCounts[zone.symbol].active++;
    });

    const topStocksByZoneCount = Object.entries(stockCounts)
      .map(([symbol, counts]) => ({
        symbol,
        total_zones: counts.total,
        active_zones: counts.active,
      }))
      .sort((a, b) => b.total_zones - a.total_zones)
      .slice(0, 10);

    console.log(`📊 Overview generated: ${summary.total_zones} zones, ${summary.total_stocks} stocks, ${summary.total_timeframes} timeframes`);
    console.log(`💪 Strength distribution: Strong=${byStrength.strong}, Medium=${byStrength.medium}, Weak=${byStrength.weak}`);
    console.log(`📈 =============================\n`);

    const response: any = {
      summary,
      by_timeframe: byTimeframe,
      by_strength: byStrength,
      top_stocks_by_zone_count: topStocksByZoneCount,
    };

    // Optionally include zone data
    if (includeZones === 'true') {
      response.zones = zones;
    }

    return response;
  }

  @Post('detect-all-timeframes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Detect demand zones across all timeframes',
    description: 'Runs demand zone detection for a specific symbol or all symbols across all available timeframes. This is a bulk operation that may take some time.',
  })
  @ApiCreatedResponse({
    description: 'Bulk detection completed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timeframe: { type: 'string' },
              zones_detected: { type: 'number' },
              processing_time_ms: { type: 'number' },
              status: { type: 'string' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            total_zones_detected: { type: 'number' },
            successful_timeframes: { type: 'number' },
            failed_timeframes: { type: 'number' },
            total_processing_time_ms: { type: 'number' },
          },
        },
      },
    },
  })
  async detectAllTimeframes(
    @Body() detectDto: {
      symbol?: string;
      exchange_token?: string;
      lookback_candles?: number;
      timeframes?: string[];
    } = {}
  ) {
    const {
      symbol,
      exchange_token,
      lookback_candles = 100,
      timeframes = ['1m', '3m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', 'month']
    } = detectDto;

    const results = [];
    let totalZones = 0;
    let successfulTimeframes = 0;
    let failedTimeframes = 0;
    const startTime = Date.now();

    console.log(`\n🚀 ===== BULK DETECTION STARTED FOR ALL TIMEFRAMES =====`);
    console.log(`Symbol: ${symbol || 'ALL'}, Exchange Token: ${exchange_token || 'ALL'}`);
    console.log(`Timeframes: ${timeframes.length}, Lookback: ${lookback_candles}`);

    for (const timeframe of timeframes) {
      try {
        console.log(`\n⏰ Processing timeframe: ${timeframe}`);
        const tfStartTime = Date.now();
        
        const result = await this.demandZoneService.detectDemandZones({
          symbol,
          exchange_token,
          timeframe,
          lookback_candles,
        });

        const tfProcessingTime = Date.now() - tfStartTime;

        results.push({
          timeframe,
          zones_detected: result.zones_detected,
          processing_time_ms: tfProcessingTime,
          status: 'success',
          date_range: result.date_range,
        });

        totalZones += result.zones_detected;
        successfulTimeframes++;
        
        console.log(`✅ ${timeframe}: ${result.zones_detected} zones detected in ${tfProcessingTime}ms`);
        
      } catch (error) {
        results.push({
          timeframe,
          zones_detected: 0,
          processing_time_ms: 0,
          status: 'failed',
          error: error.message,
        });
        
        failedTimeframes++;
        console.error(`❌ ${timeframe}: Detection failed - ${error.message}`);
      }
    }

    const totalProcessingTime = Date.now() - startTime;
    
    console.log(`\n🎯 ===== BULK DETECTION COMPLETED =====`);
    console.log(`Total zones detected: ${totalZones}`);
    console.log(`Successful timeframes: ${successfulTimeframes}/${timeframes.length}`);
    console.log(`Failed timeframes: ${failedTimeframes}/${timeframes.length}`);
    console.log(`Total processing time: ${totalProcessingTime}ms`);
    console.log(`Average per timeframe: ${Math.round(totalProcessingTime / timeframes.length)}ms`);
    console.log(`🚀 ==========================================\n`);

    return {
      message: 'Bulk demand zone detection completed across all timeframes',
      results,
      summary: {
        total_zones_detected: totalZones,
        successful_timeframes: successfulTimeframes,
        failed_timeframes: failedTimeframes,
        total_processing_time_ms: totalProcessingTime,
        average_processing_time_per_timeframe_ms: Math.round(totalProcessingTime / timeframes.length),
        symbol: symbol || 'ALL',
        exchange_token: exchange_token || 'ALL',
      },
    };
  }

  // ⚠️ IMPORTANT: Keep this route at the END - parameterized routes must come after specific routes
  @Get(':uuid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get demand zone by UUID',
    description: 'Retrieves a specific demand zone by its UUID.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'Unique identifier of the demand zone',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponseSuccess(DemandZoneResponseDto)
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  @ApiNotFoundResponse({ description: 'Demand zone not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getDemandZoneByUuid(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<DemandZoneResponseDto> {
    return this.demandZoneService.getDemandZoneByUuid(uuid);
  }
}
