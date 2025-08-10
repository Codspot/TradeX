import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponseDto<T> {
  @ApiProperty()
  data: T;

  @ApiProperty({ example: 'Success message line here' })
  message: string;

  @ApiProperty({ example: 200 })
  code: number;
}
