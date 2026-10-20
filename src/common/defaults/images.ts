/** Shown when a directory entity has no custom image. */
export const DEFAULT_DIRECTORY_IMAGE_URL =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbksj9NS4J0zAJN5LEwzN6i0tV5dtgZmR89UzhDAK7CYCIsFvpajnCeHvl&s=10';

export function withDefaultImage(
  url: string | null | undefined,
): string {
  return url?.trim() ? url : DEFAULT_DIRECTORY_IMAGE_URL;
}
