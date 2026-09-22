import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../types/auth';

type RequestWithUserAndParams = {
  user?: AuthenticatedUser;
  params: Record<string, string | undefined>;
};

@Injectable()
export class BusinessOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithUserAndParams>();

    const businessId = request.params.id;
    const user = request.user;

    if (!businessId || !user) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Not the owner of this business',
      });
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Business not found',
      });
    }

    if (business.ownerId !== user.id) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Not the owner of this business',
      });
    }

    return true;
  }
}
