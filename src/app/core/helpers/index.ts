import {
  SuccessResponseDto,
} from '../dtos/responses/sucess.response.dto';

export class Helpers {
  static toSuccessResponseWithData(
    message: string,
    code: number,
    data: any,
  ): SuccessResponseDto<any> {
    return {
      code: code,
      message: message,
      data: data,
    };
  }
}
