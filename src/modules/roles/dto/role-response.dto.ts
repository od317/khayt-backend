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
}
