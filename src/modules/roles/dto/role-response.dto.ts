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
    example:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbksj9NS4J0zAJN5LEwzN6i0tV5dtgZmR89UzhDAK7CYCIsFvpajnCeHvl&s=10',
    description: 'Always a URL (placeholder if empty in DB).',
  })
  iconUrl!: string;
}
