import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateStaffUserDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  suspended?: boolean;

  @ApiPropertyOptional({ example: 'employee' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  role?: string;
}
