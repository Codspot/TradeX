import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeIntervalEntity } from '../entities/market-data-interval.entity';
import { TimeIntervalResponseDto } from '../core/dtos/responses/time-interval.response.dto';
import { CreateTimeIntervalDto } from '../core/dtos/requests/create-time-interval.dto';
import { UpdateTimeIntervalDto } from '../core/dtos/requests/update-time-interval.dto';

@Injectable()
export class TimeIntervalService {
  constructor(
    @InjectRepository(TimeIntervalEntity)
    private timeIntervalRepository: Repository<TimeIntervalEntity>,
  ) {}

  async getAllTimeIntervals(): Promise<TimeIntervalResponseDto[]> {
    const intervals = await this.timeIntervalRepository.find({
      order: { sortOrder: 'ASC' },
    });

    return intervals.map(interval => this.mapToResponseDto(interval));
  }

  async getActiveTimeIntervals(): Promise<TimeIntervalResponseDto[]> {
    const intervals = await this.timeIntervalRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });

    return intervals.map(interval => this.mapToResponseDto(interval));
  }

  private mapToResponseDto(interval: TimeIntervalEntity): TimeIntervalResponseDto {
    return {
      uuid: interval.uuid,
      interval: interval.interval,
      name: interval.name,
      description: interval.description,
      durationMinutes: interval.durationMinutes,
      isActive: interval.isActive,
      sortOrder: interval.sortOrder,
      createdAt: interval.createdAt,
      updatedAt: interval.updatedAt,
    };
  }

  async getTimeIntervalByUuid(uuid: string): Promise<TimeIntervalResponseDto> {
    const interval = await this.timeIntervalRepository.findOne({
      where: { uuid },
    });

    if (!interval) {
      throw new NotFoundException(`Time interval with UUID ${uuid} not found`);
    }

    return this.mapToResponseDto(interval);
  }

  async createTimeInterval(createDto: CreateTimeIntervalDto): Promise<TimeIntervalResponseDto> {
    // Check if interval already exists
    const existingInterval = await this.timeIntervalRepository.findOne({
      where: { interval: createDto.interval },
    });

    if (existingInterval) {
      throw new BadRequestException(`Time interval ${createDto.interval} already exists`);
    }

    const intervalEntity = this.timeIntervalRepository.create({
      interval: createDto.interval,
      name: createDto.name,
      description: createDto.description,
      durationMinutes: createDto.durationMinutes,
      isActive: createDto.isActive ?? true,
      sortOrder: createDto.sortOrder ?? 0,
    });

    const savedInterval = await this.timeIntervalRepository.save(intervalEntity);
    return this.mapToResponseDto(savedInterval);
  }

  async updateTimeInterval(uuid: string, updateDto: UpdateTimeIntervalDto): Promise<TimeIntervalResponseDto> {
    const interval = await this.timeIntervalRepository.findOne({
      where: { uuid },
    });

    if (!interval) {
      throw new NotFoundException(`Time interval with UUID ${uuid} not found`);
    }

    // Check if updating to an interval that already exists (and it's not the same record)
    if (updateDto.interval && updateDto.interval !== interval.interval) {
      const existingInterval = await this.timeIntervalRepository.findOne({
        where: { interval: updateDto.interval },
      });

      if (existingInterval) {
        throw new BadRequestException(`Time interval ${updateDto.interval} already exists`);
      }
    }

    // Update the interval with new data
    Object.assign(interval, updateDto);
    const updatedInterval = await this.timeIntervalRepository.save(interval);
    return this.mapToResponseDto(updatedInterval);
  }

  async deleteTimeInterval(uuid: string): Promise<void> {
    const interval = await this.timeIntervalRepository.findOne({
      where: { uuid },
    });

    if (!interval) {
      throw new NotFoundException(`Time interval with UUID ${uuid} not found`);
    }

    await this.timeIntervalRepository.remove(interval);
  }
}
