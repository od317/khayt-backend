import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}
