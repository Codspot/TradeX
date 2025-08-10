import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max, IsEnum, IsBoolean, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum InstrumentType {
  EQ = 'EQ',
  FUT = 'FUT',
  CE = 'CE',
  PE = 'PE',
  INDEX = 'INDEX'
}

export class GetInstrumentsQueryDto {
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

  @ApiPropertyOptional({ description: 'Exchange to filter by (optional)', example: 'NSE' })
  @IsOptional()
  @IsString()
  exchange?: string;

  @ApiPropertyOptional({ description: 'Segment to filter by (optional)', example: 'EQ' })
  @IsOptional()
  @IsString()
  segment?: string;

  @ApiPropertyOptional({ description: 'Search by trading symbol or name (optional)', example: 'RELIANCE' })
  @IsOptional()
  @IsString()
  search?: string;
}
