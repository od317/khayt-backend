import { IsOptional, IsString } from 'class-validator';

export class QuerySupplyDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  lowStock?: string;
}
