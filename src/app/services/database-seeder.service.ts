import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from '../entities/server.entity';
import { WebSocket } from '../entities/websocket.entity';
import { Instrument } from '../entities/instrument.entity';
import { TimeIntervalEntity, TimeInterval } from '../entities/market-data-interval.entity';
import { IMPORTANT_STOCKS, IStockData } from '../../config/important-stocks-enhanced';

@Injectable()
export class DatabaseSeederService implements OnModuleInit {
  constructor(
    @InjectRepository(Server)
    private serverRepository: Repository<Server>,
    @InjectRepository(WebSocket)
    private websocketRepository: Repository<WebSocket>,
    @InjectRepository(Instrument)
    private instrumentRepository: Repository<Instrument>,
    @InjectRepository(TimeIntervalEntity)
    private timeIntervalRepository: Repository<TimeIntervalEntity>,
  ) {}

  async onModuleInit() {
    await this.seedServers();
    await this.seedWebSockets();
    await this.seedTimeIntervals();
    await this.seedInstruments();
  }

  async seedServers() {
    // Check if server already exists
    const existingServer = await this.serverRepository.findOne({
      where: { clientCode: 'AAAN817633' }
    });

    if (!existingServer) {
      const serverData = {
        serverName: 'Alpha',
        apiKey: 'l2zpj8P0',
        secretKey: '17bdb97e-b570-4183-8c3d-080d55906df5',
        clientCode: 'AAAN817633',
        totpSecret: 'ARAFNN3V35GN7YLUSUJ7MHFSXE',
        password: '4656',
        environment: 'development' as const,
        serverStatus: 'active' as const,
      };

      const server = this.serverRepository.create(serverData);
      await this.serverRepository.save(server);
      console.log('✅ Server seeded successfully with client code:', serverData.clientCode);
    } else {
      console.log('✅ Server already exists with client code:', existingServer.clientCode);
    }
  }

  async seedWebSockets() {
    const serverUuid = 'a16b9201-b4fe-448b-b100-9c834f4474fc';
    
    // Check if websockets already exist for this server
    const existingWebSockets = await this.websocketRepository.find({
      where: { serverUuid }
    });

    if (existingWebSockets.length === 0) {
      // Create 3 websockets for the server
      const websocketData = [
        {
          serverUuid: serverUuid,
          websocketName: 'WebSocket-1',
          maxStocks: 50,
          currentStocks: 0,
          connectionStatus: 'disconnected' as const,
          isActive: true,
        },
        {
          serverUuid: serverUuid,
          websocketName: 'WebSocket-2',
          maxStocks: 50,
          currentStocks: 0,
          connectionStatus: 'disconnected' as const,
          isActive: true,
        },
        {
          serverUuid: serverUuid,
          websocketName: 'WebSocket-3',
          maxStocks: 50,
          currentStocks: 0,
          connectionStatus: 'disconnected' as const,
          isActive: true,
        }
      ];

      for (const wsData of websocketData) {
        const websocket = this.websocketRepository.create(wsData);
        await this.websocketRepository.save(websocket);
        console.log(`✅ WebSocket seeded successfully: ${wsData.websocketName} for server: ${serverUuid}`);
      }
    } else {
      console.log(`✅ WebSockets already exist for server: ${serverUuid} (Count: ${existingWebSockets.length})`);
    }
  }

  async seedTimeIntervals() {
    // Check if time intervals already exist
    const existingIntervals = await this.timeIntervalRepository.find();

    if (existingIntervals.length > 0) {
      console.log(`✅ Time intervals already exist (Count: ${existingIntervals.length})`);
      return;
    }

    console.log('🔄 Starting time intervals seeding...');

    const intervalData = [
      {
        interval: TimeInterval.ONE_MINUTE,
        name: '1 Minute',
        description: 'One minute timeframe for high-frequency trading',
        durationMinutes: 1,
        sortOrder: 1,
        isActive: true,
      },
      {
        interval: TimeInterval.FIVE_MINUTES,
        name: '5 Minutes',
        description: 'Five minute timeframe for short-term analysis',
        durationMinutes: 5,
        sortOrder: 2,
        isActive: true,
      },
      {
        interval: TimeInterval.FIFTEEN_MINUTES,
        name: '15 Minutes',
        description: 'Fifteen minute timeframe for intraday trading',
        durationMinutes: 15,
        sortOrder: 3,
        isActive: true,
      },
      {
        interval: TimeInterval.THIRTY_MINUTES,
        name: '30 Minutes',
        description: 'Thirty minute timeframe for intraday analysis',
        durationMinutes: 30,
        sortOrder: 4,
        isActive: true,
      },
      {
        interval: TimeInterval.ONE_HOUR,
        name: '1 Hour',
        description: 'One hour timeframe for swing trading',
        durationMinutes: 60,
        sortOrder: 5,
        isActive: true,
      },
      {
        interval: TimeInterval.FOUR_HOURS,
        name: '4 Hours',
        description: 'Four hour timeframe for medium-term analysis',
        durationMinutes: 240,
        sortOrder: 6,
        isActive: true,
      },
      {
        interval: TimeInterval.ONE_DAY,
        name: '1 Day',
        description: 'Daily timeframe for long-term analysis',
        durationMinutes: 1440,
        sortOrder: 7,
        isActive: true,
      },
      {
        interval: TimeInterval.ONE_WEEK,
        name: '1 Week',
        description: 'Weekly timeframe for long-term trends',
        durationMinutes: 10080,
        sortOrder: 8,
        isActive: true,
      },
      {
        interval: TimeInterval.ONE_MONTH,
        name: '1 Month',
        description: 'Monthly timeframe for very long-term analysis',
        durationMinutes: 43200,
        sortOrder: 9,
        isActive: true,
      },
    ];

    let successCount = 0;
    for (const data of intervalData) {
      try {
        const timeInterval = this.timeIntervalRepository.create(data);
        await this.timeIntervalRepository.save(timeInterval);
        console.log(`✅ Time interval seeded: ${data.name} (${data.interval})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to seed time interval ${data.name}:`, error.message);
      }
    }

    console.log(`🎉 Time intervals seeding completed! Success: ${successCount}/${intervalData.length}`);
  }

  async seedInstruments() {
    const serverUuid = 'a16b9201-b4fe-448b-b100-9c834f4474fc';
    
    // Get all websockets for this server
    const websockets = await this.websocketRepository.find({
      where: { serverUuid },
      order: { websocketName: 'ASC' }
    });

    if (websockets.length !== 3) {
      console.log('❌ Expected 3 websockets, found:', websockets.length);
      return;
    }

    // Check if instruments already exist
    const existingInstruments = await this.instrumentRepository.find({
      where: { serverUuid }
    });

    if (existingInstruments.length >= 150) {
      console.log(`✅ Instruments already exist for server: ${serverUuid} (Count: ${existingInstruments.length})`);
      return;
    }

    console.log('🔄 Starting enhanced instrument seeding with trader-friendly data...');
    
    // Use all 150 stocks from enhanced list
    const stocksToSeed: IStockData[] = IMPORTANT_STOCKS;
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < stocksToSeed.length; i++) {
      const stock = stocksToSeed[i];
      
      try {
        // Check if instrument already exists
        const existingInstrument = await this.instrumentRepository.findOne({
          where: { instrumentToken: stock.instrumentToken }
        });

        if (existingInstrument) {
          skipCount++;
          continue;
        }
        
        // Determine which websocket this stock belongs to (50 each)
        const websocketIndex = Math.floor(i / 50);
        const websocket = websockets[websocketIndex];
        
        const instrumentData = {
          serverUuid: serverUuid,
          websocketUuid: websocket.uuid,
          instrumentToken: stock.instrumentToken,
          exchangeToken: stock.exchangeToken || stock.instrumentToken,
          tradingSymbol: stock.symbol,
          name: stock.name || stock.symbol, // Use enhanced name if available
          exchange: stock.exchange,
          instrumentType: stock.type as 'EQ' | 'FUT' | 'CE' | 'PE' | 'INDEX',
          segment: stock.segment,
          tickSize: stock.tickSize || 0.05, // Use enhanced tick size
          lotSize: stock.lotSize || 1, // Use enhanced lot size
          isActive: stock.isActive !== false, // Default to true unless explicitly false
          // Additional enhanced fields
          sector: stock.sector || 'UNKNOWN',
          avgVolume: stock.avgVolume || 0,
          marketCap: stock.marketCap || 0,
          priority: stock.priority || (i + 1),
        };

        const instrument = this.instrumentRepository.create(instrumentData);
        await this.instrumentRepository.save(instrument);
        successCount++;
        
        if (successCount % 10 === 0) {
          console.log(`✅ Seeded ${successCount}/150 enhanced instruments (Skipped: ${skipCount})`);
        }
      } catch (error) {
        console.error(`❌ Error seeding enhanced instrument ${stock.symbol}:`, error.message);
        skipCount++;
      }
    }

    // Update websocket current stock counts
    try {
      for (let i = 0; i < websockets.length; i++) {
        const startIndex = i * 50;
        const endIndex = Math.min(startIndex + 50, stocksToSeed.length);
        const stockCount = Math.min(50, endIndex - startIndex);
        
        await this.websocketRepository.update(websockets[i].uuid, {
          currentStocks: stockCount
        });
        
        console.log(`✅ Updated ${websockets[i].websocketName} with ${stockCount} enhanced stocks`);
      }
    } catch (error) {
      console.error('❌ Error updating websocket counts:', error.message);
    }
    
    console.log(`🎉 Enhanced instrument seeding completed! Success: ${successCount}, Skipped: ${skipCount}`);
    console.log(`📊 Seeded stocks with comprehensive trader data including sectors, volumes, and market caps`);
  }
}
