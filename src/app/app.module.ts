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
import { Candles7d } from './entities/candles-7d.entity';
import { InMemoryCandleService } from './services/in-memory-candle.service';
import { TemporaryCandle } from './entities/temporary-candle.entity';
import { TemporaryCandleController } from './controller/temporary-candle.controller';
import { TemporaryCandleService } from './services/temporary-candle.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync(configurationDatabase),
    TypeOrmModule.forFeature([
      Server, WebSocket, Instrument, TimeIntervalEntity,
      CandlesMonth, Candles1w, Candles1d, Candles7d, Candles4h, Candles2h, Candles1h, Candles30m, Candles15m, Candles10m, Candles5m, Candles3m, Candles1m,
      TemporaryCandle
    ]),
  ],
  controllers: [InstrumentController, TimeIntervalController, HistoricalDataController, WebSocketController, PythonWorkerController, CandleCacheController, InMemoryCandleController, TemporaryCandleController],
  providers: [InstrumentService, TimeIntervalService, WebSocketService, PythonWorkerSeederService, DatabaseSeederService, InstrumentRepository, CandleSeederService, CandlesService, InMemoryCandleService, TemporaryCandleService],
  exports: [CandlesService],
})
export class AppModule {}
