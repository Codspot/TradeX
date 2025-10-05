import { Injectable } from '@nestjs/common';

@Injectable()
export class TimezoneUtilService {
  /**
   * Get current IST timestamp as string
   */
  getISTTimestampString(): string {
    return this.createISTTimestamp().toISOString();
  }

  /**
   * Create IST timestamp (Indian Standard Time - UTC+5:30)
   * UNIVERSAL: Works regardless of server timezone - always returns IST time
   */
  createISTTimestamp(): Date {
    // Get current UTC time
    const now = new Date();
    
    // Convert to IST (UTC+5:30) regardless of server timezone
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000); // Convert to UTC
    const istTime = new Date(utcTime + istOffset); // Add IST offset
    
    return istTime;
  }

  /**
   * Convert any date to IST
   */
  convertToIST(date: Date): Date {
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000); // Convert to UTC
    const istTime = new Date(utcTime + istOffset); // Add IST offset
    
    return istTime;
  }

  /**
   * Format IST date as readable string
   */
  formatISTDate(date: Date): string {
    const istDate = this.convertToIST(date);
    return istDate.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * Format date as IST string (alias for controller compatibility)
   */
  formatDateAsIST(date: Date): string {
    return this.formatISTDate(date);
  }

  /**
   * Get current market time information
   */
  getCurrentMarketTimeInfo(): {
    currentTime: string;
    timezone: string;
    marketStatus: string;
  } {
    const istTime = this.createISTTimestamp();
    const hour = istTime.getHours();
    const minute = istTime.getMinutes();
    const currentTime = hour * 60 + minute;
    
    let marketStatus = 'CLOSED';
    if (currentTime >= 9 * 60 && currentTime < 9 * 60 + 8) {
      marketStatus = 'PRE_MARKET';
    } else if (currentTime >= 9 * 60 + 8 && currentTime < 9 * 60 + 15) {
      marketStatus = 'PRICE_DISCOVERY';
    } else if (currentTime >= 9 * 60 + 15 && currentTime <= 15 * 60 + 30) {
      marketStatus = 'ACTIVE_TRADING';
    } else if (currentTime > 15 * 60 + 30 && currentTime <= 17 * 60) {
      marketStatus = 'POST_MARKET';
    }

    return {
      currentTime: this.formatISTDate(istTime),
      timezone: 'Asia/Kolkata (IST)',
      marketStatus
    };
  }
}