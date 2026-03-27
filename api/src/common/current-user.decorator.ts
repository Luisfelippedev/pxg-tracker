import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { UserRole } from '../users/user.entity';

export interface AuthUserPayload {
  sub: string;
  email: string;
  role?: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUserPayload }>();
    return request.user;
  },
);
