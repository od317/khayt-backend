import { IsBoolean } from 'class-validator';

export class UpdateOrderLineDto {
  @IsBoolean()
  picked!: boolean;
}
