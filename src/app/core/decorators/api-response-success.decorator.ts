import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { SuccessResponseDto } from '../dtos/responses/sucess.response.dto';

export const ApiResponseSuccess = <DataDto extends Type<unknown>>(
  dataDto: DataDto,
  status = 200,
  array = false,
) =>
  applyDecorators(
    ApiExtraModels(SuccessResponseDto, dataDto),
    ApiResponse({
      status,
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: !array
              ? {
                  data: {
                    $ref: getSchemaPath(dataDto),
                  },
                }
              : {
                  data: {
                    type: 'array',
                    items: { $ref: getSchemaPath(dataDto) },
                  },
                },
          },
        ],
      },
    }),
  );
