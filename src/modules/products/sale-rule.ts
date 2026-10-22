import { HttpException, HttpStatus } from '@nestjs/common';

export const SALE_RULE_AXES = ['color', 'size'] as const;
export type SaleRuleAxis = (typeof SALE_RULE_AXES)[number];

export type SaleRuleInput = {
  lockedAxis: SaleRuleAxis;
};

/** Public product field for list/detail. */
export type SaleRuleResponse = {
  /** Axis the buyer cannot pick — qty 1 includes every option of this axis. */
  lockedAxis: SaleRuleAxis;
  /** Arabic/display label from the product variants axis. */
  label: string;
  /** Option names included in the set (e.g. three colors). */
  options: string[];
  optionCount: number;
};

type VariantTree = {
  axes?: { key?: unknown; label?: unknown }[];
  options?: {
    name?: unknown;
    children?: { name?: unknown }[];
  }[];
};

export function isSaleRuleAxis(value: unknown): value is SaleRuleAxis {
  return value === 'color' || value === 'size';
}

export function parseSaleRuleStored(raw: unknown): SaleRuleInput | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const lockedAxis = (raw as { lockedAxis?: unknown }).lockedAxis;
  if (!isSaleRuleAxis(lockedAxis)) return null;
  return { lockedAxis };
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

  // Second axis → children across all first-axis options.
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

export function toSaleRuleResponse(
  saleRuleRaw: unknown,
  variants: unknown,
): SaleRuleResponse | null {
  const rule = parseSaleRuleStored(saleRuleRaw);
  if (!rule) return null;

  const collected = collectAxisOptions(variants, rule.lockedAxis);
  if (!collected || collected.options.length === 0) {
    // Orphaned rule (variants removed) — hide from clients.
    return null;
  }

  return {
    lockedAxis: rule.lockedAxis,
    label: collected.label,
    options: collected.options,
    optionCount: collected.options.length,
  };
}

/**
 * Ensures saleRule.lockedAxis exists on the product variants tree.
 * Call when creating/updating with a non-null saleRule.
 */
export function assertSaleRuleMatchesVariants(
  saleRule: SaleRuleInput | null | undefined,
  variants: unknown,
): void {
  if (!saleRule) return;

  const collected = collectAxisOptions(variants, saleRule.lockedAxis);
  if (!collected || collected.options.length === 0) {
    throw new HttpException(
      {
        error: 'validation_failed',
        message: 'قاعدة البيع يجب أن تطابق محاور المنتج',
        fields: {
          saleRule: `المحور ${saleRule.lockedAxis} غير موجود في variants أو بلا خيارات`,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Strip/reject a locked axis from a cart variant selection.
 * Throws if the client sent the locked axis.
 */
export function assertCartVariantAllowsSaleRule(
  saleRuleRaw: unknown,
  variant: Record<string, string> | null | undefined,
): void {
  const rule = parseSaleRuleStored(saleRuleRaw);
  if (!rule || !variant) return;

  if (Object.prototype.hasOwnProperty.call(variant, rule.lockedAxis)) {
    const axisLabel = rule.lockedAxis === 'color' ? 'اللون' : 'القياس';
    throw new HttpException(
      {
        error: 'validation_failed',
        message: `لا يمكن اختيار ${axisLabel} — يُباع كطقم كامل`,
        fields: {
          variant: `المحور ${rule.lockedAxis} مقفل (طقم كامل)`,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
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
