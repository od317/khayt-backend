import { OrderStatus, UserRole } from '@prisma/client';

type Actor = {
  id: string;
  role: UserRole;
};

type TransitionContext = {
  order: {
    status: OrderStatus;
    storeId: string;
  };
  actor: Actor;
  allLinesPicked: boolean;
};

const INTERNAL_ROLES: readonly UserRole[] = [
  UserRole.super_admin,
  UserRole.admin,
  UserRole.inventory,
  UserRole.delivery,
];

export function isInternal(role: UserRole): boolean {
  return INTERNAL_ROLES.includes(role);
}

/** In-progress orders: not delivered, cancelled, or failed. */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.review,
  OrderStatus.preparing,
  OrderStatus.ready,
  OrderStatus.in_transit,
];

/**
 * R3's transition graph. From a given status, the set of legal next
 * statuses. Cancellation is handled separately because it has its own
 * role and status restrictions.
 */
const LEGAL_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  review: [OrderStatus.preparing, OrderStatus.cancelled],
  preparing: [OrderStatus.ready, OrderStatus.cancelled],
  ready: [OrderStatus.cancelled],
  in_transit: [OrderStatus.delivered, OrderStatus.failed],
  delivered: [],
  cancelled: [],
  failed: [],
};

export function legalNextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return LEGAL_TRANSITIONS[from];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return LEGAL_TRANSITIONS[from].includes(to);
}

/**
 * Who can perform a given transition.
 * Cancellation has its own rules: the store can cancel only from review;
 * internal staff can cancel from review or preparing.
 */
export function canActorTransition(
  ctx: TransitionContext,
  to: OrderStatus,
): boolean {
  const { order, actor, allLinesPicked } = ctx;
  const from = order.status;

  if (!canTransition(from, to)) {
    return false;
  }

  if (to === OrderStatus.cancelled) {
    if (actor.role === UserRole.store) {
      return actor.id === order.storeId && from === OrderStatus.review;
    }
    if (isInternal(actor.role)) {
      return (
        from === OrderStatus.review ||
        from === OrderStatus.preparing ||
        from === OrderStatus.ready
      );
    }
    return false;
  }

  switch (from) {
    case OrderStatus.review:
      return (
        actor.role === UserRole.inventory ||
        actor.role === UserRole.admin ||
        actor.role === UserRole.super_admin
      );

    case OrderStatus.preparing:
      if (!allLinesPicked) return false;
      return (
        actor.role === UserRole.inventory ||
        actor.role === UserRole.admin ||
        actor.role === UserRole.super_admin
      );

    case OrderStatus.ready:
      return false;

    case OrderStatus.in_transit:
      return actor.role === UserRole.delivery || actor.role === UserRole.admin;

    case OrderStatus.delivered:
    case OrderStatus.cancelled:
    case OrderStatus.failed:
      return false;

    default:
      return false;
  }
}

/**
 * For the API response: can this actor cancel the order right now?
 * (Some legal cancellation is just "is there a path to cancelled and
 * does the actor have the right")
 */
export function canActorCancel(ctx: TransitionContext): boolean {
  return canActorTransition(ctx, OrderStatus.cancelled);
}

/**
 * For the API response: can this actor make *any* legal move from the
 * current status? Used for the "next" button on the dashboard.
 */
export function canActorAdvance(ctx: TransitionContext): boolean {
  const nexts = legalNextStatuses(ctx.order.status).filter(
    (s) => s !== OrderStatus.cancelled,
  );
  return nexts.some((s) => canActorTransition(ctx, s));
}
