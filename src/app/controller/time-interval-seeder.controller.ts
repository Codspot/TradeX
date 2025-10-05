import { Controller, Get, Post, Put, Query, Logger, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TimeIntervalSeederService } from '../services/time-interval-seeder.service';
import { TimeInterval } from '../entities/market-data-interval.entity';

@ApiTags('Time Interval Seeder')
@Controller('api/time-intervals')
export class TimeIntervalController {
  private readonly logger = new Logger(TimeIntervalController.name);

  constructor(
    private readonly timeIntervalSeederService: TimeIntervalSeederService,
  ) {}

  @Post('seed')
  @ApiOperation({ 
    summary: 'Seed all time intervals',
    description: 'Clears existing time intervals and seeds all required intervals (1m, 3m, 5m, 10m, 15m, 30m, 1h, 2h, 4h, 1d, 1w, 1M) to the database.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Time intervals seeded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Successfully seeded all time intervals' },
        timestamp: { type: 'string', example: '2025-01-15T10:30:00.000Z' }
      }
    }
  })
  async seedAllIntervals(): Promise<{ success: boolean; message: string; timestamp: string }> {
    try {
      await this.timeIntervalSeederService.seedAllTimeIntervals();
      return {
        success: true,
        message: 'Successfully seeded all time intervals',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error seeding time intervals:', error);
      return {
        success: false,
        message: `Error seeding time intervals: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get time interval statistics',
    description: 'Returns comprehensive statistics about all time intervals including total count, active/inactive counts, and detailed interval information.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Time interval statistics',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 12 },
            active: { type: 'number', example: 12 },
            inactive: { type: 'number', example: 0 },
            intervals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  interval: { type: 'string', example: '1m' },
                  name: { type: 'string', example: '1 Minute' },
                  durationMinutes: { type: 'number', example: 1 },
                  isActive: { type: 'boolean', example: true }
                }
              }
            }
          }
        }
      }
    }
  })
  async getIntervalStats() {
    try {
      const stats = await this.timeIntervalSeederService.getIntervalStats();
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting interval stats:', error);
      return {
        success: false,
        message: `Error getting interval stats: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('active')
  @ApiOperation({ 
    summary: 'Get active time intervals',
    description: 'Returns only the active time intervals ordered by sort order.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Active time intervals'
  })
  async getActiveIntervals() {
    try {
      const intervals = await this.timeIntervalSeederService.getActiveIntervals();
      return {
        success: true,
        data: {
          count: intervals.length,
          intervals: intervals.map(i => ({
            interval: i.interval,
            name: i.name,
            description: i.description,
            durationMinutes: i.durationMinutes,
            sortOrder: i.sortOrder,
          })),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting active intervals:', error);
      return {
        success: false,
        message: `Error getting active intervals: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('validate')
  @ApiOperation({ 
    summary: 'Validate all required intervals exist',
    description: 'Checks if all required time intervals exist in the database and returns validation status.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Validation results'
  })
  async validateIntervals() {
    try {
      const validation = await this.timeIntervalSeederService.validateAllIntervalsExist();
      return {
        success: true,
        data: validation,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error validating intervals:', error);
      return {
        success: false,
        message: `Error validating intervals: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Put('status')
  @ApiOperation({ 
    summary: 'Update interval status',
    description: 'Activate or deactivate a specific time interval.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        interval: { type: 'string', example: '1m', enum: ['1m', '3m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', '1M'] },
        isActive: { type: 'boolean', example: true }
      },
      required: ['interval', 'isActive']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Interval status updated successfully'
  })
  async updateIntervalStatus(@Body() body: { interval: TimeInterval; isActive: boolean }) {
    try {
      await this.timeIntervalSeederService.updateIntervalStatus(body.interval, body.isActive);
      return {
        success: true,
        message: `Interval ${body.interval} ${body.isActive ? 'activated' : 'deactivated'} successfully`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error updating interval status:', error);
      return {
        success: false,
        message: `Error updating interval status: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('clear')
  @ApiOperation({ 
    summary: 'Clear all time intervals',
    description: 'Removes all time intervals from the database. Use with caution!'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'All intervals cleared successfully'
  })
  async clearAllIntervals() {
    try {
      await this.timeIntervalSeederService.clearAllIntervals();
      return {
        success: true,
        message: 'All time intervals cleared successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error clearing intervals:', error);
      return {
        success: false,
        message: `Error clearing intervals: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
