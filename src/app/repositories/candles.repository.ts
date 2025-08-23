import { EntityRepository, Repository } from 'typeorm';
import { CandlesMonth } from '../entities/candles-month.entity';
import { Candles1w } from '../entities/candles-1w.entity';
import { Candles1d } from '../entities/candles-1d.entity';
import { Candles4h } from '../entities/candles-4h.entity';
import { Candles1h } from '../entities/candles-1h.entity';
import { Candles30m } from '../entities/candles-30m.entity';
import { Candles15m } from '../entities/candles-15m.entity';
import { Candles5m } from '../entities/candles-5m.entity';
import { Candles1m } from '../entities/candles-1m.entity';

@EntityRepository()
export class CandlesRepository {
  // Add custom repository methods for all intervals if needed
  // Example: findByInterval, findBySymbol, etc.
}
