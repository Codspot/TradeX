import {
  Controller,
  Get,
  Put,
  Delete,
  Query,
  Param,
  Body,
  ParseUUIDPipe,
  ValidationPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { InstrumentService } from '../services/instrument.service';
import { GetInstrumentsQueryDto } from '../core/dtos/requests/get-instruments.dto';
import { UpdateInstrumentDto } from '../core/dtos/requests/update-instrument.dto';
import {
  InstrumentResponseDto,
  PaginatedInstrumentsResponseDto,
} from '../core/dtos/responses/instrument.response.dto';
import { SuccessResponseDto } from '../core/dtos/responses/sucess.response.dto';
import { ApiResponseSuccess } from '../core/decorators/api-response-success.decorator';

@ApiTags('Instruments')
@Controller('instruments')
export class InstrumentController {
  constructor(
    private readonly instrumentService: InstrumentService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all instruments',
    description: 'Retrieves all instruments with optional filtering by exchange, segment, and search. Supports pagination.',
  })
  @ApiResponseSuccess(PaginatedInstrumentsResponseDto)
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getInstruments(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    queryDto: GetInstrumentsQueryDto,
  ): Promise<SuccessResponseDto<PaginatedInstrumentsResponseDto>> {
    const result = await this.instrumentService.getInstruments(queryDto);
    
    return {
      data: result,
      message: `Retrieved ${result.data.length} instruments (Page ${result.meta.page} of ${result.meta.totalPages})`,
      code: HttpStatus.OK,
    };
  }

  @Get(':uuid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get instrument by UUID',
    description: 'Retrieves a specific instrument by its UUID.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'Instrument UUID',
    example: 'instrument-uuid',
  })
  @ApiResponseSuccess(InstrumentResponseDto)
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  @ApiNotFoundResponse({ description: 'Instrument not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getInstrumentByUuid(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<SuccessResponseDto<InstrumentResponseDto>> {
    const instrument = await this.instrumentService.getInstrumentByUuid(uuid);
    
    return {
      data: instrument,
      message: 'Instrument retrieved successfully',
      code: HttpStatus.OK,
    };
  }

  @Get('websocket/:websocketUuid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get instruments by websocket UUID',
    description: 'Retrieves all active instruments associated with a specific websocket.',
  })
  @ApiParam({
    name: 'websocketUuid',
    description: 'WebSocket UUID',
    example: 'websocket-uuid',
  })
  @ApiResponseSuccess(InstrumentResponseDto, 200, true)
  @ApiBadRequestResponse({ description: 'Invalid websocket UUID format' })
  @ApiNotFoundResponse({ description: 'WebSocket not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getInstrumentsByWebSocket(
    @Param('websocketUuid', ParseUUIDPipe) websocketUuid: string,
  ): Promise<SuccessResponseDto<InstrumentResponseDto[]>> {
    const instruments = await this.instrumentService.getInstrumentsByWebSocket(websocketUuid);
    
    return {
      data: instruments,
      message: `Retrieved ${instruments.length} instruments for websocket ${websocketUuid}`,
      code: HttpStatus.OK,
    };
  }

  @Put(':uuid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update instrument',
    description: 'Updates an existing instrument by UUID.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'Instrument UUID',
    example: 'instrument-uuid',
  })
  @ApiResponseSuccess(InstrumentResponseDto)
  @ApiBadRequestResponse({ description: 'Invalid UUID format or request data' })
  @ApiNotFoundResponse({ description: 'Instrument not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async updateInstrument(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateDto: UpdateInstrumentDto,
  ): Promise<SuccessResponseDto<InstrumentResponseDto>> {
    const instrument = await this.instrumentService.updateInstrument(uuid, updateDto);
    
    return {
      data: instrument,
      message: 'Instrument updated successfully',
      code: HttpStatus.OK,
    };
  }

  @Delete(':uuid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete instrument',
    description: 'Deletes an instrument by UUID.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'Instrument UUID',
    example: 'instrument-uuid',
  })
  @ApiResponseSuccess(Object)
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  @ApiNotFoundResponse({ description: 'Instrument not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async deleteInstrument(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<SuccessResponseDto<{ deleted: boolean }>> {
    await this.instrumentService.deleteInstrument(uuid);
    
    return {
      data: { deleted: true },
      message: 'Instrument deleted successfully',
      code: HttpStatus.OK,
    };
  }
}
