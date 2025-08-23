import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Candles15m } from '../entities/candles-15m.entity';
import { Candles30m } from '../entities/candles-30m.entity';
import { Candles1h } from '../entities/candles-1h.entity';
import { Candles4h } from '../entities/candles-4h.entity';
import { Candles1w } from '../entities/candles-1w.entity';
import { Candles1d } from '../entities/candles-1d.entity';

@Injectable()
export class CandleSeederService {
  constructor(
    @InjectRepository(Candles15m)
    private candles15mRepository: Repository<Candles15m>,
    @InjectRepository(Candles30m)
    private candles30mRepository: Repository<Candles30m>,
    @InjectRepository(Candles1h)
    private candles1hRepository: Repository<Candles1h>,
    @InjectRepository(Candles4h)
    private candles4hRepository: Repository<Candles4h>,
    @InjectRepository(Candles1w)
    private candles1wRepository: Repository<Candles1w>,
    @InjectRepository(Candles1d)
    private candles1dRepository: Repository<Candles1d>,
  ) {}

  async seedAllInstruments15mCandles() {
    // Fetch all instruments from the DB
    const instruments = await this.candles15mRepository.manager.getRepository('Instrument').find();
    if (!instruments || instruments.length === 0) {
      console.log('No instruments found in DB for 15m candle seeding.');
      return;
    }
    // For each instrument, fetch 15m candles for the last 75 days
    const now = new Date();
    const from = new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000); // 75 days ago
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')} 09:15`;
    const toStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 15:30`;
    for (const instrument of instruments) {
      const symbol = instrument.inputSymbol || instrument.name;
      const name = instrument.name;
      const exchange_token = instrument.token;
      const url = `https://smartconnect-r481.onrender.com/api/historical?symboltoken=${exchange_token}&exchangeType=1&interval=15m&from_date=${encodeURIComponent(fromStr)}&to_date=${encodeURIComponent(toStr)}`;
      await this.seedFromApi15m(url, symbol, name, exchange_token, `${symbol} last 75 days`);
      console.log(`--- ✅ Completed 15m candle fetch for instrument: ${symbol} (${exchange_token}) ---`);
    }
  }

  async seedAllInstruments30mCandles() {
    // Fetch all instruments from the DB
    const instruments = await this.candles30mRepository.manager.getRepository('Instrument').find();
    if (!instruments || instruments.length === 0) {
      console.log('No instruments found in DB for 30m candle seeding.');
      return;
    }
    // For each instrument, fetch 30m candles for the last 120 days
    const now = new Date();
    const from = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000); // 120 days ago
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')} 09:15`;
    const toStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 15:30`;
    for (const instrument of instruments) {
      const symbol = instrument.inputSymbol || instrument.name;
      const name = instrument.name;
      const exchange_token = instrument.token;
      const url = `https://smartconnect-r481.onrender.com/api/historical?symboltoken=${exchange_token}&exchangeType=1&interval=30m&from_date=${encodeURIComponent(fromStr)}&to_date=${encodeURIComponent(toStr)}`;
      await this.seedFromApi30m(url, symbol, name, exchange_token, `${symbol} last 120 days`);
      console.log(`--- ✅ Completed 30m candle fetch for instrument: ${symbol} (${exchange_token}) ---`);
    }
  }

  async seedAllInstruments1hCandles() {
    // Fetch all instruments from the DB
    const instruments = await this.candles1hRepository.manager.getRepository('Instrument').find();
    if (!instruments || instruments.length === 0) {
      console.log('No instruments found in DB for 1h candle seeding.');
      return;
    }
    // For each instrument, fetch 1h candles for the last 250 days
    const now = new Date();
    const from = new Date(now.getTime() - 250 * 24 * 60 * 60 * 1000); // 250 days ago
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')} 09:15`;
    const toStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 15:30`;
    for (const instrument of instruments) {
      const symbol = instrument.inputSymbol || instrument.name;
      const name = instrument.name;
      const exchange_token = instrument.token;
      const url = `https://smartconnect-r481.onrender.com/api/historical?symboltoken=${exchange_token}&exchangeType=1&interval=1h&from_date=${encodeURIComponent(fromStr)}&to_date=${encodeURIComponent(toStr)}`;
      await this.seedFromApi1h(url, symbol, name, exchange_token, `${symbol} last 250 days`);
      console.log(`--- ✅ Completed 1h candle fetch for instrument: ${symbol} (${exchange_token}) ---`);
    }
  }

  async seedAllInstruments4hCandles() {
    // Fetch all instruments from the DB
    const instruments = await this.candles4hRepository.manager.getRepository('Instrument').find();
    if (!instruments || instruments.length === 0) {
      console.log('No instruments found in DB for 4h candle seeding.');
      return;
    }
    // For each instrument, fetch 4h candles for the last 1.5 years (~547 days)
    const now = new Date();
    const from = new Date(now.getTime() - 547 * 24 * 60 * 60 * 1000); // 1.5 years ago
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')} 09:15`;
    const toStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 15:30`;
    for (const instrument of instruments) {
      const symbol = instrument.inputSymbol || instrument.name;
      const name = instrument.name;
      const exchange_token = instrument.token;
      const url = `https://smartconnect-r481.onrender.com/api/historical?symboltoken=${exchange_token}&exchangeType=1&interval=4h&from_date=${encodeURIComponent(fromStr)}&to_date=${encodeURIComponent(toStr)}`;
      await this.seedFromApi4h(url, symbol, name, exchange_token, `${symbol} last 1.5 years`);
      console.log(`--- ✅ Completed 4h candle fetch for instrument: ${symbol} (${exchange_token}) ---`);
    }
  }

  async seedAllInstruments1wCandles() {
    // Fetch all instruments from the DB
    const instruments = await this.candles1wRepository.manager.getRepository('Instrument').find();
    if (!instruments || instruments.length === 0) {
      console.log('No instruments found in DB for 1w candle seeding.');
      return;
    }
    // For each instrument, fetch 1w candles for the last 6 years (312 weeks) in two API calls: 5 years (260 weeks) + 1 year (52 weeks)
    const now = new Date();
    // First chunk: 5 years
    const from1 = new Date(now.getTime() - 312 * 7 * 24 * 60 * 60 * 1000); // 6 years ago
    const to1 = new Date(now.getTime() - 52 * 7 * 24 * 60 * 60 * 1000); // 1 year ago
    const fromStr1 = `${from1.getFullYear()}-${String(from1.getMonth() + 1).padStart(2, '0')}-${String(from1.getDate()).padStart(2, '0')} 09:15`;
    const toStr1 = `${to1.getFullYear()}-${String(to1.getMonth() + 1).padStart(2, '0')}-${String(to1.getDate()).padStart(2, '0')} 15:30`;
    // Second chunk: last 1 year
    const from2 = to1;
    const to2 = now;
    const fromStr2 = `${from2.getFullYear()}-${String(from2.getMonth() + 1).padStart(2, '0')}-${String(from2.getDate()).padStart(2, '0')} 09:15`;
    const toStr2 = `${to2.getFullYear()}-${String(to2.getMonth() + 1).padStart(2, '0')}-${String(to2.getDate()).padStart(2, '0')} 15:30`;
    for (const instrument of instruments) {
      const symbol = instrument.inputSymbol || instrument.name;
      const name = instrument.name;
      const exchange_token = instrument.token;
      // First 5 years
      const url1 = `https://smartconnect-r481.onrender.com/api/historical?symboltoken=${exchange_token}&exchangeType=1&interval=7d&from_date=${encodeURIComponent(fromStr1)}&to_date=${encodeURIComponent(toStr1)}`;
      await this.seedFromApi1w(url1, symbol, name, exchange_token, `${symbol} 5 years ago to 1 year ago`);
      // Last 1 year
      const url2 = `https://smartconnect-r481.onrender.com/api/historical?symboltoken=${exchange_token}&exchangeType=1&interval=7d&from_date=${encodeURIComponent(fromStr2)}&to_date=${encodeURIComponent(toStr2)}`;
      await this.seedFromApi1w(url2, symbol, name, exchange_token, `${symbol} last 1 year`);
      console.log(`--- ✅ Completed 1w candle fetch for instrument: ${symbol} (${exchange_token}) ---`);
    }
  }

  async seedAllInstruments1dCandles() {
    // Fetch all instruments from the DB
    const instruments = await this.candles1dRepository.manager.getRepository('Instrument').find();
    if (!instruments || instruments.length === 0) {
      console.log('No instruments found in DB for 1d candle seeding.');
      return;
    }
    // For each instrument, fetch 1d candles for the last 3 years (1095 days)
    const now = new Date();
    const from = new Date(now.getTime() - 1095 * 24 * 60 * 60 * 1000); // 3 years ago
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')} 09:15`;
    const toStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 15:30`;
    for (const instrument of instruments) {
      const symbol = instrument.inputSymbol || instrument.name;
      const name = instrument.name;
      const exchange_token = instrument.token;
      const url = `https://smartconnect-r481.onrender.com/api/historical?symboltoken=${exchange_token}&exchangeType=1&interval=1d&from_date=${encodeURIComponent(fromStr)}&to_date=${encodeURIComponent(toStr)}`;
      await this.seedFromApi1d(url, symbol, name, exchange_token, `${symbol} last 3 years`);
      console.log(`--- ✅ Completed 1d candle fetch for instrument: ${symbol} (${exchange_token}) ---`);
    }
  }

  private async seedFromApi15m(url: string, symbol: string, name: string, exchange_token: string, label: string) {
    try {
      const response = await axios.get(url);
      const candles = response.data.candles;
      if (!candles || !Array.isArray(candles)) {
        throw new Error('Invalid candles data from API');
      }
      // Fetch existing candle datetimes for this symbol and exchange_token
      const existing = await this.candles15mRepository.find({
        where: { symbol, exchange_token },
        select: ['date'],
      });
      const existingTimestamps = new Set(existing.map(e => e.date.getTime()));
      const newEntities = candles
        .filter((candle: any[]) => {
          const d = new Date(candle[0]);
          return !existingTimestamps.has(d.getTime());
        })
        .map((candle: any[]) => {
          return this.candles15mRepository.create({
            exchange_token,
            symbol,
            name,
            date: new Date(candle[0]),
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: candle[5],
          });
        });
      if (newEntities.length > 0) {
        await this.candles15mRepository.save(newEntities);
        console.log(`✅ Seeded ${newEntities.length} new candles_15m for ${label}`);
      } else {
        console.log(`ℹ️ No new candles to seed for ${label}`);
      }
    } catch (err) {
      console.error(`❌ Error seeding candles_15m for ${label}:`, err);
    }
  }

  private async seedFromApi30m(url: string, symbol: string, name: string, exchange_token: string, label: string) {
    try {
      const response = await axios.get(url);
      const candles = response.data.candles;
      if (!candles || !Array.isArray(candles)) {
        throw new Error('Invalid candles data from API');
      }
      // Fetch existing candle datetimes for this symbol and exchange_token
      const existing = await this.candles30mRepository.find({
        where: { symbol, exchange_token },
        select: ['date'],
      });
      const existingTimestamps = new Set(existing.map(e => e.date.getTime()));
      const newEntities = candles
        .filter((candle: any[]) => {
          const d = new Date(candle[0]);
          return !existingTimestamps.has(d.getTime());
        })
        .map((candle: any[]) => {
          return this.candles30mRepository.create({
            exchange_token,
            symbol,
            name,
            date: new Date(candle[0]),
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: candle[5],
          });
        });
      if (newEntities.length > 0) {
        await this.candles30mRepository.save(newEntities);
        console.log(`✅ Seeded ${newEntities.length} new candles_30m for ${label}`);
      } else {
        console.log(`ℹ️ No new candles to seed for ${label}`);
      }
    } catch (err) {
      console.error(`❌ Error seeding candles_30m for ${label}:`, err);
    }
  }

  private async seedFromApi1h(url: string, symbol: string, name: string, exchange_token: string, label: string) {
    try {
      const response = await axios.get(url);
      const candles = response.data.candles;
      if (!candles || !Array.isArray(candles)) {
        throw new Error('Invalid candles data from API');
      }
      // Fetch existing candle datetimes for this symbol and exchange_token
      const existing = await this.candles1hRepository.find({
        where: { symbol, exchange_token },
        select: ['date'],
      });
      const existingTimestamps = new Set(existing.map(e => e.date.getTime()));
      const newEntities = candles
        .filter((candle: any[]) => {
          const d = new Date(candle[0]);
          return !existingTimestamps.has(d.getTime());
        })
        .map((candle: any[]) => {
          return this.candles1hRepository.create({
            exchange_token,
            symbol,
            name,
            date: new Date(candle[0]),
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: candle[5],
          });
        });
      if (newEntities.length > 0) {
        await this.candles1hRepository.save(newEntities);
        console.log(`✅ Seeded ${newEntities.length} new candles_1h for ${label}`);
      } else {
        console.log(`ℹ️ No new candles to seed for ${label}`);
      }
    } catch (err) {
      console.error(`❌ Error seeding candles_1h for ${label}:`, err);
    }
  }

  private async seedFromApi4h(url: string, symbol: string, name: string, exchange_token: string, label: string) {
    try {
      const response = await axios.get(url);
      const candles = response.data.candles;
      if (!candles || !Array.isArray(candles)) {
        throw new Error('Invalid candles data from API');
      }
      // Fetch existing candle datetimes for this symbol and exchange_token
      const existing = await this.candles4hRepository.find({
        where: { symbol, exchange_token },
        select: ['date'],
      });
      const existingTimestamps = new Set(existing.map(e => e.date.getTime()));
      const newEntities = candles
        .filter((candle: any[]) => {
          const d = new Date(candle[0]);
          return !existingTimestamps.has(d.getTime());
        })
        .map((candle: any[]) => {
          return this.candles4hRepository.create({
            exchange_token,
            symbol,
            name,
            date: new Date(candle[0]),
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: candle[5],
          });
        });
      if (newEntities.length > 0) {
        await this.candles4hRepository.save(newEntities);
        console.log(`✅ Seeded ${newEntities.length} new candles_4h for ${label}`);
      } else {
        console.log(`ℹ️ No new candles to seed for ${label}`);
      }
    } catch (err) {
      console.error(`❌ Error seeding candles_4h for ${label}:`, err);
    }
  }

  private async seedFromApi1w(url: string, symbol: string, name: string, exchange_token: string, label: string) {
    try {
      const response = await axios.get(url);
      const candles = response.data.candles;
      if (!candles || !Array.isArray(candles)) {
        throw new Error('Invalid candles data from API');
      }
      // Fetch existing candle datetimes for this symbol and exchange_token
      const existing = await this.candles1wRepository.find({
        where: { symbol, exchange_token },
        select: ['date'],
      });
      const existingTimestamps = new Set(existing.map(e => e.date.getTime()));
      const newEntities = candles
        .filter((candle: any[]) => {
          const d = new Date(candle[0]);
          return !existingTimestamps.has(d.getTime());
        })
        .map((candle: any[]) => {
          return this.candles1wRepository.create({
            exchange_token,
            symbol,
            name,
            date: new Date(candle[0]),
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: candle[5],
          });
        });
      if (newEntities.length > 0) {
        await this.candles1wRepository.save(newEntities);
        console.log(`✅ Seeded ${newEntities.length} new candles_1w for ${label}`);
      } else {
        console.log(`ℹ️ No new candles to seed for ${label}`);
      }
    } catch (err) {
      console.error(`❌ Error seeding candles_1w for ${label}:`, err);
    }
  }

  private async seedFromApi1d(url: string, symbol: string, name: string, exchange_token: string, label: string) {
    try {
      const response = await axios.get(url);
      const candles = response.data.candles;
      if (!candles || !Array.isArray(candles)) {
        throw new Error('Invalid candles data from API');
      }
      // Fetch existing candle datetimes for this symbol and exchange_token
      const existing = await this.candles1dRepository.find({
        where: { symbol, exchange_token },
        select: ['date'],
      });
      const existingTimestamps = new Set(existing.map(e => e.date.getTime()));
      const newEntities = candles
        .filter((candle: any[]) => {
          const d = new Date(candle[0]);
          return !existingTimestamps.has(d.getTime());
        })
        .map((candle: any[]) => {
          return this.candles1dRepository.create({
            exchange_token,
            symbol,
            name,
            date: new Date(candle[0]),
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: candle[5],
          });
        });
      if (newEntities.length > 0) {
        await this.candles1dRepository.save(newEntities);
        console.log(`✅ Seeded ${newEntities.length} new candles_1d for ${label}`);
      } else {
        console.log(`ℹ️ No new candles to seed for ${label}`);
      }
    } catch (err) {
      console.error(`❌ Error seeding candles_1d for ${label}:`, err);
    }
  }
}
