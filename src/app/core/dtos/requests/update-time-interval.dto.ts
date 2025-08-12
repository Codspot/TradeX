import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { TimeInterval } from '../../../entities/market-data-interval.entity';

export class UpdateTimeIntervalDto {
  @ApiPropertyOptional({ 
    description: 'Time interval value',
    enum: TimeInterval,
    example: TimeInterval.ONE_MINUTE
  })
  @IsOptional()
  @IsEnum(TimeInterval)
  interval?: TimeInterval;

  @ApiPropertyOptional({ 
    description: 'Display name of the time interval',
    example: '1 Minute' 
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Description of the time interval',
    example: 'One minute timeframe for high-frequency trading'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Duration in minutes',
    example: 1,
    minimum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ 
    description: 'Whether this interval is active',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ 
    description: 'Sort order for display',
    example: 1,
    minimum: 0,
    maximum: 999
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}
