import * as dotenv from 'dotenv';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Server } from 'src/app/entities/server.entity';
import { WebSocket } from 'src/app/entities/websocket.entity';
import { Instrument } from 'src/app/entities/instrument.entity';
import { TimeIntervalEntity } from 'src/app/entities/market-data-interval.entity';

dotenv.config({ path: '.env' });

export const configurationDatabase: TypeOrmModuleAsyncOptions = {
  useFactory: async (config: ConfigService) => ({
    type: 'postgres',
    host: config.get('DB_HOST'),
    port: parseInt(config.get('DB_PORT')),
    username: config.get('DB_USER'),
    password: config.get('DB_PASSWORD'),
    database: config.get('DB_NAME'),
    entities: [Server, WebSocket, Instrument, TimeIntervalEntity],
    synchronize: true, // Enable synchronization during development
  }),
  inject: [ConfigService],
};
