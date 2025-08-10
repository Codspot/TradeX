import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from '../entities/server.entity';
import { WebSocket } from '../entities/websocket.entity';
import { Instrument } from '../entities/instrument.entity';
import { IMPORTANT_STOCKS } from '../../config/important-stocks';

@Injectable()
export class DatabaseSeederService implements OnModuleInit {
  constructor(
    @InjectRepository(Server)
    private serverRepository: Repository<Server>,
    @InjectRepository(WebSocket)
    private websocketRepository: Repository<WebSocket>,
    @InjectRepository(Instrument)
    private instrumentRepository: Repository<Instrument>,
  ) {}

  async onModuleInit() {
    await this.seedServers();
    await this.seedWebSockets();
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

    console.log('🔄 Starting instrument seeding...');
    
    // Get first 150 stocks from important stocks list
    const stocksToSeed = IMPORTANT_STOCKS.slice(0, 150);
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
          exchangeToken: stock.exchangeToken || stock.instrumentToken, // Use exchangeToken if available, otherwise fallback to instrumentToken
          tradingSymbol: stock.symbol,
          name: stock.symbol,
          exchange: stock.exchange,
          instrumentType: stock.type as 'EQ' | 'FUT' | 'CE' | 'PE' | 'INDEX',
          segment: stock.segment,
          tickSize: 0.05,
          lotSize: 1,
          isActive: true,
        };

        const instrument = this.instrumentRepository.create(instrumentData);
        await this.instrumentRepository.save(instrument);
        successCount++;
        
        if (successCount % 10 === 0) {
          console.log(`✅ Seeded ${successCount}/150 instruments (Skipped: ${skipCount})`);
        }
      } catch (error) {
        console.error(`❌ Error seeding instrument ${stock.symbol}:`, error.message);
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
        
        console.log(`✅ Updated ${websockets[i].websocketName} with ${stockCount} stocks`);
      }
    } catch (error) {
      console.error('❌ Error updating websocket counts:', error.message);
    }
    
    console.log(`🎉 Instrument seeding completed! Success: ${successCount}, Skipped: ${skipCount}`);
  }
}
