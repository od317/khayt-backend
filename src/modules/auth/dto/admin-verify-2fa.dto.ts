import { IsString, Matches, MinLength } from 'class-validator';

export class AdminVerify2faDto {
  @IsString()
  @MinLength(1)
  challengeToken!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'must be a 6-digit code' })
  code!: string;
}
