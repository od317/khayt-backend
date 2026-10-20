import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryMarketersDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'مسوق' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ example: 'دمشق' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 'true', enum: ['true', 'false'] })
  @IsOptional()
  @IsBooleanString()
  verified?: string;

  @ApiPropertyOptional({ example: 'true', enum: ['true', 'false'] })
  @IsOptional()
  @IsBooleanString()
  availableForWork?: string;
}
