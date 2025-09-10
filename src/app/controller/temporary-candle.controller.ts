import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { TemporaryCandleService } from '../services/temporary-candle.service';
import { TemporaryCandle } from '../entities/temporary-candle.entity';

@ApiTags('Temporary Candles')
@Controller('api/temporary-candles')
export class TemporaryCandleController {
  constructor(
    private readonly temporaryCandleService: TemporaryCandleService,
  ) {}

  @Post('generate')
  @ApiOperation({ 
    summary: 'Generate temporary candles for all instruments',
    description: 'Generates realistic temporary candle data for all instruments across all time intervals (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M). This is useful for testing and development purposes.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Temporary candles generated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Temporary candles generated successfully' },
        timestamp: { type: 'string', example: '2025-01-15T10:30:00.000Z' }
      }
    }
  })
  async generateTemporaryCandles(): Promise<{ message: string; timestamp: string }> {
    await this.temporaryCandleService.generateTemporaryCandlesForAllInstruments();
    return {
      message: 'Temporary candles generated successfully',
      timestamp: new Date().toISOString()
    };
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get temporary candle statistics',
    description: 'Returns comprehensive statistics about generated temporary candles including counts by interval, total candles, and unique instruments.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Temporary candle statistics',
    schema: {
      type: 'object',
      properties: {
        totalCandles: { type: 'number', example: 135000 },
        uniqueInstruments: { type: 'number', example: 150 },
        intervals: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']
        },
        intervalStats: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              interval: { type: 'string', example: '1h' },
              count: { type: 'string', example: '25200' }
            }
          }
        }
      }
    }
  })
  async getTemporaryCandleStats(): Promise<any> {
    return await this.temporaryCandleService.getTemporaryCandleStats();
  }

  @Get(':exchangeToken/:interval')
  @ApiOperation({ 
    summary: 'Get temporary candles for specific instrument and interval',
    description: 'Retrieves temporary candle data for a specific instrument (by exchange token) and time interval. Optionally filter by date range.'
  })
  @ApiParam({ 
    name: 'exchangeToken', 
    description: 'Exchange token of the instrument',
    example: '2885'
  })
  @ApiParam({ 
    name: 'interval', 
    description: 'Time interval for candles',
    enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'],
    example: '1h'
  })
  @ApiQuery({ 
    name: 'from', 
    required: false, 
    description: 'Start date (ISO format)',
    example: '2025-01-01T00:00:00.000Z'
  })
  @ApiQuery({ 
    name: 'to', 
    required: false, 
    description: 'End date (ISO format)',
    example: '2025-01-31T23:59:59.999Z'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Temporary candles data',
    type: [TemporaryCandle]
  })
  async getTemporaryCandles(
    @Param('exchangeToken') exchangeToken: string,
    @Param('interval') interval: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<TemporaryCandle[]> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    
    return await this.temporaryCandleService.getTemporaryCandles(
      exchangeToken,
      interval,
      fromDate,
      toDate
    );
  }

  @Post('clear')
  @ApiOperation({ 
    summary: 'Clear all temporary candles',
    description: 'Removes all temporary candle data from the database. Use with caution as this action cannot be undone.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Temporary candles cleared successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'All temporary candles cleared successfully' },
        timestamp: { type: 'string', example: '2025-01-15T10:30:00.000Z' }
      }
    }
  })
  async clearTemporaryCandles(): Promise<{ message: string; timestamp: string }> {
    await this.temporaryCandleService.clearTemporaryCandles();
    return {
      message: 'All temporary candles cleared successfully',
      timestamp: new Date().toISOString()
    };
  }

  @Get('intervals')
  @ApiOperation({ 
    summary: 'Get supported time intervals',
    description: 'Returns a list of all supported time intervals for temporary candle generation.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of supported intervals',
    schema: {
      type: 'object',
      properties: {
        intervals: {
          type: 'array',
          items: { type: 'string' },
          example: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']
        },
        descriptions: {
          type: 'object',
          additionalProperties: { type: 'string' },
          example: {
            '1m': '1-minute candles (1440 per day)',
            '5m': '5-minute candles (288 per day)',
            '15m': '15-minute candles (96 per day)',
            '30m': '30-minute candles (48 per day)',
            '1h': '1-hour candles (168 per week)',
            '4h': '4-hour candles (180 per month)',
            '1d': '1-day candles (365 per year)',
            '1w': '1-week candles (104 for 2 years)',
            '1M': '1-month candles (36 for 3 years)'
          }
        }
      }
    }
  })
  async getSupportedIntervals(): Promise<{ intervals: string[]; descriptions: Record<string, string> }> {
    const intervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];
    const descriptions = {
      '1m': '1-minute candles (1440 per day)',
      '5m': '5-minute candles (288 per day)', 
      '15m': '15-minute candles (96 per day)',
      '30m': '30-minute candles (48 per day)',
      '1h': '1-hour candles (168 per week)',
      '4h': '4-hour candles (180 per month)',
      '1d': '1-day candles (365 per year)',
      '1w': '1-week candles (104 for 2 years)',
      '1M': '1-month candles (36 for 3 years)'
    };

    return { intervals, descriptions };
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Check temporary candle system health',
    description: 'Performs a comprehensive health check of the temporary candle system including data completeness and recommendations.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Health check results',
    schema: {
      type: 'object',
      properties: {
        healthy: { type: 'boolean', example: true },
        stats: { 
          type: 'object',
          properties: {
            totalCandles: { type: 'number', example: 135000 },
            uniqueInstruments: { type: 'number', example: 150 },
            intervals: { type: 'array', items: { type: 'string' } }
          }
        },
        recommendations: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['Temporary candle system is healthy and ready for use.']
        }
      }
    }
  })
  async healthCheck(): Promise<{ healthy: boolean; stats: any; recommendations: string[] }> {
    const stats = await this.temporaryCandleService.getTemporaryCandleStats();
    const recommendations: string[] = [];
    let healthy = true;

    // Check if we have any candles
    if (stats.totalCandles === 0) {
      healthy = false;
      recommendations.push('No temporary candles found. Run seeding process.');
    } else {
      recommendations.push('Temporary candle system is healthy and ready for use.');
      recommendations.push(`${stats.totalCandles} candles available across ${stats.uniqueInstruments} instruments.`);
    }

    return { healthy, stats, recommendations };
  }

  @Post('seed')
  @ApiOperation({ 
    summary: 'Manual temporary candle seeding',
    description: 'Manually trigger the temporary candle seeding process. This will check if candles exist and generate them if needed.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Seeding process completed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Temporary candle seeding completed successfully' },
        timestamp: { type: 'string', example: '2025-01-15T10:30:00.000Z' }
      }
    }
  })
  async manualSeed(): Promise<{ message: string; timestamp: string }> {
    await this.temporaryCandleService.generateTemporaryCandlesForAllInstruments();
    return {
      message: 'Temporary candle seeding completed successfully',
      timestamp: new Date().toISOString()
    };
  }

  @Post('force-regenerate')
  @ApiOperation({ 
    summary: 'Force regenerate all temporary candles',
    description: 'Clears all existing temporary candles and regenerates them from scratch. Use with caution as this will delete all temporary data.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Force regeneration completed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Force regeneration completed successfully' },
        timestamp: { type: 'string', example: '2025-01-15T10:30:00.000Z' }
      }
    }
  })
  async forceRegenerate(): Promise<{ message: string; timestamp: string }> {
    await this.temporaryCandleService.clearTemporaryCandles();
    await this.temporaryCandleService.generateTemporaryCandlesForAllInstruments();
    return {
      message: 'Force regeneration completed successfully',
      timestamp: new Date().toISOString()
    };
  }
}