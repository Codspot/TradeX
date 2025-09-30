import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ZoneStrength } from '../responses/demand-zone.response.dto';

export class GetDemandZonesQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by trading symbol', example: 'RELIANCE' })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({ description: 'Filter by exchange token', example: '2885' })
  @IsOptional()
  @IsString()
  exchange_token?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by timeframe', 
    example: '15m',
    enum: ['1m', '3m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', 'month']
  })
  @IsOptional()
  @IsString()
  timeframe?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by zone strength', 
    example: 'strong',
    enum: ZoneStrength
  })
  @IsOptional()
  @IsEnum(ZoneStrength)
  zone_strength?: ZoneStrength;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Filter by test status' })
  @IsOptional()
  @IsBoolean()
  is_tested?: boolean;

  @ApiPropertyOptional({ description: 'Filter from date (ISO string)', example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO string)', example: '2024-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  to_date?: string;
}

export class DetectDemandZonesDto {
  @ApiPropertyOptional({ description: 'Trading symbol to analyze', example: 'RELIANCE' })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({ description: 'Exchange token to analyze', example: '2885' })
  @IsOptional()
  @IsString()
  exchange_token?: string;

  @ApiPropertyOptional({ 
    description: 'Timeframe for analysis', 
    example: '15m',
    enum: ['1m', '3m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', 'month']
  })
  @IsOptional()
  @IsString()
  timeframe?: string;

  @ApiPropertyOptional({ description: 'Number of candles to look back', default: 100, minimum: 10, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(1000)
  lookback_candles?: number = 100;

  @ApiPropertyOptional({ description: 'Force re-detection even if zones exist', default: false })
  @IsOptional()
  @IsBoolean()
  force_redetection?: boolean = false;
}
