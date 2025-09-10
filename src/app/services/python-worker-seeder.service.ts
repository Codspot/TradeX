import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebSocket } from '../entities/websocket.entity';
import { Server } from '../entities/server.entity';
import { Instrument } from '../entities/instrument.entity';
import axios from 'axios';

interface ServerCredentials {
  api_key: string;
  client_code: string;
  password: string;
  totp_secret: string;
}

interface PythonWorkerPayload {
  websocket_uuid: string;
  server_credentials: ServerCredentials;
  tokens: string[];
  backend_url: string;
}

@Injectable()
export class PythonWorkerSeederService implements OnModuleInit {
  private readonly logger = new Logger(PythonWorkerSeederService.name);
  private readonly pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:5001';
  private readonly backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

  constructor(
    @InjectRepository(WebSocket)
    private websocketRepository: Repository<WebSocket>,
    @InjectRepository(Server)
    private serverRepository: Repository<Server>,
    @InjectRepository(Instrument)
    private instrumentRepository: Repository<Instrument>,
  ) {}

  /**
   * This method runs automatically when the module initializes
   */
  async onModuleInit() {
    // Add a small delay to ensure database connections are ready
    setTimeout(async () => {
      try {
        this.logger.log('🤖 Auto-starting Python worker connections...');
        await this.connectAllWebSocketsToPythonWorker();
      } catch (error) {
        this.logger.error('❌ Failed to auto-start Python worker connections:', error.message);
        this.logger.log('💡 You can manually trigger connections using: POST /api/python-worker/connect-all');
      }
    }, 5000); // 5 second delay
  }

  /**
   * Main method to connect all websockets to Python worker
   */
  async connectAllWebSocketsToPythonWorker(): Promise<void> {
    try {
      this.logger.log('🚀 Starting Python worker connection seeder...');
      
      // Get all active websockets
      const websockets = await this.websocketRepository.find({
        where: { isActive: true }
      });

      if (websockets.length === 0) {
        this.logger.log('ℹ️ No active websockets found');
        return;
      }

      this.logger.log(`📡 Found ${websockets.length} active websockets to connect`);

      // Process each websocket
      for (const websocket of websockets) {
        await this.connectWebSocketToPythonWorker(websocket);
        
        // Add small delay between connections to avoid overwhelming the Python worker
        await this.delay(1000);
      }

      this.logger.log('✅ Python worker connection seeder completed successfully');
    } catch (error) {
      this.logger.error('❌ Error in Python worker connection seeder:', error.stack);
      throw error;
    }
  }

  /**
   * Connect a single websocket to Python worker
   */
  async connectWebSocketToPythonWorker(websocket: WebSocket): Promise<void> {
    try {
      this.logger.log(`🔗 Connecting websocket: ${websocket.websocketName} (${websocket.uuid})`);

      // Get server credentials
      const server = await this.serverRepository.findOne({
        where: { uuid: websocket.serverUuid }
      });

      if (!server) {
        this.logger.error(`❌ Server not found for websocket: ${websocket.uuid}`);
        return;
      }

      // Get instruments (tokens) for this websocket
      const instruments = await this.instrumentRepository.find({
        where: { websocketUuid: websocket.uuid }
      });

      if (instruments.length === 0) {
        this.logger.warn(`⚠️ No instruments found for websocket: ${websocket.uuid}`);
        return;
      }

      // Extract tokens (use symboltoken if available, otherwise use token)
      const tokens = instruments.map(instrument => 
        instrument.symboltoken || instrument.token
      ).filter(Boolean);

      this.logger.log(`📊 Found ${tokens.length} tokens for websocket ${websocket.websocketName}`);

      // Prepare payload for Python worker
      const payload: PythonWorkerPayload = {
        websocket_uuid: websocket.uuid,
        server_credentials: {
          api_key: server.apiKey,
          client_code: server.clientCode,
          password: server.password,
          totp_secret: server.totpSecret,
        },
        tokens: tokens,
        backend_url: this.backendUrl,
      };

      // Call Python worker Flask API
      await this.callPythonWorkerConnect(payload);

      // Update websocket status
      await this.updateWebSocketStatus(websocket.uuid, 'connecting');

      this.logger.log(`✅ Successfully initiated connection for websocket: ${websocket.websocketName}`);
    } catch (error) {
      this.logger.error(`❌ Error connecting websocket ${websocket.uuid}:`, error.stack);
      await this.updateWebSocketStatus(websocket.uuid, 'error');
      throw error;
    }
  }

  /**
   * Call Python worker Flask API connect endpoint
   */
  private async callPythonWorkerConnect(payload: PythonWorkerPayload): Promise<void> {
    try {
      const connectUrl = `${this.pythonWorkerUrl}/api/connect`;
      
      this.logger.log(`🐍 Calling Python worker: ${connectUrl}`);
      this.logger.debug(`📤 Payload: ${JSON.stringify(payload, null, 2)}`);

      const response = await axios.post(connectUrl, payload, {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`📥 Python worker response: ${response.status} - ${JSON.stringify(response.data)}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`❌ Python worker API error: ${error.response?.status} - ${error.response?.data || error.message}`);
      } else {
        this.logger.error(`❌ Error calling Python worker:`, error);
      }
      throw error;
    }
  }

  /**
   * Update websocket connection status
   */
  private async updateWebSocketStatus(
    websocketUuid: string,
    status: 'connected' | 'disconnected' | 'connecting' | 'error'
  ): Promise<void> {
    await this.websocketRepository.update(
      { uuid: websocketUuid },
      { 
        connectionStatus: status,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Connect specific websocket by UUID
   */
  async connectSpecificWebSocket(websocketUuid: string): Promise<void> {
    try {
      this.logger.log(`🎯 Connecting specific websocket: ${websocketUuid}`);

      const websocket = await this.websocketRepository.findOne({
        where: { uuid: websocketUuid, isActive: true }
      });

      if (!websocket) {
        throw new Error(`Active websocket with UUID ${websocketUuid} not found`);
      }

      await this.connectWebSocketToPythonWorker(websocket);
    } catch (error) {
      this.logger.error(`❌ Error connecting specific websocket ${websocketUuid}:`, error.stack);
      throw error;
    }
  }

  /**
   * Get connection status of all websockets
   */
  async getWebSocketConnectionStatus(): Promise<any[]> {
    const websockets = await this.websocketRepository.find({
      select: ['uuid', 'websocketName', 'connectionStatus', 'currentStocks', 'maxStocks', 'updatedAt']
    });

    return websockets.map(ws => ({
      uuid: ws.uuid,
      name: ws.websocketName,
      status: ws.connectionStatus,
      stocks: `${ws.currentStocks}/${ws.maxStocks}`,
      lastUpdated: ws.updatedAt,
    }));
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
