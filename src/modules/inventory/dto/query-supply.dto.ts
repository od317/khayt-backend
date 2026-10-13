import { IsOptional, IsString } from 'class-validator';

export class QuerySupplyDto {
  @IsOptional()
  @IsString()
  businessId?: string;
}
