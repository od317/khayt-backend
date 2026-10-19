import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class AdminVerify2faDto {
  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(1)
  challengeToken!: string;

  @ApiProperty({ example: '' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'يجب أن يكون رمزاً من 6 أرقام' })
  code!: string;
}
