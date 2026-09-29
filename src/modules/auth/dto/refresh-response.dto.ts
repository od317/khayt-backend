import { ApiProperty } from '@nestjs/swagger';

export class RefreshResponseDto {
  @ApiProperty({ example: '' })
  accessToken!: string;

  @ApiProperty({ example: '2026-09-29T07:22:15.000Z' })
  accessTokenExpiresAt!: string;
}
