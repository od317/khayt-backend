/** Person placeholder — users / marketers when avatar is missing. */
export const DEFAULT_AVATAR_IMAGE_URL =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbksj9NS4J0zAJN5LEwzN6i0tV5dtgZmR89UzhDAK7CYCIsFvpajnCeHvl&s=10';

/** Building placeholder — stores, workshops, institutes, shipping companies. */
export const DEFAULT_BUSINESS_IMAGE_URL =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKFSey5bgsBA3-2Z7f27pym50-ySDrxPZWoIJ1bOCQ9pQVdvEun88f-iPX&s=10';

/** @deprecated Use DEFAULT_AVATAR_IMAGE_URL or DEFAULT_BUSINESS_IMAGE_URL. */
export const DEFAULT_DIRECTORY_IMAGE_URL = DEFAULT_AVATAR_IMAGE_URL;

export function withDefaultImage(
  url: string | null | undefined,
  fallback: string = DEFAULT_AVATAR_IMAGE_URL,
): string {
  return url?.trim() ? url : fallback;
}

export function withDefaultAvatar(
  url: string | null | undefined,
): string {
  return withDefaultImage(url, DEFAULT_AVATAR_IMAGE_URL);
}

export function withDefaultBusinessImage(
  url: string | null | undefined,
): string {
  return withDefaultImage(url, DEFAULT_BUSINESS_IMAGE_URL);
}
