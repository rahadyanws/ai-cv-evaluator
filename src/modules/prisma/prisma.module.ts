/**
 * @file prisma.module.ts
 * @description This module provides and globally exports the PrismaService.
 * By making this module global, any other module in the application
 * can inject PrismaService without needing to import PrismaModule.
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * A global module that provides the PrismaService to the entire application.
 * This ensures a single, shared instance of the Prisma client.
 */
@Global() // Makes this module's exported providers available app-wide
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Export PrismaService for dependency injection
})
export class PrismaModule {}
