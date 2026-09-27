import { UserRole } from '@prisma/client';
import {
  IsBooleanString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryUsersDto extends PaginationDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBooleanString()
  verified?: string;

  @IsOptional()
  @IsBooleanString()
  suspended?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
