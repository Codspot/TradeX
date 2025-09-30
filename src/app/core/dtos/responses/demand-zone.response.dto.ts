import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums for demand zone classification
export enum ZoneStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong'
}

export enum ZoneType {
  DROP_BASE_RALLY = 'DROP-BASE-RALLY',
  RALLY_BASE_RALLY = 'RALLY-BASE-RALLY'
}

export class ZoneStrengthDto {
  @ApiProperty({ description: 'Zone strength level', example: 'strong', enum: ZoneStrength })
  strength: ZoneStrength;

  @ApiProperty({ description: 'Strength score', example: 0.85 })
  score: number;

  @ApiPropertyOptional({ description: 'Strength calculation details', example: 'Base on leg size ratio and test count' })
  details?: string;
}

export class ZoneStatusDto {
  @ApiProperty({ description: 'Whether the zone is active', example: true })
  is_active: boolean;

  @ApiProperty({ description: 'Whether the zone has been tested', example: false })
  is_tested: boolean;

  @ApiProperty({ description: 'Number of times zone was tested', example: 0 })
  test_count: number;

  @ApiPropertyOptional({ description: 'Last test date', example: '2024-01-15T10:30:00.000Z' })
  last_tested_at?: Date;
}

export class ZonePricesDto {
  @ApiProperty({ description: 'Zone bottom price', example: 2450.50 })
  bottom: number;

  @ApiProperty({ description: 'Zone top price', example: 2465.75 })
  top: number;

  @ApiProperty({ description: 'Zone height in points', example: 15.25 })
  height: number;

  @ApiProperty({ description: 'Zone height as percentage', example: 0.62 })
  height_percentage: number;
}

export class ZoneDetailsDto {
  @ApiProperty({ 
    description: 'Leg-in candle OHLC data with percentage calculation',
    example: {
      open: 2480.50,
      high: 2500.00,
      low: 2465.75,
      close: 2470.25,
      percentage_move: -1.37,
      candle_range: 34.25,
      candle_body: -10.25
    }
  })
  leg_in_ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
    percentage_move: number;
    candle_range: number;
    candle_body: number;
  };

  @ApiProperty({ description: 'Leg-in candle overall percentage move', example: -1.37 })
  leg_in_percentage: number;

  @ApiProperty({ 
    description: 'Leg-out candle OHLC data with percentage calculation',
    example: {
      open: 2451.00,
      high: 2485.25,
      low: 2450.50,
      close: 2482.75,
      percentage_move: 1.42,
      candle_range: 34.75,
      candle_body: 31.75
    }
  })
  leg_out_ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
    percentage_move: number;
    candle_range: number;
    candle_body: number;
  };

  @ApiProperty({ description: 'Leg-out candle overall percentage move', example: 1.42 })
  leg_out_percentage: number;

  @ApiProperty({
    description: 'Base candles forming the demand zone with individual percentage calculations',
    example: [
      {
        candle_number: 1,
        open: 2470.25,
        high: 2475.00,
        low: 2465.75,
        close: 2468.50,
        timestamp: '2025-09-25T09:30:00Z',
        percentage_move: -0.07,
        candle_range: 9.25,
        candle_body: -1.75,
        is_zone_start: true
      },
      {
        candle_number: 2,
        open: 2468.50,
        high: 2472.25,
        low: 2466.00,
        close: 2469.75,
        timestamp: '2025-09-25T09:31:00Z',
        percentage_move: 0.05,
        candle_range: 6.25,
        candle_body: 1.25,
        is_zone_start: false
      },
      {
        candle_number: 3,
        open: 2469.75,
        high: 2485.25,
        low: 2469.00,
        close: 2482.75,
        timestamp: '2025-09-25T09:32:00Z',
        percentage_move: 0.53,
        candle_range: 16.25,
        candle_body: 13.00,
        is_zone_end: true
      }
    ]
  })
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

  @ApiProperty({
    description: 'Zone range details - from 1st base candle leg-in low to last base candle leg-out high',
    example: {
      low: 2465.75,
      high: 2485.25,
      range_points: 19.50,
      range_percentage: 0.79
    }
  })
  zone_range: {
    low: number;
    high: number;
    range_points: number;
    range_percentage: number;
  };

  @ApiProperty({
    description: 'Summary of zone formation details with comprehensive percentage analysis',
    example: {
      total_candles: 5,
      base_candles_count: 3,
      base_candles_total_percentage: 0.51,
      base_candles_avg_percentage: 0.17,
      max_base_percentage: 0.53,
      min_base_percentage: -0.07,
      zone_consolidation_percentage: 0.45,
      zone_strength_factors: ['volume_spike', 'price_rejection']
    }
  })
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

  @ApiPropertyOptional({ description: 'Volume data if available' })
  volume_data?: {
    leg_in_volume: number;
    leg_out_volume: number;
    avg_base_volume: number;
  };
}

export class DemandZoneResponseDto {
  @ApiProperty({ description: 'Unique zone identifier', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  uuid: string;

  @ApiProperty({ description: 'Trading symbol', example: 'RELIANCE' })
  symbol: string;

  @ApiProperty({ description: 'Exchange token', example: '2885' })
  exchange_token: string;

  @ApiProperty({ description: 'Timeframe', example: '15m' })
  timeframe: string;

  @ApiProperty({ description: 'Zone detection type', example: 'DROP-BASE-RALLY', enum: ZoneType })
  zone_type: ZoneType;

  @ApiProperty({ description: 'Zone creation timestamp', example: '2024-01-15T09:15:00.000Z' })
  created_at: Date;

  @ApiProperty({ description: 'Zone formation timestamp', example: '2024-01-15T09:15:00.000Z' })
  zone_formed_at: Date;

  @ApiProperty({ description: 'Zone price levels', type: ZonePricesDto })
  prices: ZonePricesDto;

  @ApiProperty({ description: 'Zone strength analysis', type: ZoneStrengthDto })
  strength: ZoneStrengthDto;

  @ApiProperty({ description: 'Zone status information', type: ZoneStatusDto })
  status: ZoneStatusDto;

  @ApiProperty({ description: 'Detailed zone formation data', type: ZoneDetailsDto })
  details: ZoneDetailsDto;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: {
    detection_version: string;
    market_session: string;
    volatility_context: string;
  };
}

export class PaginatedDemandZonesResponseDto {
  @ApiProperty({ description: 'Array of demand zones', type: [DemandZoneResponseDto] })
  data: DemandZoneResponseDto[];

  @ApiProperty({ 
    description: 'Pagination metadata',
    example: {
      total: 150,
      page: 1,
      limit: 20,
      totalPages: 8
    }
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class DemandZoneDetectionResponseDto {
  @ApiProperty({ description: 'Success message', example: 'Demand zones detected successfully' })
  message: string;

  @ApiProperty({ description: 'Number of zones detected', example: 5 })
  zones_detected: number;

  @ApiProperty({ description: 'Processing time in milliseconds', example: 1250 })
  processing_time_ms: number;

  @ApiProperty({ 
    description: 'Date range analyzed',
    example: {
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-01-15T23:59:59.000Z'
    }
  })
  date_range: {
    from: Date;
    to: Date;
  };

  @ApiProperty({ 
    description: 'Detection parameters used',
    example: {
      symbol: 'RELIANCE',
      timeframe: '15m',
      lookback_candles: 100
    }
  })
  parameters: {
    symbol?: string;
    exchange_token?: string;
    timeframe?: string;
    lookback_candles: number;
  };

  @ApiPropertyOptional({ description: 'Detection statistics' })
  statistics?: {
    candles_analyzed: number;
    potential_patterns: number;
    valid_zones: number;
    filtered_zones: number;
  };
}
