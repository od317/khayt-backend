import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateCartItemDto {
    @ApiProperty({ example: 3, minimum: 1, maximum: 10000 })
    @IsInt()
    @Min(1)
    @Max(10000)
    quantity!: number;
}