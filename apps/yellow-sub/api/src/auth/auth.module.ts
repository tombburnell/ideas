import { Global, Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { FirebaseAdminService } from './firebase-admin.service';

@Global()
@Module({
  providers: [ApiKeyService, FirebaseAdminService],
  exports: [ApiKeyService, FirebaseAdminService],
})
export class AuthModule {}
