import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { AppConfiguration } from '../config/configuration';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../providers/billing/billing.module';
import { ResyncProcessor } from './resync.processor';

@Module({
  imports: [
    PrismaModule,
    BillingModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfiguration, true>) => ({
        connection: { url: config.get('redisUrl', { infer: true }) },
      }),
    }),
    BullModule.registerQueue({ name: 'billing' }),
  ],
  providers: [ResyncProcessor],
})
export class JobsModule {}
