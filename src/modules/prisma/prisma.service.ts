/**
 * @file prisma.service.ts
 * @description This service manages the Prisma client instance.
 * It connects to the database on module initialization and disconnects
 * on module destruction for graceful shutdown.
 */
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger, // Import NestJS Logger
} from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma/client';

/**
 * A service that extends the PrismaClient.
 * It uses NestJS lifecycle hooks (OnModuleInit, OnModuleDestroy)
 * to manage the database connection state.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  /**
   * NestJS lifecycle hook.
   * Called once the module has been initialized.
   * Connects to the database.
   */
  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Prisma connected to database');
  }

  /**
   * NestJS lifecycle hook.
   * Called once the application is shutting down.
   * Disconnects from the database for graceful shutdown.
   */
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Prisma disconnected from database');
  }
}
