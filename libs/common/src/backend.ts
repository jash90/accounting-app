// Backend-only exports that use Node.js-specific features
// These should NOT be imported in browser/frontend code

export { TenantService } from './lib/services/tenant.service';
export { CommonModule } from './lib/common.module';
// Note: EncryptionService should be imported directly from the file where needed
// import { EncryptionService } from '@accounting/common/lib/services/encryption.service';
