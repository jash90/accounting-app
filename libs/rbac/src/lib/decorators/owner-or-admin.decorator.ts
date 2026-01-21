import { SetMetadata } from '@nestjs/common';

export const OWNER_OR_ADMIN_KEY = 'ownerOrAdmin';
export const OwnerOrAdmin = () => SetMetadata(OWNER_OR_ADMIN_KEY, true);
