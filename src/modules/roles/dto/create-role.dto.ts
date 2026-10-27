import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'partner' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'يجب أن يكون معرفاً بأحرف صغيرة (حروف، أرقام، شرطة سفلية)',
  })
  @MaxLength(50)
  value!: string;

  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label!: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example:
      '/icons/employee.png',
    description: 'Public icon URL for the role picker.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  iconUrl?: string;

  @ApiProperty({
    example: true,
    description:
      'If true, the role is returned by GET /roles and can be chosen in the Flutter onboarding flow. Dashboard admins always see every role.',
  })
  @IsBoolean()
  visibleInApp!: boolean;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
