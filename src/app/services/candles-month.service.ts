import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CandlesMonth } from '../entities/candles-month.entity';
import { Candles1w } from '../entities/candles-1w.entity';
import { Candles1d } from '../entities/candles-1d.entity';
import { Candles4h } from '../entities/candles-4h.entity';
import { Candles2h } from '../entities/candles-2h.entity';
import { Candles1h } from '../entities/candles-1h.entity';
import { Candles30m } from '../entities/candles-30m.entity';
import { Candles15m } from '../entities/candles-15m.entity';
import { Candles10m } from '../entities/candles-10m.entity';
import { Candles5m } from '../entities/candles-5m.entity';
import { Candles3m } from '../entities/candles-3m.entity';
import { Candles1m } from '../entities/candles-1m.entity';

@Injectable()
export class CandlesService {
  constructor(
    @InjectRepository(CandlesMonth)
    private readonly candlesMonthRepository: Repository<CandlesMonth>,
    @InjectRepository(Candles1w)
    private readonly candles1wRepository: Repository<Candles1w>,
    @InjectRepository(Candles1d)
    private readonly candles1dRepository: Repository<Candles1d>,
    @InjectRepository(Candles4h)
    private readonly candles4hRepository: Repository<Candles4h>,
    @InjectRepository(Candles2h)
    private readonly candles2hRepository: Repository<Candles2h>,
    @InjectRepository(Candles1h)
    private readonly candles1hRepository: Repository<Candles1h>,
    @InjectRepository(Candles30m)
    private readonly candles30mRepository: Repository<Candles30m>,
    @InjectRepository(Candles15m)
    private readonly candles15mRepository: Repository<Candles15m>,
    @InjectRepository(Candles10m)
    private readonly candles10mRepository: Repository<Candles10m>,
    @InjectRepository(Candles5m)
    private readonly candles5mRepository: Repository<Candles5m>,
    @InjectRepository(Candles3m)
    private readonly candles3mRepository: Repository<Candles3m>,
    @InjectRepository(Candles1m)
    private readonly candles1mRepository: Repository<Candles1m>,
  ) {}

  async getMonthlyCandles(exchange_token: string, from: Date, to: Date) {
    return this.candlesMonthRepository.find({
      where: { exchange_token, date: Between(from, to) },
      order: { date: 'DESC' },
    });
  }

  async getWeeklyCandles(exchange_token: string, from: Date, to: Date) {
    return this.candles1wRepository.find({
      where: { exchange_token, date: Between(from, to) },
      order: { date: 'DESC' },
    });
  }

  async getDailyCandles(exchange_token: string, from: Date, to: Date) {
    return this.candles1dRepository.find({
      where: { exchange_token, date: Between(from, to) },
      order: { date: 'DESC' },
    });
  }

  async get4hCandles(exchange_token: string, from: Date, to: Date) {
    return this.candles4hRepository.find({
      where: { exchange_token, date: Between(from, to) },
      order: { date: 'DESC' },
    });
  }

  async get1hCandles(exchange_token: string, from: Date, to: Date) {
    return this.candles1hRepository.find({
      where: { exchange_token, date: Between(from, to) },
      order: { date: 'DESC' },
    });
  }

  async get30mCandles(exchange_token: string, from: Date, to: Date) {
    return this.candles30mRepository.find({
      where: { exchange_token, date: Between(from, to) },
      order: { date: 'DESC' },
    });
  }

  async get15mCandles(exchange_token: string, from: Date, to: Date) {
    return this.candles15mRepository.find({
      where: { exchange_token, date: Between(from, to) },
      order: { date: 'DESC' },
    });
  }

  async get5mCandles(exchange_token: string, from: Date, to: Date) {
    return this.candles5mRepository.find({
      where: { exchange_token, date: Between(from, to) },
      order: { date: 'DESC' },
    });
  }

  async get1mCandles(exchange_token: string, from: Date, to: Date) {
    return this.candles1mRepository.find({
      where: { exchange_token, date: Between(from, to) },
      order: { date: 'DESC' },
    });
  }

  async get2hCandles(exchange_token: string, from: Date, to: Date) {
    return this.candles2hRepository.find({
      where: { exchange_token, date: Between(from, to) },
      order: { date: 'DESC' },
    });
  }

  async get3mCandles(exchange_token: string, from: Date, to: Date) {
    return this.candles3mRepository.find({
      where: { exchange_token, date: Between(from, to) },
      order: { date: 'DESC' },
    });
  }

  async get10mCandles(exchange_token: string, from: Date, to: Date) {
    return this.candles10mRepository.find({
      where: { exchange_token, date: Between(from, to) },
      order: { date: 'DESC' },
    });
  }
}
