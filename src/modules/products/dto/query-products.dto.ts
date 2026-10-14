import {
  IsBooleanString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryProductsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsBooleanString()
  inWarehouse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
