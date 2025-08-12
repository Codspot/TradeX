import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { TimeInterval } from '../../../entities/market-data-interval.entity';

export class CreateTimeIntervalDto {
  @ApiProperty({ 
    description: 'Time interval value',
    enum: TimeInterval,
    example: TimeInterval.ONE_MINUTE
  })
  @IsEnum(TimeInterval)
  interval: TimeInterval;

  @ApiProperty({ 
    description: 'Display name of the time interval',
    example: '1 Minute' 
  })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Description of the time interval',
    example: 'One minute timeframe for high-frequency trading',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Duration in minutes',
    example: 1,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @ApiProperty({ 
    description: 'Whether this interval is active',
    example: true,
    default: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiProperty({ 
    description: 'Sort order for display',
    example: 1,
    minimum: 0,
    maximum: 999,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999)
  sortOrder?: number = 0;
}
