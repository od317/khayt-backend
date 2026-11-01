import { ApiProperty } from '@nestjs/swagger';

/** Public role picker item (GET /roles). */
export class RoleResponseDto {
  @ApiProperty({ example: 'employee' })
  value!: string;

  @ApiProperty({ example: 'موظف' })
  label!: string;

  @ApiProperty({
    example:
      'ابحث عن فرص عمل، اعرض مهاراتك، وتواصل مع المعامل والمتاجر في قطاع النسيج.',
  })
  description!: string;

  @ApiProperty({
    example: '/icons/employee.png',
    description:
      'Icon URL (e.g. /icons/employee.png). Prefix with API host. Placeholder if empty in DB.',
  })
  iconUrl!: string;

  @ApiProperty({
    example: false,
    description:
      'Whether this role requires the user to enter business details after role selection. True for store, workshop, and institute; false for all other roles.',
  })
  needsBusinessSetup!: boolean;
}
