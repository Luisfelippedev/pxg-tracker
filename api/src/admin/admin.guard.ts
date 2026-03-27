import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUserPayload } from '../common/current-user.decorator';
import { User } from '../users/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthUserPayload }>();
    const role = request.user?.role;

    if (role === 'admin') return true;

    // Fallback: tokens antigos podem não trazer claim `role`.
    if (role === undefined || role === null) {
      const user = await this.userRepository.findOne({
        where: { id: request.user?.sub },
      });
      if (user?.role === 'admin') return true;
      throw new ForbiddenException('Acesso de admin necessário');
    }

    throw new ForbiddenException('Acesso de admin necessário');
  }
}

