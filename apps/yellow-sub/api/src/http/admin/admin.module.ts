import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [CryptoModule, AuthModule],
  controllers: [AdminController],
})
export class AdminModule {}
