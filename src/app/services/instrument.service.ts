import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InstrumentRepository } from '../repositories/instrument.repository';
import { GetInstrumentsQueryDto } from '../core/dtos/requests/get-instruments.dto';
import { 
  InstrumentResponseDto, 
  PaginatedInstrumentsResponseDto, 
  InstrumentStatsResponseDto 
} from '../core/dtos/responses/instrument.response.dto';
import { Instrument } from '../entities/instrument.entity';
import { UpdateInstrumentDto } from '../core/dtos/requests/update-instrument.dto';

@Injectable()
export class InstrumentService {
  private readonly logger = new Logger(InstrumentService.name);

  constructor(
    private readonly instrumentRepository: InstrumentRepository,
  ) {}

  /**
   * Get paginated list of instruments with filters
   */
  async getInstruments(queryDto: GetInstrumentsQueryDto): Promise<PaginatedInstrumentsResponseDto> {
    try {
      this.logger.log('Fetching instruments with filters', queryDto);
      
      const result = await this.instrumentRepository.findAllWithPagination(queryDto);
      
      return {
        data: result.data.map(this.mapToResponseDto),
        meta: result.meta,
      };
    } catch (error) {
      this.logger.error('Error fetching instruments', error.stack);
      throw error;
    }
  }

  /**
   * Get instrument by UUID
   */
  async getInstrumentByUuid(uuid: string): Promise<InstrumentResponseDto> {
    try {
      this.logger.log(`Fetching instrument with UUID: ${uuid}`);
      
      const instrument = await this.instrumentRepository.findByUuid(uuid);
      
      if (!instrument) {
        throw new NotFoundException(`Instrument with UUID ${uuid} not found`);
      }

      return this.mapToResponseDto(instrument);
    } catch (error) {
      this.logger.error(`Error fetching instrument with UUID: ${uuid}`, error.stack);
      throw error;
    }
  }

  /**
   * Get instrument by instrument token
   */
  async getInstrumentByToken(instrumentToken: string): Promise<InstrumentResponseDto> {
    try {
      this.logger.log(`Fetching instrument with token: ${instrumentToken}`);
      
      const instrument = await this.instrumentRepository.findByInstrumentToken(instrumentToken);
      
      if (!instrument) {
        throw new NotFoundException(`Instrument with token ${instrumentToken} not found`);
      }

      return this.mapToResponseDto(instrument);
    } catch (error) {
      this.logger.error(`Error fetching instrument with token: ${instrumentToken}`, error.stack);
      throw error;
    }
  }

  /**
   * Get instruments by server UUID
   */
  async getInstrumentsByServer(serverUuid: string): Promise<InstrumentResponseDto[]> {
    try {
      this.logger.log(`Fetching instruments for server: ${serverUuid}`);
      
      const instruments = await this.instrumentRepository.findByServerUuid(serverUuid);
      
      return instruments.map(this.mapToResponseDto);
    } catch (error) {
      this.logger.error(`Error fetching instruments for server: ${serverUuid}`, error.stack);
      throw error;
    }
  }

  /**
   * Get instruments by websocket UUID
   */
  async getInstrumentsByWebSocket(websocketUuid: string): Promise<InstrumentResponseDto[]> {
    try {
      this.logger.log(`Fetching instruments for websocket: ${websocketUuid}`);
      
      const instruments = await this.instrumentRepository.findByWebSocketUuid(websocketUuid);
      
      return instruments.map(this.mapToResponseDto);
    } catch (error) {
      this.logger.error(`Error fetching instruments for websocket: ${websocketUuid}`, error.stack);
      throw error;
    }
  }

  /**
   * Get instrument statistics
   */
  async getInstrumentStats(serverUuid?: string): Promise<InstrumentStatsResponseDto> {
    try {
      this.logger.log(`Fetching instrument statistics${serverUuid ? ` for server: ${serverUuid}` : ''}`);
      
      const stats = await this.instrumentRepository.getInstrumentStats(serverUuid);
      
      return stats;
    } catch (error) {
      this.logger.error('Error fetching instrument statistics', error.stack);
      throw error;
    }
  }

  /**
   * Search instruments by trading symbol
   */
  async searchInstruments(symbol: string, limit: number = 10): Promise<InstrumentResponseDto[]> {
    try {
      this.logger.log(`Searching instruments with symbol: ${symbol}`);
      
      if (!symbol || symbol.trim().length < 2) {
        return [];
      }

      const instruments = await this.instrumentRepository.searchByTradingSymbol(symbol.trim(), limit);
      
      return instruments.map(this.mapToResponseDto);
    } catch (error) {
      this.logger.error(`Error searching instruments with symbol: ${symbol}`, error.stack);
      throw error;
    }
  }

  /**
   * Get active instruments count by server
   */
  async getActiveInstrumentsCount(serverUuid: string): Promise<number> {
    try {
      const instruments = await this.instrumentRepository.findByServerUuid(serverUuid);
      return instruments.length;
    } catch (error) {
      this.logger.error(`Error counting active instruments for server: ${serverUuid}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if instrument exists by token
   */
  async instrumentExists(instrumentToken: string): Promise<boolean> {
    try {
      const instrument = await this.instrumentRepository.findByInstrumentToken(instrumentToken);
      return !!instrument;
    } catch (error) {
      this.logger.error(`Error checking if instrument exists: ${instrumentToken}`, error.stack);
      return false;
    }
  }

  /**
   * Get instruments for Smart API websocket subscription
   * Returns array of instrument tokens grouped by websocket
   */
  async getInstrumentTokensForWebSocket(websocketUuid: string): Promise<string[]> {
    try {
      this.logger.log(`Fetching instrument tokens for websocket: ${websocketUuid}`);
      
      const instruments = await this.instrumentRepository.findByWebSocketUuid(websocketUuid);
      
      return instruments.map(instrument => instrument.token);
    } catch (error) {
      this.logger.error(`Error fetching instrument tokens for websocket: ${websocketUuid}`, error.stack);
      throw error;
    }
  }

  /**
   * Get exchange tokens for Smart API websocket subscription
   */
  async getExchangeTokensForWebSocket(websocketUuid: string): Promise<string[]> {
    try {
      this.logger.log(`Fetching exchange tokens for websocket: ${websocketUuid}`);
      
      const instruments = await this.instrumentRepository.findByWebSocketUuid(websocketUuid);
      
      return instruments.map(instrument => instrument.symboltoken ?? instrument.token);
    } catch (error) {
      this.logger.error(`Error fetching exchange tokens for websocket: ${websocketUuid}`, error.stack);
      throw error;
    }
  }

  /**
   * Update instrument by UUID
   */
  async updateInstrument(uuid: string, updateDto: UpdateInstrumentDto): Promise<InstrumentResponseDto> {
    try {
      this.logger.log(`Updating instrument with UUID: ${uuid}`);
      
      const instrument = await this.instrumentRepository.findByUuid(uuid);
      
      if (!instrument) {
        throw new NotFoundException(`Instrument with UUID ${uuid} not found`);
      }

      const updatedInstrument = await this.instrumentRepository.updateInstrument(uuid, updateDto);
      
      return this.mapToResponseDto(updatedInstrument);
    } catch (error) {
      this.logger.error(`Error updating instrument with UUID: ${uuid}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete instrument by UUID
   */
  async deleteInstrument(uuid: string): Promise<void> {
    try {
      this.logger.log(`Deleting instrument with UUID: ${uuid}`);
      
      const instrument = await this.instrumentRepository.findByUuid(uuid);
      
      if (!instrument) {
        throw new NotFoundException(`Instrument with UUID ${uuid} not found`);
      }

      await this.instrumentRepository.deleteInstrument(uuid);
      
      this.logger.log(`Successfully deleted instrument with UUID: ${uuid}`);
    } catch (error) {
      this.logger.error(`Error deleting instrument with UUID: ${uuid}`, error.stack);
      throw error;
    }
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(instrument: Instrument): InstrumentResponseDto {
    return {
      uuid: instrument.uuid,
      serverUuid: instrument.serverUuid,
      websocketUuid: instrument.websocketUuid,
      instrumentToken: instrument.token,
      exchangeToken: instrument.symboltoken ?? instrument.token,
      tradingSymbol: instrument.inputSymbol,
      name: instrument.name,
      exchange: instrument.exchange,
      expiryDate: instrument.expiry ? new Date(instrument.expiry) : undefined,
      strikePrice: instrument.strike ? parseFloat(instrument.strike) : undefined,
      tickSize: instrument.tickSize ? parseFloat(instrument.tickSize) : undefined,
      lotSize: instrument.lotsize ? parseInt(instrument.lotsize, 10) : undefined,
      instrumentType: instrument.series,
      segment: instrument.series,
      lastPrice: undefined, // Not available in entity
      isActive: true, // Assume all are active unless you add a field
      createdAt: instrument.createdAt,
      updatedAt: instrument.updatedAt,
    };
  }
}
