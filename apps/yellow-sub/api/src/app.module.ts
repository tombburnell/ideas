import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './providers/billing/billing.module';
import { PublicModule } from './http/public/public.module';
import { AdminModule } from './http/admin/admin.module';
import { WebhooksHttpModule } from './http/webhooks/webhooks-http.module';
import { HealthController } from './health/health.controller';
import { JobsModule } from './jobs/jobs.module';

const disableWorkers = process.env.DISABLE_WORKERS === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    CryptoModule,
    AuthModule,
    BillingModule,
    PublicModule,
    AdminModule,
    WebhooksHttpModule,
    ...(disableWorkers ? [] : [JobsModule]),
  ],
  controllers: [HealthController],
})
export class AppModule {}
