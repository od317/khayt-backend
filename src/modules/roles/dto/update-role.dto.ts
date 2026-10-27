import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example:
      '/icons/store.png',
    description: 'Public icon URL for the role picker.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  iconUrl?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'If true, the role is returned by GET /roles and can be chosen in the Flutter onboarding flow. Dashboard admins always see every role.',
  })
  @IsOptional()
  @IsBoolean()
  visibleInApp?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
