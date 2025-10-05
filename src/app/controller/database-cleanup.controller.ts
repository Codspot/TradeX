import { Controller, Post, Get, Logger } from '@nestjs/common';
import { DatabaseCleanupService } from '../services/database-cleanup.service';

/**
 * 🧹 DATABASE CLEANUP CONTROLLER
 * 
 * Provides API endpoints to:
 * - Get cleanup statistics (current row counts)
 * - Manually trigger database cleanup
 * 
 * ⚠️ WARNING: Use with extreme caution in production!
 */

@Controller('api/database-cleanup')
export class DatabaseCleanupController {
  private readonly logger = new Logger(DatabaseCleanupController.name);

  constructor(
    private readonly databaseCleanupService: DatabaseCleanupService,
  ) {}

  /**
   * 📊 GET CLEANUP STATISTICS
   * Shows current row counts in all tables before cleanup
   * 
   * GET /api/database-cleanup/stats
   */
  @Get('stats')
  async getCleanupStats() {
    try {
      this.logger.log('📊 Getting database cleanup statistics...');
      
      const stats = await this.databaseCleanupService.getCleanupStats();
      
      this.logger.log('✅ Database statistics retrieved successfully');
      
      return {
        success: true,
        message: 'Database statistics retrieved successfully',
        data: stats,
        summary: {
          totalRows: Object.values(stats).reduce((sum: number, count: number) => sum + count, 0),
          hasData: Object.values(stats).some((count: number) => count > 0)
        }
      };
      
    } catch (error) {
      this.logger.error('❌ Error getting cleanup statistics:', error);
      return {
        success: false,
        message: 'Failed to get cleanup statistics',
        error: error.message
      };
    }
  }

  /**
   * 🧹 MANUAL DATABASE CLEANUP
   * Manually trigger complete database cleanup
   * 
   * ⚠️ DANGER: This will delete ALL data from ALL tables!
   * 
   * POST /api/database-cleanup/force
   */
  @Post('force')
  async forceCleanup() {
    try {
      this.logger.warn('🚨 Manual database cleanup triggered via API...');
      
      // Get stats before cleanup
      const statsBefore = await this.databaseCleanupService.getCleanupStats();
      const totalRowsBefore = Object.values(statsBefore).reduce((sum: number, count: number) => sum + count, 0);
      
      // Perform cleanup
      await this.databaseCleanupService.forceCleanup();
      
      // Get stats after cleanup
      const statsAfter = await this.databaseCleanupService.getCleanupStats();
      const totalRowsAfter = Object.values(statsAfter).reduce((sum: number, count: number) => sum + count, 0);
      
      this.logger.log('✅ Manual database cleanup completed successfully');
      
      return {
        success: true,
        message: 'Database cleanup completed successfully',
        data: {
          before: statsBefore,
          after: statsAfter,
          deleted: totalRowsBefore - totalRowsAfter
        }
      };
      
    } catch (error) {
      this.logger.error('❌ Error during manual cleanup:', error);
      return {
        success: false,
        message: 'Failed to perform database cleanup',
        error: error.message
      };
    }
  }

  /**
   * 🔍 HEALTH CHECK
   * Check if cleanup service is running
   * 
   * GET /api/database-cleanup/health
   */
  @Get('health')
  async healthCheck() {
    return {
      success: true,
      message: 'Database cleanup service is running',
      timestamp: new Date().toISOString(),
      service: 'DatabaseCleanupService'
    };
  }
}
