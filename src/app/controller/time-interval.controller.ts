import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  HttpStatus,
  HttpCode,
  Param,
  Body,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { TimeIntervalResponseDto } from '../core/dtos/responses/time-interval.response.dto';
import { CreateTimeIntervalDto } from '../core/dtos/requests/create-time-interval.dto';
import { UpdateTimeIntervalDto } from '../core/dtos/requests/update-time-interval.dto';
import { SuccessResponseDto } from '../core/dtos/responses/sucess.response.dto';
import { ApiResponseSuccess } from '../core/decorators/api-response-success.decorator';
import { TimeIntervalService } from '../services/time-interval.service';

@ApiTags('Time Intervals')
@Controller('time-intervals')
export class TimeIntervalController {
  constructor(
    private readonly timeIntervalService: TimeIntervalService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all time intervals',
    description: 'Retrieves all available time intervals (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M) sorted by duration.',
  })
  @ApiResponseSuccess(TimeIntervalResponseDto, 200, true)
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getTimeIntervals(): Promise<SuccessResponseDto<TimeIntervalResponseDto[]>> {
    const intervals = await this.timeIntervalService.getAllTimeIntervals();
    
    return {
      data: intervals,
      message: `Retrieved ${intervals.length} time intervals`,
      code: HttpStatus.OK,
    };
  }

  @Get('active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get active time intervals',
    description: 'Retrieves only active time intervals sorted by duration.',
  })
  @ApiResponseSuccess(TimeIntervalResponseDto, 200, true)
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getActiveTimeIntervals(): Promise<SuccessResponseDto<TimeIntervalResponseDto[]>> {
    const intervals = await this.timeIntervalService.getActiveTimeIntervals();
    
    return {
      data: intervals,
      message: `Retrieved ${intervals.length} active time intervals`,
      code: HttpStatus.OK,
    };
  }

  @Get(':uuid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get time interval by UUID',
    description: 'Retrieves a specific time interval by its UUID.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'Time interval UUID',
    example: 'uuid-string',
  })
  @ApiResponseSuccess(TimeIntervalResponseDto)
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  @ApiNotFoundResponse({ description: 'Time interval not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getTimeIntervalByUuid(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<SuccessResponseDto<TimeIntervalResponseDto>> {
    const interval = await this.timeIntervalService.getTimeIntervalByUuid(uuid);
    
    return {
      data: interval,
      message: 'Time interval retrieved successfully',
      code: HttpStatus.OK,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new time interval',
    description: 'Creates a new time interval with the specified properties.',
  })
  @ApiCreatedResponse({ 
    description: 'Time interval created successfully',
    type: TimeIntervalResponseDto
  })
  @ApiBadRequestResponse({ description: 'Invalid request data or duplicate interval' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async createTimeInterval(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createDto: CreateTimeIntervalDto,
  ): Promise<SuccessResponseDto<TimeIntervalResponseDto>> {
    const interval = await this.timeIntervalService.createTimeInterval(createDto);
    
    return {
      data: interval,
      message: 'Time interval created successfully',
      code: HttpStatus.CREATED,
    };
  }

  @Put(':uuid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update time interval',
    description: 'Updates an existing time interval by UUID.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'Time interval UUID',
    example: 'uuid-string',
  })
  @ApiResponseSuccess(TimeIntervalResponseDto)
  @ApiBadRequestResponse({ description: 'Invalid UUID format or request data' })
  @ApiNotFoundResponse({ description: 'Time interval not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async updateTimeInterval(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateDto: UpdateTimeIntervalDto,
  ): Promise<SuccessResponseDto<TimeIntervalResponseDto>> {
    const interval = await this.timeIntervalService.updateTimeInterval(uuid, updateDto);
    
    return {
      data: interval,
      message: 'Time interval updated successfully',
      code: HttpStatus.OK,
    };
  }

  @Delete(':uuid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete time interval',
    description: 'Deletes a time interval by UUID.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'Time interval UUID',
    example: 'uuid-string',
  })
  @ApiResponseSuccess(Object)
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  @ApiNotFoundResponse({ description: 'Time interval not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async deleteTimeInterval(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<SuccessResponseDto<{ deleted: boolean }>> {
    await this.timeIntervalService.deleteTimeInterval(uuid);
    
    return {
      data: { deleted: true },
      message: 'Time interval deleted successfully',
      code: HttpStatus.OK,
    };
  }
}
