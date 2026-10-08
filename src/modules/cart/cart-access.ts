import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/auth';

/**
 * Cart endpoints are store-only. Everyone else gets a 403.
 * Put this check at the top of every cart service method.
 */
export function assertStore(actor: AuthenticatedUser): void {
    if (actor.role !== UserRole.store) {
        throw new ForbiddenException({
            error: 'forbidden',
            message: 'Cart is available for store accounts only',
        });
    }
}