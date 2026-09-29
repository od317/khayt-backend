import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class AdminVerify2faDto {
  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(1)
  challengeToken!: string;

  @ApiProperty({ example: '' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'must be a 6-digit code' })
  code!: string;
}
