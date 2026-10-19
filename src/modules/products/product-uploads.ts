import { BadRequestException } from '@nestjs/common';

/** Primary / extra color images: variant_0, variant_0_img_1, variant_0_img_2 */
const VARIANT_IMG_FIELD = /^variant_(\d+)(?:_img_(\d+))?$/;
/** Size child under a color: variant_0_child_1 */
const VARIANT_CHILD_FIELD = /^variant_(\d+)_child_(\d+)$/;

export function filePublicPath(file: Express.Multer.File): string {
  return `/uploads/products/${file.filename}`;
}

export function galleryFiles(files: Express.Multer.File[]): Express.Multer.File[] {
  return files.filter((file) => file.fieldname === 'images');
}

export function galleryPaths(files: Express.Multer.File[]): string[] {
  return galleryFiles(files)
    .slice(0, 8)
    .map(filePublicPath);
}

export type VariantChild = { name: string; image?: string; hex?: string };
export type VariantOption = {
  name: string;
  image?: string;
  images?: string[];
  hex?: string;
  children?: VariantChild[];
};
export type VariantTree = {
  axes: { key: string; label: string }[];
  options: VariantOption[];
};

function storedOptions(previous: unknown): VariantOption[] {
  if (!previous || typeof previous !== 'object' || !('options' in previous)) {
    return [];
  }
  const options = (previous as VariantTree).options;
  return Array.isArray(options) ? options : [];
}

function collectOptionImages(
  optionIndex: number,
  byField: Map<string, Express.Multer.File>,
  stored: VariantOption | undefined,
): string[] {
  const uploaded: { index: number; path: string }[] = [];

  for (const [field, file] of byField.entries()) {
    const match = VARIANT_IMG_FIELD.exec(field);
    if (!match || Number(match[1]) !== optionIndex) continue;
    const imgIndex = match[2] === undefined ? 0 : Number(match[2]);
    uploaded.push({ index: imgIndex, path: filePublicPath(file) });
  }

  if (uploaded.length > 0) {
    uploaded.sort((a, b) => a.index - b.index);
    return uploaded.map((row) => row.path);
  }

  if (stored?.images && stored.images.length > 0) {
    return stored.images.filter((url) => typeof url === 'string' && url.trim());
  }

  if (stored?.image?.trim()) {
    return [stored.image.trim()];
  }

  return [];
}

export function applyVariantImageFiles(
  variants: VariantTree | undefined,
  files: Express.Multer.File[],
  previous?: unknown,
): VariantTree | undefined {
  if (!variants) {
    return variants;
  }

  const byField = new Map<string, Express.Multer.File>();
  for (const file of files) {
    if (
      VARIANT_IMG_FIELD.test(file.fieldname) ||
      VARIANT_CHILD_FIELD.test(file.fieldname)
    ) {
      byField.set(file.fieldname, file);
    }
  }

  const previousOptions = storedOptions(previous);

  const options = variants.options.map((option, optionIndex) => {
    const stored = previousOptions[optionIndex];
    const images = collectOptionImages(optionIndex, byField, stored);
    const image = images[0] ?? '';

    const children = option.children?.map((child, childIndex) => {
      const childFile = byField.get(
        `variant_${optionIndex}_child_${childIndex}`,
      );
      const childImage = childFile
        ? filePublicPath(childFile)
        : stored?.children?.[childIndex]?.image?.trim() || image;
      return { ...child, image: childImage };
    });

    return { ...option, image, images, children };
  });

  const merged: VariantTree = { ...variants, options };

  for (const [index, option] of merged.options.entries()) {
    if (!option.image || !option.images?.length) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'كل خيار متغير يحتاج صورة واحدة على الأقل',
        fields: { [`variants.options.${index}.image`]: 'مطلوب' },
      });
    }
    for (const [childIndex, child] of (option.children ?? []).entries()) {
      if (!child.image) {
        throw new BadRequestException({
          error: 'validation_failed',
          message: 'كل مقاس يحتاج صورة مرفوعة',
          fields: {
            [`variants.options.${index}.children.${childIndex}.image`]:
              'required',
          },
        });
      }
    }
  }

  return merged;
}
