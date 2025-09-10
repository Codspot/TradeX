import {
  Controller,
  Post,
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
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { WebSocketService } from '../services/websocket.service';
import { LtpDataDto } from '../core/dtos/requests/ltp-data.dto';
import { SuccessResponseDto } from '../core/dtos/responses/sucess.response.dto';
import { ApiResponseSuccess } from '../core/decorators/api-response-success.decorator';

@ApiTags('WebSocket')
@Controller('websocket')
export class WebSocketController {
  constructor(
    private readonly webSocketService: WebSocketService,
  ) {}

  @Post(':websocketuuid/ltp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive LTP data from Python worker',
    description: 'Webhook endpoint to receive Last Traded Price (LTP) data from Python worker for a specific websocket.',
  })
  @ApiParam({
    name: 'websocketuuid',
    description: 'WebSocket UUID',
    example: 'a16b9201-b4fe-448b-b100-9c834f4474fc',
  })
  @ApiCreatedResponse({ 
    description: 'LTP data received and processed successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid websocket UUID format or LTP data' })
  @ApiNotFoundResponse({ description: 'WebSocket not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiResponseSuccess(Object)
  async receiveLtpData(
    @Param('websocketuuid', ParseUUIDPipe) websocketUuid: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    ltpData: LtpDataDto,
  ): Promise<SuccessResponseDto<{ processed: boolean; ticksCount: number }>> {
    // Validate that the websocket ID in payload matches the URL parameter
    if (ltpData.websocket_id !== websocketUuid) {
      throw new Error(`WebSocket ID mismatch: URL=${websocketUuid}, Payload=${ltpData.websocket_id}`);
    }

    const result = await this.webSocketService.processLtpData(websocketUuid, ltpData);
    
    return {
      data: { 
        processed: true, 
        ticksCount: result.ticksCount 
      },
      message: `Processed ${result.ticksCount} LTP tick for websocket ${websocketUuid}`,
      code: HttpStatus.OK,
    };
  }
}