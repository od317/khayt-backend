import { BadRequestException } from '@nestjs/common';

const VARIANT_FIELD = /^variant_(\d+)(?:_child_(\d+))?$/;

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

type VariantChild = { name: string; image?: string; hex?: string };
type VariantOption = {
  name: string;
  image?: string;
  hex?: string;
  children?: VariantChild[];
};
type VariantTree = {
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
    if (VARIANT_FIELD.test(file.fieldname)) {
      byField.set(file.fieldname, file);
    }
  }

  const previousOptions = storedOptions(previous);

  const options = variants.options.map((option, optionIndex) => {
    const optionFile = byField.get(`variant_${optionIndex}`);
    const stored = previousOptions[optionIndex];
    const image = optionFile
      ? filePublicPath(optionFile)
      : stored?.image?.trim() || '';

    const children = option.children?.map((child, childIndex) => {
      const childFile = byField.get(`variant_${optionIndex}_child_${childIndex}`);
      const childImage = childFile
        ? filePublicPath(childFile)
        : stored?.children?.[childIndex]?.image?.trim() || image;
      return { ...child, image: childImage };
    });

    return { ...option, image, children };
  });

  const merged: VariantTree = { ...variants, options };

  for (const [index, option] of merged.options.entries()) {
    if (!option.image) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Each variant option needs an uploaded image',
        fields: { [`variants.options.${index}.image`]: 'required' },
      });
    }
    for (const [childIndex, child] of (option.children ?? []).entries()) {
      if (!child.image) {
        throw new BadRequestException({
          error: 'validation_failed',
          message: 'Each variant size needs an uploaded image',
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
