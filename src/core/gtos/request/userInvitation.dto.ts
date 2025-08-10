import { IsNotEmpty, IsString } from 'class-validator';

export class UserInvitationDTO {
  @IsString()
  @IsNotEmpty()
  userEmail: string;
}

export class UserInvitationUpdateRequestDTO {
  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;
}
