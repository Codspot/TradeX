import {
  Controller,
  Post,
  Get,
  Param,
  ParseUUIDPipe,
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
import { PythonWorkerSeederService } from '../services/python-worker-seeder.service';
import { SuccessResponseDto } from '../core/dtos/responses/sucess.response.dto';
import { ApiResponseSuccess } from '../core/decorators/api-response-success.decorator';

@ApiTags('Python Worker')
@Controller('python-worker')
export class PythonWorkerController {
  constructor(
    private readonly pythonWorkerSeederService: PythonWorkerSeederService,
  ) {}

  @Post('connect-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connect all websockets to Python worker',
    description: 'Triggers the seeder to connect all active websockets to the Python worker Flask API.',
  })
  @ApiResponseSuccess(Object)
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async connectAllWebSockets(): Promise<SuccessResponseDto<{ initiated: boolean }>> {
    await this.pythonWorkerSeederService.connectAllWebSocketsToPythonWorker();
    
    return {
      data: { initiated: true },
      message: 'Python worker connection process initiated for all websockets',
      code: HttpStatus.OK,
    };
  }

  @Post('connect/:websocketUuid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connect specific websocket to Python worker',
    description: 'Connects a specific websocket to the Python worker Flask API.',
  })
  @ApiParam({
    name: 'websocketUuid',
    description: 'WebSocket UUID',
    example: 'a16b9201-b4fe-448b-b100-9c834f4474fc',
  })
  @ApiResponseSuccess(Object)
  @ApiBadRequestResponse({ description: 'Invalid websocket UUID format' })
  @ApiNotFoundResponse({ description: 'WebSocket not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async connectSpecificWebSocket(
    @Param('websocketUuid', ParseUUIDPipe) websocketUuid: string,
  ): Promise<SuccessResponseDto<{ connected: boolean }>> {
    await this.pythonWorkerSeederService.connectSpecificWebSocket(websocketUuid);
    
    return {
      data: { connected: true },
      message: `Python worker connection initiated for websocket ${websocketUuid}`,
      code: HttpStatus.OK,
    };
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get connection status of all websockets',
    description: 'Returns the connection status of all websockets with the Python worker.',
  })
  @ApiResponseSuccess(Object, 200, true)
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getConnectionStatus(): Promise<SuccessResponseDto<any[]>> {
    const status = await this.pythonWorkerSeederService.getWebSocketConnectionStatus();
    
    return {
      data: status,
      message: `Retrieved connection status for ${status.length} websockets`,
      code: HttpStatus.OK,
    };
  }
}
