export function postFilePublicPath(file: Express.Multer.File): string {
  return `/uploads/posts/${file.filename}`;
}

export function postImagePaths(files: Express.Multer.File[]): string[] {
  return files
    .filter((file) => file.fieldname === 'images')
    .slice(0, 8)
    .map(postFilePublicPath);
}

export function postVideoPath(
  files: Express.Multer.File[],
): string | undefined {
  const video = files.find((file) => file.fieldname === 'video');
  return video ? postFilePublicPath(video) : undefined;
}
