import { ApiProperty } from '@nestjs/swagger';
import { TimeInterval } from '../../../entities/market-data-interval.entity';

export class TimeIntervalResponseDto {
  @ApiProperty({ 
    description: 'Unique identifier for the time interval',
    example: 'uuid-string' 
  })
  uuid: string;

  @ApiProperty({ 
    description: 'Time interval value',
    enum: TimeInterval,
    example: TimeInterval.ONE_MINUTE
  })
  interval: TimeInterval;

  @ApiProperty({ 
    description: 'Display name of the time interval',
    example: '1 Minute' 
  })
  name: string;

  @ApiProperty({ 
    description: 'Description of the time interval',
    example: 'One minute timeframe for high-frequency trading',
    nullable: true
  })
  description: string;

  @ApiProperty({ 
    description: 'Duration in minutes',
    example: 1 
  })
  durationMinutes: number;

  @ApiProperty({ 
    description: 'Whether this interval is active',
    example: true 
  })
  isActive: boolean;

  @ApiProperty({ 
    description: 'Sort order for display',
    example: 1 
  })
  sortOrder: number;

  @ApiProperty({ 
    description: 'Creation timestamp',
    example: '2023-01-01T00:00:00.000Z' 
  })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Last update timestamp',
    example: '2023-01-01T00:00:00.000Z' 
  })
  updatedAt: Date;
}
