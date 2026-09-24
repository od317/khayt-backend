import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDeliveryDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  orderIds!: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  area!: string;
}
