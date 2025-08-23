import { EntityRepository, Repository } from 'typeorm';
import { CandlesMonth } from '../../entities/candles-month.entity';

@EntityRepository(CandlesMonth)
export class CandlesMonthRepository extends Repository<CandlesMonth> {
  async findBySymbolAndInterval(symbol: string, exchange_token: string, from: Date, to: Date) {
    return this.createQueryBuilder('candle')
      .where('candle.symbol = :symbol', { symbol })
      .andWhere('candle.exchange_token = :exchange_token', { exchange_token })
      .andWhere('candle.date >= :from', { from })
      .andWhere('candle.date <= :to', { to })
      .orderBy('candle.date', 'ASC')
      .getMany();
  }
}
