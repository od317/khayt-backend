import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateAvailabilityDto {
  @ApiProperty({
    example: true,
    description: 'Whether the employee is available for work',
  })
  @IsBoolean()
  availableForWork!: boolean;
}
