import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsArray, ValidateNested, IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class LtpTickDto {
  @ApiProperty({
    description: 'Subscription mode from Smart API',
    example: 1,
  })
  @IsNumber()
  subscription_mode: number;

  @ApiProperty({
    description: 'Exchange type from Smart API',
    example: 1,
  })
  @IsNumber()
  exchange_type: number;

  @ApiProperty({
    description: 'Token from Smart API',
    example: '3506',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Sequence number from Smart API',
    example: 24964,
  })
  @IsNumber()
  sequence_number: number;

  @ApiProperty({
    description: 'Exchange timestamp from Smart API',
    example: 1756517105578,
  })
  @IsNumber()
  exchange_timestamp: number;

  @ApiProperty({
    description: 'Last traded price from Smart API (in paise)',
    example: 362880,
  })
  @IsNumber()
  last_traded_price: number;

  @ApiProperty({
    description: 'Subscription mode value from Smart API',
    example: 'LTP',
  })
  @IsString()
  subscription_mode_val: string;

  // Optional fields that might come in full mode
  @ApiProperty({
    description: 'Last traded quantity',
    example: 100,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  last_traded_quantity?: number;

  @ApiProperty({
    description: 'Average traded price',
    example: 2450.25,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  average_traded_price?: number;

  @ApiProperty({
    description: 'Volume traded',
    example: 15000000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  volume_trade_for_the_day?: number;

  @ApiProperty({
    description: 'Total buy quantity',
    example: 5000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  total_buy_quantity?: number;

  @ApiProperty({
    description: 'Total sell quantity',
    example: 4500,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  total_sell_quantity?: number;

  @ApiProperty({
    description: 'Open price of the day',
    example: 2445.00,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  open_price_of_the_day?: number;

  @ApiProperty({
    description: 'High price of the day',
    example: 2465.50,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  high_price_of_the_day?: number;

  @ApiProperty({
    description: 'Low price of the day',
    example: 2440.25,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  low_price_of_the_day?: number;

  @ApiProperty({
    description: 'Close price',
    example: 2456.75,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  closed_price?: number;
}

export class LtpDataDto {
  @ApiProperty({
    description: 'WebSocket ID from Python worker',
    example: '9489b7ef-b620-469f-b3fe-e1732b59ffdc',
  })
  @IsString()
  @IsNotEmpty()
  websocket_id: string;

  @ApiProperty({
    description: 'Single tick data from Python worker',
    type: LtpTickDto,
  })
  @ValidateNested()
  @Type(() => LtpTickDto)
  tick: LtpTickDto;

  @ApiProperty({
    description: 'Timestamp when the data was sent',
    example: '2025-01-24T14:30:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  timestamp?: string;
}

// Alternative DTO for batch processing (if needed later)
export class LtpBatchDataDto {
  @ApiProperty({
    description: 'Array of LTP tick data',
    type: [LtpTickDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LtpTickDto)
  ticks: LtpTickDto[];

  @ApiProperty({
    description: 'Timestamp when the data was sent',
    example: '2025-01-24T14:30:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  timestamp?: string;
}