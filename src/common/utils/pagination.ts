export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export function skipTake(
  page: number,
  limit: number,
): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): Paginated<T> {
  return { items, total, page, limit };
}
