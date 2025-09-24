import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebSocket } from '../entities/websocket.entity';
import { LtpDataDto } from '../core/dtos/requests/ltp-data.dto';
import { InMemoryCandleService } from './in-memory-candle.service';

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);

  constructor(
    @InjectRepository(WebSocket)
    private websocketRepository: Repository<WebSocket>,
    private readonly inMemoryCandleService: InMemoryCandleService,
  ) {}

  /**
   * Process LTP data received from Python worker
   */
  async processLtpData(websocketUuid: string, ltpData: LtpDataDto): Promise<{ ticksCount: number }> {
    try {
      // Verify websocket exists
      const websocket = await this.websocketRepository.findOne({
        where: { uuid: websocketUuid }
      });

      if (!websocket) {
        throw new NotFoundException(`WebSocket with UUID ${websocketUuid} not found`);
      }

      const processedTick = this.convertSmartApiTick(ltpData.tick);
      
      // Process the tick
      await this.handleLtpTick(websocketUuid, processedTick);

      // Update websocket last activity timestamp
      await this.updateWebSocketActivity(websocketUuid);

      return { ticksCount: 1 };
    } catch (error) {
      this.logger.error(`Error processing LTP data for websocket: ${websocketUuid}`, error.stack);
      throw error;
    }
  }

  /**
   * Convert Smart API tick format to our internal format
   */
  private convertSmartApiTick(smartApiTick: any): any {
    // Convert exchange timestamp to IST (Indian Standard Time)
    const exchangeTimestamp = smartApiTick.exchange_timestamp;
    let istTimestamp: Date;
    
    if (exchangeTimestamp) {
      // If exchange_timestamp is in milliseconds since epoch
      istTimestamp = new Date(exchangeTimestamp);
    } else {
      // Fallback to current time in IST
      istTimestamp = this.createISTTimestamp();
    }
    
    return {
      token: smartApiTick.token,
      name: smartApiTick.tradingsymbol || smartApiTick.name || '',
      exchange_type: smartApiTick.exchange_type,
      ltp: smartApiTick.last_traded_price / 100,
      ltp_paise: smartApiTick.last_traded_price,
      ltq: smartApiTick.last_traded_quantity,
      volume: smartApiTick.volume_trade_for_the_day,
      atp: smartApiTick.average_traded_price ? smartApiTick.average_traded_price / 100 : null,
      open: smartApiTick.open_price_of_the_day ? smartApiTick.open_price_of_the_day / 100 : null,
      high: smartApiTick.high_price_of_the_day ? smartApiTick.high_price_of_the_day / 100 : null,
      low: smartApiTick.low_price_of_the_day ? smartApiTick.low_price_of_the_day / 100 : null,
      close: smartApiTick.closed_price ? smartApiTick.closed_price / 100 : null,
      total_buy_quantity: smartApiTick.total_buy_quantity,
      total_sell_quantity: smartApiTick.total_sell_quantity,
      exchange_timestamp: exchangeTimestamp,
      sequence_number: smartApiTick.sequence_number,
      subscription_mode: smartApiTick.subscription_mode_val,
      timestamp: istTimestamp.toISOString(),
    };
  }

  /**
   * Handle individual LTP tick
   */
  private async handleLtpTick(websocketUuid: string, tick: any): Promise<void> {
    // Process tick with in-memory service
    await this.inMemoryCandleService.processTick({
      token: tick.token,
      name: tick.name || tick.token,
      ltp: tick.ltp,
      volume: tick.volume || 0,
      timestamp: tick.timestamp,
    });
  }

  /**
   * Create IST timestamp (Indian Standard Time - UTC+5:30)
   * UNIVERSAL: Works regardless of server timezone - always returns IST time
   */
  private createISTTimestamp(): Date {
    // Get current UTC time
    const now = new Date();
    
    // Convert to IST (UTC+5:30) regardless of server timezone
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000); // Convert to UTC
    const istTime = new Date(utcTime + istOffset); // Add IST offset
    
    return istTime;
  }

  /**
   * Update websocket last activity timestamp with IST
   */
  private async updateWebSocketActivity(websocketUuid: string): Promise<void> {
    // Use proper IST timestamp regardless of server timezone
    const istTime = this.createISTTimestamp();
    
    await this.websocketRepository.update(
      { uuid: websocketUuid },
      { 
        connectionStatus: 'connected',
        updatedAt: istTime
      }
    );
  }
}
