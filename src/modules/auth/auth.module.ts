/**
 * @file auth.module.ts
 * @description Module for authentication-related providers, like guards.
 * It imports ConfigModule because the guard depends on ConfigService.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyAuthGuard } from './api-key.guard';

@Module({
  imports: [ConfigModule], // Guard needs ConfigService, and ConfigModule is global
  providers: [ApiKeyAuthGuard],
  exports: [ApiKeyAuthGuard],
})
export class AuthModule {}
