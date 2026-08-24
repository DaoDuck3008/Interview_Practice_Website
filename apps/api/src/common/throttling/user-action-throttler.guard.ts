import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerRequest,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

const DEVELOPMENT_LIMIT_MULTIPLIER = 5;

@Injectable()
export class UserActionThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions()
    options: ThrottlerModuleOptions,
    @InjectThrottlerStorage()
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>) {
    const userId = (req.user as { id?: unknown } | undefined)?.id;
    return typeof userId === 'string' ? userId : super.getTracker(req);
  }

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const isDevelopment = this.config.get<string>('nodeEnv') === 'development';
    const limit = isDevelopment
      ? requestProps.limit * DEVELOPMENT_LIMIT_MULTIPLIER
      : requestProps.limit;

    return super.handleRequest({ ...requestProps, limit });
  }
}
