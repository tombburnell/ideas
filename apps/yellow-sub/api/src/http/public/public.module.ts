import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { CatalogModule } from '../../catalog/catalog.module';
import { UsersModule } from '../../users/users.module';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { EntitlementsModule } from '../../entitlements/entitlements.module';

@Module({
  imports: [CatalogModule, UsersModule, SubscriptionsModule, EntitlementsModule],
  controllers: [PublicController],
})
export class PublicModule {}
