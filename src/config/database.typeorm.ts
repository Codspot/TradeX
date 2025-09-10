import * as dotenv from 'dotenv';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Server } from 'src/app/entities/server.entity';
import { WebSocket } from 'src/app/entities/websocket.entity';
import { Instrument } from 'src/app/entities/instrument.entity';
import { TimeIntervalEntity } from 'src/app/entities/market-data-interval.entity';
import { CandlesMonth } from 'src/app/entities/candles-month.entity';
import { Candles1w } from 'src/app/entities/candles-1w.entity';
import { Candles1d } from 'src/app/entities/candles-1d.entity';
import { Candles7d } from 'src/app/entities/candles-7d.entity';
import { Candles4h } from 'src/app/entities/candles-4h.entity';
import { Candles2h } from 'src/app/entities/candles-2h.entity';
import { Candles1h } from 'src/app/entities/candles-1h.entity';
import { Candles30m } from 'src/app/entities/candles-30m.entity';
import { Candles15m } from 'src/app/entities/candles-15m.entity';
import { Candles10m } from 'src/app/entities/candles-10m.entity';
import { Candles5m } from 'src/app/entities/candles-5m.entity';
import { Candles3m } from 'src/app/entities/candles-3m.entity';
import { Candles1m } from 'src/app/entities/candles-1m.entity';
import { TemporaryCandle } from 'src/app/entities/temporary-candle.entity';

dotenv.config({ path: '.env' });

export const configurationDatabase: TypeOrmModuleAsyncOptions = {
  useFactory: async (config: ConfigService) => ({
    type: 'postgres',
    host: config.get('DB_HOST'),
    port: parseInt(config.get('DB_PORT')),
    username: config.get('DB_USER'),
    password: config.get('DB_PASSWORD'),
    database: config.get('DB_NAME'),
    entities: [
      Server, 
      WebSocket, 
      Instrument, 
      TimeIntervalEntity, 
      Candles1m,
      Candles3m,
      Candles5m,
      Candles10m,
      Candles15m,
      Candles30m,
      Candles1h,
      Candles2h,
      Candles4h,
      Candles1d,
      Candles7d,
      Candles1w,
      CandlesMonth,
      TemporaryCandle
    ],
    synchronize: true, // Enable synchronization during development
  }),
  inject: [ConfigService],
};
