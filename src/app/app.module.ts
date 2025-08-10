import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstrumentController } from './controller/instrument.controller';
import { InstrumentService } from './services/instrument.service';
import { DatabaseSeederService } from './services/database-seeder.service';
import { InstrumentRepository } from './repositories/instrument.repository';
import { configurationDatabase } from '../config/database.typeorm';
import { Server } from './entities/server.entity';
import { WebSocket } from './entities/websocket.entity';
import { Instrument } from './entities/instrument.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync(configurationDatabase),
    TypeOrmModule.forFeature([Server, WebSocket, Instrument]),
  ],
  controllers: [InstrumentController],
  providers: [InstrumentService, DatabaseSeederService, InstrumentRepository],
})
export class AppModule {}
