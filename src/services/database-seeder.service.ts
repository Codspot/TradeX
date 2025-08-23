import { DataSource } from 'typeorm';
import axios from 'axios';
import { CandlesMonth } from '../app/entities/candles-month.entity';

export async function seedCandlesMonth(dataSource: DataSource) {
  const repo = dataSource.getRepository(CandlesMonth);
  const symbol = 'RELIANCE';
  const name = 'Reliance Industries Limited';
  const exchange_token = '2885';
  const url = 'https://smartconnect-r481.onrender.com/api/historical?symboltoken=2885&exchangeType=1&interval=1mon&from_date=2013-08-01%2009%3A15&to_date=2018-08-01%2009%3A28';

  try {
    const response = await axios.get(url);
    const candles = response.data.candles;
    if (!candles || !Array.isArray(candles)) {
      throw new Error('Invalid candles data from API');
    }
    const entities = candles.map((candle: any[]) => {
      return repo.create({
        exchange_token,
        date: new Date(candle[0]),
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
      });
    });
    await repo.save(entities);
    console.log('Seeded candles_month for RELIANCE (2013-08 to 2018-08)');
  } catch (err) {
    console.error('Error seeding candles_month:', err);
  }
}
