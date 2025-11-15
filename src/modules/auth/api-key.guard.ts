/**
 * @file api-key.guard.ts
 * @description A NestJS Guard to protect endpoints using a static API key.
 * It reads the secret key from .env and compares it to the 'x-api-key' header.
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
// Import from the global constants barrel file (as you configured)
import { API_KEY_HEADER } from '@/constants';

/**
 * A global guard (provided in AppModule) that protects all endpoints.
 * It ensures that every incoming request has a valid 'x-api-key' header.
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);
  // This holds the master API key loaded from the environment.
  private readonly secretApiKey: string;

  /**
   * Reads the master API key from the environment variables via ConfigService.
   * Throws an error on startup if the key is not configured.
   * @param configService The injected ConfigService.
   */
  constructor(private readonly configService: ConfigService) {
    // Get the key. Its type is (string | undefined).
    const keyFromEnv = this.configService.get<string>('SECRET_API_KEY');

    // This check acts as a type guard and a fail-fast mechanism.
    if (!keyFromEnv) {
      this.logger.error('SECRET_API_KEY is not configured!');
      throw new Error('Missing SECRET_API_KEY configuration.');
    }

    // After the 'if' block, TypeScript knows 'keyFromEnv'
    // is definitely a 'string' and can be safely assigned.
    this.secretApiKey = keyFromEnv;
  }

  /**
   * This method is called by NestJS for every request to a guarded endpoint.
   * @param context The execution context of the incoming request.
   * @returns {boolean} True if the request is allowed, otherwise throws UnauthorizedException.
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedApiKey = request.headers[API_KEY_HEADER];

    // Validate the provided key against the master key.
    const isValid = providedApiKey === this.secretApiKey;

    if (!isValid) {
      this.logger.warn(
        `Unauthorized access attempt: Missing or invalid API key.`,
      );
      // Block the request
      throw new UnauthorizedException('Missing or invalid API key');
    }

    // Allow the request
    return true;
  }
}
