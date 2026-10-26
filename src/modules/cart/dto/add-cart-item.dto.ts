import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Cart variant payload.
 * - free size: `{ color, size }`
 * - color sizePack / color_size_pack: `{ color }`
 * - color_pair_pack: `{ color, pairColor }` or `{ color, pairColors: string[] }`
 *   (`pairColors` = one or more seconds; still accepts singular `pairColor`)
 * - locked_axis: unlocked axis only
 */
export type AddCartVariantDto = {
  color?: string;
  size?: string;
  /** Single second color (color_pair_pack). */
  pairColor?: string;
  /** One or more second colors (color_pair_pack). Creates one cart line per value. */
  pairColors?: string[];
  [key: string]: string | string[] | undefined;
};

export class AddCartItemDto {
  @ApiProperty({ example: 'prod-qamis-abyad' })
  @IsString()
  productId!: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  quantity?: number;

  @ApiPropertyOptional({
    example: { color: 'أحمر', pairColors: ['أزرق', 'أسود'] },
    description:
      'Per color: free size → `{ color, size }`; color with sizePack → `{ color }` only (qty = packs). Product color_pair_pack → `{ color, pairColor }` or `{ color, pairColors: ["…"] }` (one or more seconds; one cart line per pair). locked_axis → unlocked axis only.',
  })
  @IsOptional()
  @IsObject()
  variant?: AddCartVariantDto;
}
