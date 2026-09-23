/**
 * A supply row is "low stock" when `remaining` is below this value.
 * This is a business decision, not a deployment setting, so it lives
 * in code rather than in .env. The client is not told the threshold;
 * it receives `isLowStock` computed server-side.
 */
export const LOW_STOCK_THRESHOLD = 30;
