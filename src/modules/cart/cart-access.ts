import { ForbiddenException } from '@nestjs/common';
import { ORDERING_ROLES } from '../auth/auth.mapper';
import { AuthenticatedUser } from '../../common/types/auth';

/**
 * Cart / checkout are for store and workshop accounts that order warehouse stock.
 */
export function assertCanOrder(actor: AuthenticatedUser): void {
  if (!(ORDERING_ROLES as readonly string[]).includes(actor.role)) {
    throw new ForbiddenException({
      error: 'forbidden',
      message: 'Cart is available for store and workshop accounts only',
    });
  }
}

/** @deprecated Use assertCanOrder — kept as alias for existing call sites. */
export const assertStore = assertCanOrder;
