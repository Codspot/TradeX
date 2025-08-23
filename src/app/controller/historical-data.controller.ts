import { Controller, Get, Query } from '@nestjs/common';
import { CandlesService } from '../services/candles-month.service';

@Controller('historical')
export class HistoricalDataController {
  constructor(private readonly candlesService: CandlesService) {}

  @Get()
  async getHistoricalData(
    @Query('exchange_token') exchange_token: string,
    @Query('interval') interval: string,
    @Query('from') from: string,
    @Query('to') to: string
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    switch (interval) {
      case '1M':
      case '1mon':
      case 'month':
        return this.candlesService.getMonthlyCandles(exchange_token, fromDate, toDate);
      case '1w':
      case 'week':
        return this.candlesService.getWeeklyCandles(exchange_token, fromDate, toDate);
      case '1d':
      case 'day':
        return this.candlesService.getDailyCandles(exchange_token, fromDate, toDate);
      case '4h':
        return this.candlesService.get4hCandles(exchange_token, fromDate, toDate);
      case '1h':
        return this.candlesService.get1hCandles(exchange_token, fromDate, toDate);
      case '30m':
        return this.candlesService.get30mCandles(exchange_token, fromDate, toDate);
      case '15m':
        return this.candlesService.get15mCandles(exchange_token, fromDate, toDate);
      case '5m':
        return this.candlesService.get5mCandles(exchange_token, fromDate, toDate);
      case '1m':
        return this.candlesService.get1mCandles(exchange_token, fromDate, toDate);
      default:
        return { error: 'Unsupported interval. Supported: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M/month.' };
    }
  }
}
