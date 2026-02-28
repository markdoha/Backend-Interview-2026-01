import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Controller,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly validApiKey: string;
  private readonly headerName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.validApiKey = this.configService.get<string>('API_KEY', 'default-dev-key');
    this.headerName = this.configService.get<string>('API_KEY_HEADER', 'x-api-key');
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers[this.headerName];

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    if (apiKey !== this.validApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
