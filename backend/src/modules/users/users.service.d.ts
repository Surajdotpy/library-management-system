import type { AdminUser, CreateAdminDTO } from './users.types.js';
export declare function listAdmins(branchId?: number): Promise<AdminUser[]>;
export declare function createAdmin(data: CreateAdminDTO): Promise<AdminUser>;
//# sourceMappingURL=users.service.d.ts.map