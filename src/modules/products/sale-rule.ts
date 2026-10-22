import { HttpException, HttpStatus } from '@nestjs/common';

export const SALE_RULE_AXES = ['color', 'size'] as const;
export type SaleRuleAxis = (typeof SALE_RULE_AXES)[number];

export const SALE_MODES = [
  'locked_axis',
  'color_size_pack',
  'color_pair_pack',
] as const;
export type SaleMode = (typeof SALE_MODES)[number];

/**
 * Top-level product enum for the FE picker UI.
 * Derived from `saleRule` + per-color `sizePack` (not stored separately).
 */
export const PRODUCT_SALE_CASES = [
  /** Buyer picks color + size on every color (optional color discounts). */
  'free',
  /** Same product: some colors free size, some colors admin sizePack. */
  'mixed',
  /** Every color (or product rule) forces a size pack; buyer picks color only. */
  'color_size_pack',
  /** Buyer picks color + pairColor; sizes forced for both. */
  'color_pair_pack',
  /** Locked axis set (e.g. all colors); buyer picks the other axis only. */
  'locked_axis',
] as const;
export type ProductSaleCase = (typeof PRODUCT_SALE_CASES)[number];

export type SizePack = {
  sizes: string[];
  qtyPerSize: number;
};

export type ParsedSaleRule =
  | { mode: 'locked_axis'; lockedAxis: SaleRuleAxis }
  | { mode: 'color_size_pack'; sizePack: SizePack }
  | {
      mode: 'color_pair_pack';
      sizePack: SizePack;
      allowedPairColors: string[];
    };

/** @deprecated Prefer ParsedSaleRule — kept for callers that only used lockedAxis. */
export type SaleRuleInput = { lockedAxis: SaleRuleAxis };

export type PackBreakdownLine = {
  color: string;
  size: string;
  qty: number;
};

/** Public product field for list/detail. */
export type SaleRuleResponse =
  | {
      mode: 'locked_axis';
      lockedAxis: SaleRuleAxis;
      label: string;
      options: string[];
      optionCount: number;
    }
  | {
      mode: 'color_size_pack';
      sizePack: SizePack;
      unitsPerPack: number;
    }
  | {
      mode: 'color_pair_pack';
      sizePack: SizePack;
      allowedPairColors: string[];
      unitsPerPack: number;
    };

type VariantTree = {
  axes?: { key?: unknown; label?: unknown }[];
  options?: {
    name?: unknown;
    discountPercent?: unknown;
    /** When set, this color uses an admin size pack (buyer cannot pick size). */
    sizePack?: unknown;
    children?: { name?: unknown }[];
  }[];
};

/** How a cart line prices / expands after resolving product + color rules. */
export type ResolvedCartSale =
  | { type: 'pieces' }
  | {
      type: 'pack';
      sizePack: SizePack;
      colors: string[];
      unitsPerPack: number;
    };

export function isSaleRuleAxis(value: unknown): value is SaleRuleAxis {
  return value === 'color' || value === 'size';
}

function isSaleMode(value: unknown): value is SaleMode {
  return (
    value === 'locked_axis' ||
    value === 'color_size_pack' ||
    value === 'color_pair_pack'
  );
}

export function parseSizePack(raw: unknown): SizePack | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const sizesRaw = (raw as { sizes?: unknown }).sizes;
  const qtyRaw = (raw as { qtyPerSize?: unknown }).qtyPerSize;
  if (!Array.isArray(sizesRaw) || typeof qtyRaw !== 'number') return null;
  if (!Number.isInteger(qtyRaw) || qtyRaw < 1) return null;
  const sizes = sizesRaw
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.trim());
  if (sizes.length === 0) return null;
  return { sizes: uniquePreserveOrder(sizes), qtyPerSize: qtyRaw };
}

/** Per-color admin size pack, if this color forces sizes. */
export function getColorSizePack(
  variants: unknown,
  colorName: string,
): SizePack | null {
  if (!variants || typeof variants !== 'object') return null;
  const tree = variants as VariantTree;
  const options = Array.isArray(tree.options) ? tree.options : [];
  const option = options.find(
    (o) => typeof o.name === 'string' && o.name.trim() === colorName.trim(),
  );
  if (!option) return null;
  return parseSizePack(option.sizePack);
}

export function sizePackUnits(sizePack: SizePack, colorCount = 1): number {
  return sizePack.sizes.length * sizePack.qtyPerSize * colorCount;
}

/**
 * Single enum the FE should switch on for product detail / add-to-cart UI.
 */
export function resolveProductSaleCase(
  saleRuleRaw: unknown,
  variants: unknown,
): ProductSaleCase {
  const rule = parseSaleRuleStored(saleRuleRaw);
  if (rule?.mode === 'locked_axis') return 'locked_axis';
  if (rule?.mode === 'color_pair_pack') return 'color_pair_pack';
  if (rule?.mode === 'color_size_pack') return 'color_size_pack';

  if (!variants || typeof variants !== 'object') return 'free';
  const tree = variants as VariantTree;
  const options = Array.isArray(tree.options) ? tree.options : [];
  let withPack = 0;
  let withoutPack = 0;
  for (const option of options) {
    if (typeof option.name !== 'string' || !option.name.trim()) continue;
    if (parseSizePack(option.sizePack)) withPack += 1;
    else withoutPack += 1;
  }

  if (withPack > 0 && withoutPack > 0) return 'mixed';
  if (withPack > 0 && withoutPack === 0) return 'color_size_pack';
  return 'free';
}

/**
 * Resolve how this cart line works: free pieces, or a pack (product-wide or per-color).
 */
export function resolveCartSale(
  saleRuleRaw: unknown,
  variants: unknown,
  variant: Record<string, string> | null | undefined,
): ResolvedCartSale {
  const rule = parseSaleRuleStored(saleRuleRaw);

  if (rule?.mode === 'locked_axis') {
    return { type: 'pieces' };
  }

  if (rule?.mode === 'color_size_pack') {
    const color = variant?.color?.trim();
    if (!color) return { type: 'pieces' };
    return {
      type: 'pack',
      sizePack: rule.sizePack,
      colors: [color],
      unitsPerPack: sizePackUnits(rule.sizePack, 1),
    };
  }

  if (rule?.mode === 'color_pair_pack') {
    const color = variant?.color?.trim();
    const pair = variant?.pairColor?.trim();
    if (!color || !pair) return { type: 'pieces' };
    return {
      type: 'pack',
      sizePack: rule.sizePack,
      colors: [color, pair],
      unitsPerPack: sizePackUnits(rule.sizePack, 2),
    };
  }

  // No product-wide pack rule — check per-color sizePack on the selected color.
  const color = variant?.color?.trim();
  if (!color) return { type: 'pieces' };
  const colorPack = getColorSizePack(variants, color);
  if (!colorPack) return { type: 'pieces' };
  return {
    type: 'pack',
    sizePack: colorPack,
    colors: [color],
    unitsPerPack: sizePackUnits(colorPack, 1),
  };
}

/**
 * Parse stored / DTO saleRule. Null → free mode (buyer picks color + size).
 * Legacy `{ lockedAxis }` without `mode` → locked_axis.
 */
export function parseSaleRuleStored(raw: unknown): ParsedSaleRule | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;

  const modeRaw = obj.mode;
  if (modeRaw === undefined || modeRaw === null) {
    // Legacy locked-axis shape.
    if (isSaleRuleAxis(obj.lockedAxis)) {
      return { mode: 'locked_axis', lockedAxis: obj.lockedAxis };
    }
    return null;
  }

  if (!isSaleMode(modeRaw)) return null;

  if (modeRaw === 'locked_axis') {
    if (!isSaleRuleAxis(obj.lockedAxis)) return null;
    return { mode: 'locked_axis', lockedAxis: obj.lockedAxis };
  }

  const sizePack = parseSizePack(obj.sizePack);
  if (!sizePack) return null;

  if (modeRaw === 'color_size_pack') {
    return { mode: 'color_size_pack', sizePack };
  }

  const pairsRaw = obj.allowedPairColors;
  if (!Array.isArray(pairsRaw)) return null;
  const allowedPairColors = uniquePreserveOrder(
    pairsRaw
      .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      .map((c) => c.trim()),
  );
  if (allowedPairColors.length === 0) return null;

  return { mode: 'color_pair_pack', sizePack, allowedPairColors };
}

/**
 * Collect option names for an axis from the variants tree.
 * - If locked axis is the first axis: top-level option names.
 * - If locked axis is the second axis: union of all children names across options.
 */
export function collectAxisOptions(
  variants: unknown,
  lockedAxis: SaleRuleAxis,
): { label: string; options: string[] } | null {
  if (!variants || typeof variants !== 'object') return null;
  const tree = variants as VariantTree;
  const axes = Array.isArray(tree.axes) ? tree.axes : [];
  const options = Array.isArray(tree.options) ? tree.options : [];

  const axisIndex = axes.findIndex((a) => a?.key === lockedAxis);
  if (axisIndex < 0) return null;

  const axis = axes[axisIndex]!;
  const label =
    typeof axis.label === 'string' && axis.label.trim()
      ? axis.label.trim()
      : lockedAxis === 'color'
        ? 'لون'
        : 'قياس';

  if (axisIndex === 0) {
    const names = options
      .map((o) => (typeof o.name === 'string' ? o.name.trim() : ''))
      .filter((n) => n.length > 0);
    return { label, options: uniquePreserveOrder(names) };
  }

  const names: string[] = [];
  for (const opt of options) {
    const children = Array.isArray(opt.children) ? opt.children : [];
    for (const child of children) {
      if (typeof child.name === 'string' && child.name.trim()) {
        names.push(child.name.trim());
      }
    }
  }
  return { label, options: uniquePreserveOrder(names) };
}

export function listColorNames(variants: unknown): string[] {
  return collectAxisOptions(variants, 'color')?.options ?? [];
}

export function listSizeNames(variants: unknown): string[] {
  return collectAxisOptions(variants, 'size')?.options ?? [];
}

export function unitsPerPack(rule: ParsedSaleRule): number | null {
  if (rule.mode === 'color_size_pack') {
    return rule.sizePack.sizes.length * rule.sizePack.qtyPerSize;
  }
  if (rule.mode === 'color_pair_pack') {
    return rule.sizePack.sizes.length * rule.sizePack.qtyPerSize * 2;
  }
  return null;
}

export function isPackSaleMode(
  rule: ParsedSaleRule | null,
): rule is
  | Extract<ParsedSaleRule, { mode: 'color_size_pack' }>
  | Extract<ParsedSaleRule, { mode: 'color_pair_pack' }> {
  return rule?.mode === 'color_size_pack' || rule?.mode === 'color_pair_pack';
}

/**
 * Expand packs into per color+size piece lines.
 * Prefer resolveCartSale + buildBreakdownFromResolved for per-color packs.
 */
export function buildPackBreakdown(
  rule: ParsedSaleRule | null,
  variant: Record<string, string> | null | undefined,
  packs: number,
): PackBreakdownLine[] | null {
  if (!rule || !isPackSaleMode(rule) || !variant || packs < 1) return null;
  const resolved = resolveCartSale(rule, null, variant);
  if (resolved.type !== 'pack') return null;
  return buildBreakdownFromResolved(resolved, packs);
}

export function buildBreakdownFromResolved(
  resolved: Extract<ResolvedCartSale, { type: 'pack' }>,
  packs: number,
): PackBreakdownLine[] {
  const lines: PackBreakdownLine[] = [];
  const qty = resolved.sizePack.qtyPerSize * packs;
  for (const c of resolved.colors) {
    for (const size of resolved.sizePack.sizes) {
      lines.push({ color: c, size, qty });
    }
  }
  return lines;
}

export function getColorDiscountPercent(
  variants: unknown,
  colorName: string,
): number | null {
  if (!variants || typeof variants !== 'object') return null;
  const tree = variants as VariantTree;
  const options = Array.isArray(tree.options) ? tree.options : [];
  const option = options.find(
    (o) => typeof o.name === 'string' && o.name.trim() === colorName.trim(),
  );
  if (!option) return null;
  const pct = option.discountPercent;
  if (typeof pct !== 'number' || !Number.isFinite(pct) || pct < 0 || pct > 100) {
    return null;
  }
  return pct;
}

/**
 * Piece unit price. Color discount applies only when the buyer freely picks
 * size for that color (not product packs / not per-color sizePack).
 */
export function pieceUnitPrice(
  basePrice: number,
  variants: unknown,
  variant: Record<string, string> | null | undefined,
  rule: ParsedSaleRule | null,
): number {
  const resolved = resolveCartSale(rule, variants, variant);
  if (resolved.type === 'pack') return basePrice;
  if (rule?.mode === 'locked_axis') return basePrice;
  const color = variant?.color;
  if (!color) return basePrice;
  const pct = getColorDiscountPercent(variants, color);
  if (pct === null || pct === 0) return basePrice;
  return Math.round(basePrice * (1 - pct / 100));
}

export function toSaleRuleResponse(
  saleRuleRaw: unknown,
  variants: unknown,
): SaleRuleResponse | null {
  const rule = parseSaleRuleStored(saleRuleRaw);
  if (!rule) return null;

  if (rule.mode === 'locked_axis') {
    const collected = collectAxisOptions(variants, rule.lockedAxis);
    if (!collected || collected.options.length === 0) return null;
    return {
      mode: 'locked_axis',
      lockedAxis: rule.lockedAxis,
      label: collected.label,
      options: collected.options,
      optionCount: collected.options.length,
    };
  }

  const perPack = unitsPerPack(rule);
  if (perPack === null) return null;

  if (rule.mode === 'color_size_pack') {
    return {
      mode: 'color_size_pack',
      sizePack: rule.sizePack,
      unitsPerPack: perPack,
    };
  }

  return {
    mode: 'color_pair_pack',
    sizePack: rule.sizePack,
    allowedPairColors: rule.allowedPairColors,
    unitsPerPack: perPack,
  };
}

function validationFailed(
  message: string,
  fields: Record<string, string>,
): never {
  throw new HttpException(
    { error: 'validation_failed', message, fields },
    HttpStatus.BAD_REQUEST,
  );
}

/**
 * Ensures saleRule matches the product variants tree.
 * Accepts ParsedSaleRule or raw DTO / stored JSON.
 */
export function assertSaleRuleMatchesVariants(
  saleRule:
    | ParsedSaleRule
    | SaleRuleInput
    | Record<string, unknown>
    | null
    | undefined,
  variants: unknown,
): void {
  if (!saleRule) return;

  const resolved = parseSaleRuleStored(saleRule);
  if (!resolved) {
    validationFailed('قاعدة البيع غير صالحة', {
      saleRule: 'شكل غير معروف — تحقق من mode و sizePack / lockedAxis',
    });
  }

  if (resolved.mode === 'locked_axis') {
    const collected = collectAxisOptions(variants, resolved.lockedAxis);
    if (!collected || collected.options.length === 0) {
      validationFailed('قاعدة البيع يجب أن تطابق محاور المنتج', {
        saleRule: `المحور ${resolved.lockedAxis} غير موجود في variants أو بلا خيارات`,
      });
    }
    return;
  }

  const availableSizes = new Set(listSizeNames(variants));
  if (availableSizes.size === 0) {
    validationFailed('قاعدة البيع تتطلب قياسات في variants', {
      saleRule: 'لا توجد قياسات',
    });
  }
  for (const size of resolved.sizePack.sizes) {
    if (!availableSizes.has(size)) {
      validationFailed('قياسات الطقم يجب أن تكون من قياسات المنتج', {
        sizePack: `القياس غير موجود: ${size}`,
      });
    }
  }

  if (resolved.mode === 'color_pair_pack') {
    const colors = new Set(listColorNames(variants));
    if (colors.size < 2) {
      validationFailed('وضع اللونين يتطلب لونين على الأقل', {
        saleRule: 'ألوان غير كافية',
      });
    }
    for (const c of resolved.allowedPairColors) {
      if (!colors.has(c)) {
        validationFailed('ألوان الاقتران يجب أن تكون من ألوان المنتج', {
          allowedPairColors: `لون غير موجود: ${c}`,
        });
      }
    }
  }
}

/**
 * Validate cart variant selection against product saleRule + per-color sizePack.
 */
export function assertCartVariantForSaleMode(
  saleRuleRaw: unknown,
  variants: unknown,
  variant: Record<string, string> | null | undefined,
): void {
  const rule = parseSaleRuleStored(saleRuleRaw);

  if (rule?.mode === 'locked_axis') {
    if (!variant) return;
    if (Object.prototype.hasOwnProperty.call(variant, rule.lockedAxis)) {
      const axisLabel = rule.lockedAxis === 'color' ? 'اللون' : 'القياس';
      validationFailed(`لا يمكن اختيار ${axisLabel} — يُباع كطقم كامل`, {
        variant: `المحور ${rule.lockedAxis} مقفل (طقم كامل)`,
      });
    }
    return;
  }

  if (rule?.mode === 'color_size_pack' || rule?.mode === 'color_pair_pack') {
    if (!variant) {
      validationFailed('يجب اختيار اللون', { variant: 'مطلوب' });
    }
    const color = variant.color?.trim();
    if (!color) {
      validationFailed('يجب اختيار اللون', { color: 'مطلوب' });
    }
    const colors = new Set(listColorNames(variants));
    if (colors.size > 0 && !colors.has(color)) {
      validationFailed('اللون غير موجود في المنتج', { color: 'غير صالح' });
    }
    if (Object.prototype.hasOwnProperty.call(variant, 'size')) {
      validationFailed('القياس محدد من الإدارة — لا يمكن اختياره', {
        size: 'مقفل',
      });
    }
    if (rule.mode === 'color_size_pack') {
      if (variant.pairColor) {
        validationFailed('هذا المنتج لا يدعم لون اقتران', {
          pairColor: 'غير مسموح',
        });
      }
      return;
    }
    const pairColor = variant.pairColor?.trim();
    if (!pairColor) {
      validationFailed('يجب اختيار لون الاقتران', { pairColor: 'مطلوب' });
    }
    if (pairColor === color) {
      validationFailed('لون الاقتران يجب أن يختلف عن اللون الأول', {
        pairColor: 'يجب أن يختلف',
      });
    }
    if (!rule.allowedPairColors.includes(pairColor)) {
      validationFailed('لون الاقتران غير مسموح لهذا المنتج', {
        pairColor: 'غير مسموح',
      });
    }
    if (colors.size > 0 && !colors.has(pairColor)) {
      validationFailed('لون الاقتران غير موجود في المنتج', {
        pairColor: 'غير صالح',
      });
    }
    return;
  }

  // saleRule null — per-color rules on the same product.
  if (!variant) {
    validationFailed('يجب اختيار اللون', { variant: 'مطلوب' });
  }
  const color = variant.color?.trim();
  if (!color) {
    validationFailed('يجب اختيار اللون', { color: 'مطلوب' });
  }
  const colors = new Set(listColorNames(variants));
  if (colors.size > 0 && !colors.has(color)) {
    validationFailed('اللون غير موجود في المنتج', { color: 'غير صالح' });
  }
  if (variant.pairColor) {
    validationFailed('هذا المنتج لا يدعم لون اقتران', {
      pairColor: 'غير مسموح',
    });
  }

  const colorPack = getColorSizePack(variants, color);
  if (colorPack) {
    if (Object.prototype.hasOwnProperty.call(variant, 'size')) {
      validationFailed('القياس محدد من الإدارة لهذا اللون', {
        size: 'مقفل',
      });
    }
    return;
  }

  // Free size pick for this color.
  const size = variant.size?.trim();
  if (!size) {
    validationFailed('يجب اختيار القياس', { size: 'مطلوب' });
  }
}

/** Validate optional sizePack on each color option against product sizes. */
export function assertVariantColorSizePacks(variants: unknown): void {
  if (!variants || typeof variants !== 'object') return;
  const tree = variants as VariantTree;
  const options = Array.isArray(tree.options) ? tree.options : [];
  const availableSizes = new Set(listSizeNames(variants));

  for (const option of options) {
    if (typeof option.name !== 'string' || !option.name.trim()) continue;
    if (option.sizePack === undefined || option.sizePack === null) continue;
    const pack = parseSizePack(option.sizePack);
    if (!pack) {
      validationFailed('طقم قياسات اللون غير صالح', {
        sizePack: `لون ${option.name}`,
      });
    }
    for (const size of pack.sizes) {
      if (availableSizes.size > 0 && !availableSizes.has(size)) {
        validationFailed('قياسات طقم اللون يجب أن تكون من قياسات المنتج', {
          sizePack: `${option.name}: ${size}`,
        });
      }
    }
  }
}

/**
 * @deprecated Use assertCartVariantForSaleMode
 */
export function assertCartVariantAllowsSaleRule(
  saleRuleRaw: unknown,
  variant: Record<string, string> | null | undefined,
): void {
  assertCartVariantForSaleMode(saleRuleRaw, null, variant);
}

function uniquePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}
