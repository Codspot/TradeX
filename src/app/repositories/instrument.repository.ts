import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Instrument } from '../entities/instrument.entity';
import { GetInstrumentsQueryDto } from '../core/dtos/requests/get-instruments.dto';

@Injectable()
export class InstrumentRepository {
  constructor(
    @InjectRepository(Instrument)
    private readonly instrumentRepository: Repository<Instrument>,
  ) {}

  /**
   * Find all instruments with pagination and filtering
   */
  async findAllWithPagination(queryDto: GetInstrumentsQueryDto) {
    const queryBuilder = this.createBaseQueryBuilder();
    this.applyFilters(queryBuilder, queryDto);
    this.applySorting(queryBuilder, queryDto);

    const { page = 1, limit = 20 } = queryDto;
    const skip = (page - 1) * limit;

    // Get total count before pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    const instruments = await queryBuilder
      .skip(skip)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data: instruments,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Find instrument by UUID
   */
  async findByUuid(uuid: string): Promise<Instrument | null> {
    return await this.instrumentRepository.findOne({
      where: { uuid },
    });
  }

  /**
   * Find instrument by instrument token
   */
  async findByInstrumentToken(token: string): Promise<Instrument | null> {
    return await this.instrumentRepository.findOne({
      where: { token },
    });
  }

  /**
   * Find instruments by server UUID
   */
  async findByServerUuid(serverUuid: string): Promise<Instrument[]> {
    return await this.instrumentRepository.find({
      where: { serverUuid },
      order: { inputSymbol: 'ASC' },
    });
  }

  /**
   * Find instruments by websocket UUID
   */
  async findByWebSocketUuid(websocketUuid: string): Promise<Instrument[]> {
    return await this.instrumentRepository.find({
      where: { websocketUuid },
      order: { inputSymbol: 'ASC' },
    });
  }

  /**
   * Get instrument statistics
   */
  async getInstrumentStats(serverUuid?: string) {
    const queryBuilder = this.createBaseQueryBuilder();
    
    if (serverUuid) {
      queryBuilder.where('instrument.serverUuid = :serverUuid', { serverUuid });
    }

    // Total counts
    const totalInstruments = await queryBuilder.getCount();
    const activeInstruments = await queryBuilder.andWhere('instrument.isActive = :isActive', { isActive: true }).getCount();
    const inactiveInstruments = totalInstruments - activeInstruments;

    // Group by exchange
    const byExchange = await this.instrumentRepository
      .createQueryBuilder('instrument')
      .select('instrument.exchange', 'exchange')
      .addSelect('COUNT(*)', 'count')
      .where(serverUuid ? 'instrument.serverUuid = :serverUuid' : '1=1', { serverUuid })
      .groupBy('instrument.exchange')
      .getRawMany();

    // Group by type
    const byType = await this.instrumentRepository
      .createQueryBuilder('instrument')
      .select('instrument.instrumentType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where(serverUuid ? 'instrument.serverUuid = :serverUuid' : '1=1', { serverUuid })
      .groupBy('instrument.instrumentType')
      .getRawMany();

    // Group by websocket
    const byWebSocket = await this.instrumentRepository
      .createQueryBuilder('instrument')
      .select('instrument.websocketUuid', 'websocketUuid')
      .addSelect('COUNT(*)', 'count')
      .where(serverUuid ? 'instrument.serverUuid = :serverUuid' : '1=1', { serverUuid })
      .groupBy('instrument.websocketUuid')
      .getRawMany();

    return {
      totalInstruments,
      activeInstruments,
      inactiveInstruments,
      byExchange: byExchange.map(item => ({
        exchange: item.exchange,
        count: parseInt(item.count, 10),
      })),
      byType: byType.map(item => ({
        type: item.type,
        count: parseInt(item.count, 10),
      })),
      byWebSocket: byWebSocket.map(item => ({
        websocketUuid: item.websocketUuid,
        count: parseInt(item.count, 10),
      })),
    };
  }

  /**
   * Search instruments by input symbol
   */
  async searchByTradingSymbol(symbol: string, limit: number = 10): Promise<Instrument[]> {
    return await this.instrumentRepository
      .createQueryBuilder('instrument')
      .where('instrument.inputSymbol ILIKE :symbol', { symbol: `%${symbol}%` })
      .orderBy('instrument.inputSymbol', 'ASC')
      .limit(limit)
      .getMany();
  }

  /**
   * Update instrument by UUID
   */
  async updateInstrument(uuid: string, updateData: any): Promise<Instrument> {
    await this.instrumentRepository.update(uuid, updateData);
    const updatedInstrument = await this.instrumentRepository.findOne({
      where: { uuid }
    });
    if (!updatedInstrument) {
      throw new Error('Failed to retrieve updated instrument');
    }
    return updatedInstrument;
  }

  /**
   * Delete instrument by UUID
   */
  async deleteInstrument(uuid: string): Promise<void> {
    await this.instrumentRepository.delete(uuid);
  }

  /**
   * Create base query builder
   */
  private createBaseQueryBuilder(): SelectQueryBuilder<Instrument> {
    return this.instrumentRepository.createQueryBuilder('instrument');
  }

  /**
   * Apply filters to query builder
   */
  private applyFilters(queryBuilder: SelectQueryBuilder<Instrument>, queryDto: GetInstrumentsQueryDto): void {
    const { exchange, segment, search } = queryDto;

    // Optional exchange filter
    if (exchange) {
      queryBuilder.andWhere('instrument.exchange = :exchange', { exchange });
    }

    // Optional segment filter
    if (segment) {
      queryBuilder.andWhere('instrument.series = :segment', { segment });
    }

    // Optional search filter (searches both symbol and name)
    if (search && search.trim().length > 0) {
      queryBuilder.andWhere(
        '(instrument.inputSymbol ILIKE :search OR instrument.name ILIKE :search)',
        { search: `%${search.trim()}%` }
      );
    }
  }

  /**
   * Apply sorting to query builder
   */
  private applySorting(queryBuilder: SelectQueryBuilder<Instrument>, queryDto: GetInstrumentsQueryDto): void {
    // Default sorting by input symbol ascending
    queryBuilder.orderBy('instrument.inputSymbol', 'ASC');
  }
}
