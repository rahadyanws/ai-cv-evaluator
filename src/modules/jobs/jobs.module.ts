import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { JobsService } from './jobs.service';

@Module({
  imports: [PrismaModule], // Butuh PrismaService
  providers: [JobsService],
  exports: [JobsService], // Ekspor agar bisa dipakai EvaluateModule
})
export class JobsModule {}
