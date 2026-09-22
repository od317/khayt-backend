export function durationToSeconds(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  if (!match || match[1] === undefined || match[2] === undefined) {
    throw new Error(
      `Invalid duration "${value}". Use a value like 15m, 30d, or 3600s.`,
    );
  }

  const amount = Number(match[1]);
  switch (match[2]) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 3600;
    case 'd':
      return amount * 86400;
    default:
      throw new Error(`Invalid duration unit in "${value}".`);
  }
}
