import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QuerySupplyDto extends PaginationDto {
  @IsOptional()
  @IsString()
  businessId?: string;
}
