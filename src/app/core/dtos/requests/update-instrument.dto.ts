import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum InstrumentType {
  EQ = 'EQ',
  FUT = 'FUT',
  CE = 'CE',
  PE = 'PE',
  INDEX = 'INDEX'
}

export class UpdateInstrumentDto {
  @ApiPropertyOptional({ description: 'Trading symbol', example: 'RELIANCE' })
  @IsOptional()
  @IsString()
  tradingSymbol?: string;

  @ApiPropertyOptional({ description: 'Instrument name', example: 'Reliance Industries Limited' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Exchange name', example: 'NSE' })
  @IsOptional()
  @IsString()
  exchange?: string;

  @ApiPropertyOptional({ description: 'Market segment', example: 'EQ' })
  @IsOptional()
  @IsString()
  segment?: string;

  @ApiPropertyOptional({ description: 'Type of instrument', enum: InstrumentType, example: 'EQ' })
  @IsOptional()
  @IsEnum(InstrumentType)
  instrumentType?: InstrumentType;

  @ApiPropertyOptional({ description: 'Expiry date for derivatives', example: '2024-12-26' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Strike price for options', example: 2500.00 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  strikePrice?: number;

  @ApiPropertyOptional({ description: 'Minimum price movement', example: 0.05 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tickSize?: number;

  @ApiPropertyOptional({ description: 'Lot size for trading', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lotSize?: number;

  @ApiPropertyOptional({ description: 'Last traded price', example: 2485.50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lastPrice?: number;

  @ApiPropertyOptional({ description: 'Whether instrument is active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
