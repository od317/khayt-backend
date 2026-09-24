import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDeliveryDto {
  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  area?: string;
}
