import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstrumentController } from './controller/instrument.controller';
import { TimeIntervalController } from './controller/time-interval.controller';
import { HistoricalDataController } from './controller/historical-data.controller';
import { WebSocketController } from './controller/websocket.controller';
import { PythonWorkerController } from './controller/python-worker.controller';
import { CandleCacheController } from './controller/candle-cache.controller';
import { InMemoryCandleController } from './controller/in-memory-candle.controller';
import { InstrumentService } from './services/instrument.service';
import { TimeIntervalService } from './services/time-interval.service';
import {WebSocketService} from './services/websocket.service';
import { PythonWorkerSeederService } from './services/python-worker-seeder.service';
import { DatabaseSeederService } from './services/database-seeder.service';
import { InstrumentRepository } from './repositories/instrument.repository';
import { configurationDatabase } from '../config/database.typeorm';
import { Server } from './entities/server.entity';
import { WebSocket } from './entities/websocket.entity';
import { Instrument } from './entities/instrument.entity';
import { TimeIntervalEntity } from './entities/market-data-interval.entity';
import { CandleSeederService } from './services/candle-seeder.service';
import { CandlesMonth } from './entities/candles-month.entity';
import { CandlesService } from './services/candles-month.service';
import { Candles1w } from './entities/candles-1w.entity';
import { Candles1d } from './entities/candles-1d.entity';
import { Candles4h } from './entities/candles-4h.entity';
import { Candles1h } from './entities/candles-1h.entity';
import { Candles30m } from './entities/candles-30m.entity';
import { Candles15m } from './entities/candles-15m.entity';
import { Candles5m } from './entities/candles-5m.entity';
import { Candles1m } from './entities/candles-1m.entity';
import { Candles3m } from './entities/candles-3m.entity';
import { Candles10m } from './entities/candles-10m.entity';
import { Candles2h } from './entities/candles-2h.entity';
import { InMemoryCandleService } from './services/in-memory-candle.service';
import { TemporaryCandle } from './entities/temporary-candle.entity';
import { TemporaryCandleController } from './controller/temporary-candle.controller';
import { TemporaryCandleService } from './services/temporary-candle.service';
import { IntervalSeederService } from './services/interval-seeder.service';
import { TimezoneUtilService } from './services/timezone-util.service';
import { CandleSeederController } from './controller/candle-seeder.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync(configurationDatabase),
    TypeOrmModule.forFeature([
      Server, WebSocket, Instrument, TimeIntervalEntity,
      // Candle entities for all intervals: 1m, 3m, 5m, 10m, 15m, 30m, 1h, 2h, 4h, 1d, 7d(1w), 1M(month)
      Candles1m, Candles3m, Candles5m, Candles10m, Candles15m, Candles30m, 
      Candles1h, Candles2h, Candles4h, Candles1d, Candles1w, CandlesMonth,
      TemporaryCandle  // Still needed for TemporaryCandleService (mock data generation)
    ]),
  ],
  controllers: [InstrumentController, TimeIntervalController, HistoricalDataController, WebSocketController, PythonWorkerController, CandleCacheController, InMemoryCandleController, TemporaryCandleController, CandleSeederController],
  providers: [InstrumentService, TimeIntervalService, WebSocketService, PythonWorkerSeederService, DatabaseSeederService, InstrumentRepository, CandleSeederService, CandlesService, InMemoryCandleService, TemporaryCandleService, IntervalSeederService, TimezoneUtilService],
  exports: [CandlesService],
})
export class AppModule {}
