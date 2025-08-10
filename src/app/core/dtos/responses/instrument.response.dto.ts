import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InstrumentResponseDto {
  @ApiProperty({ description: 'Unique identifier for the instrument', example: 'uuid-string' })
  uuid: string;

  @ApiProperty({ description: 'Server UUID', example: 'a16b9201-b4fe-448b-b100-9c834f4474fc' })
  serverUuid: string;

  @ApiProperty({ description: 'WebSocket UUID', example: 'websocket-uuid' })
  websocketUuid: string;

  @ApiProperty({ description: 'Instrument token for Smart API', example: '738561' })
  instrumentToken: string;

  @ApiProperty({ description: 'Exchange token for Smart API', example: '2885' })
  exchangeToken: string;

  @ApiProperty({ description: 'Trading symbol', example: 'RELIANCE' })
  tradingSymbol: string;

  @ApiProperty({ description: 'Instrument name', example: 'RELIANCE' })
  name: string;

  @ApiProperty({ description: 'Exchange name', example: 'NSE' })
  exchange: string;

  @ApiPropertyOptional({ description: 'Expiry date for derivatives', example: '2024-01-25' })
  expiryDate?: Date;

  @ApiPropertyOptional({ description: 'Strike price for options', example: 2500.00 })
  strikePrice?: number;

  @ApiProperty({ description: 'Minimum price movement', example: 0.05 })
  tickSize: number;

  @ApiProperty({ description: 'Lot size for trading', example: 1 })
  lotSize: number;

  @ApiProperty({ description: 'Type of instrument', example: 'EQ', enum: ['EQ', 'FUT', 'CE', 'PE', 'INDEX'] })
  instrumentType: string;

  @ApiProperty({ description: 'Market segment', example: 'EQ' })
  segment: string;

  @ApiPropertyOptional({ description: 'Last traded price', example: 2485.50 })
  lastPrice?: number;

  @ApiProperty({ description: 'Whether instrument is active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Created timestamp', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class PaginatedInstrumentsResponseDto {
  @ApiProperty({ type: [InstrumentResponseDto], description: 'List of instruments' })
  data: InstrumentResponseDto[];

  @ApiProperty({ 
    description: 'Pagination metadata',
    type: 'object',
    properties: {
      page: { type: 'number', example: 1, description: 'Current page number' },
      limit: { type: 'number', example: 50, description: 'Items per page' },
      total: { type: 'number', example: 150, description: 'Total number of items' },
      totalPages: { type: 'number', example: 3, description: 'Total number of pages' },
      hasNext: { type: 'boolean', example: true, description: 'Whether there is a next page' },
      hasPrev: { type: 'boolean', example: false, description: 'Whether there is a previous page' }
    }
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class InstrumentStatsResponseDto {
  @ApiProperty({ description: 'Total number of instruments', example: 150 })
  totalInstruments: number;

  @ApiProperty({ description: 'Number of active instruments', example: 145 })
  activeInstruments: number;

  @ApiProperty({ description: 'Number of inactive instruments', example: 5 })
  inactiveInstruments: number;

  @ApiProperty({ 
    description: 'Instruments grouped by exchange',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        exchange: { type: 'string', example: 'NSE' },
        count: { type: 'number', example: 140 }
      }
    }
  })
  byExchange: Array<{
    exchange: string;
    count: number;
  }>;

  @ApiProperty({ 
    description: 'Instruments grouped by type',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'EQ' },
        count: { type: 'number', example: 135 }
      }
    }
  })
  byType: Array<{
    type: string;
    count: number;
  }>;

  @ApiProperty({ 
    description: 'Instruments grouped by websocket',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        websocketUuid: { type: 'string', example: 'websocket-uuid' },
        count: { type: 'number', example: 50 }
      }
    }
  })
  byWebSocket: Array<{
    websocketUuid: string;
    count: number;
  }>;
}
