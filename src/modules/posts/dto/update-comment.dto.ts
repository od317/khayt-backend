import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({ example: 'تعليق محدّث' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}
