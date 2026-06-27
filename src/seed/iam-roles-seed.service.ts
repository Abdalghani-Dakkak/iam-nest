import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../permissions/entities/permission.entity';
import { Role } from '../roles/entities/role.entity';

// [name, arabic label] — must match the frontend's exact permission strings.
const PERMISSIONS: Array<[string, string]> = [
  ['users:view', 'عرض المستخدمين'],
  ['users:create', 'إنشاء مستخدم'],
  ['users:edit', 'تعديل مستخدم'],
  ['users:suspend', 'تعليق/تفعيل حساب'],
  ['users:delete', 'حذف مستخدم / إنهاء الخدمة'],
  ['users:export', 'تصدير بيانات المستخدمين'],
  ['roles:view', 'عرض الأدوار'],
  ['roles:edit', 'تعديل الأدوار'],
  ['permissions:grant', 'منح صلاحية'],
  ['permissions:revoke', 'سحب صلاحية'],
  ['orgs:view', 'عرض الهيكل التنظيمي'],
  ['orgs:manage', 'إدارة الهيكل التنظيمي'],
  ['audit:view', 'عرض سجل التدقيق'],
  ['audit:export', 'تصدير سجل التدقيق'],
  ['workflows:view', 'عرض طلبات الموافقة'],
  ['workflows:approve', 'الموافقة على الطلبات'],
  ['workflows:reject', 'رفض الطلبات'],
  ['contractors:view', 'عرض المتعاقدين'],
  ['contractors:manage', 'إدارة المتعاقدين'],
  ['contractors:extend', 'تمديد عقد المتعاقد'],
  ['self:request_access', 'طلب صلاحية جديدة'],
  ['self:request_extension', 'طلب تمديد العقد'],
  ['self:update_profile', 'تعديل الملف الشخصي'],
  ['settings:view', 'عرض الإعدادات'],
  ['settings:manage', 'إدارة الإعدادات'],
  ['*', 'كل الصلاحيات (مالك النظام)'],
];

interface RoleDef {
  name: string;
  arabicName: string;
  description: string;
  isSystem?: boolean;
  permissions: string[];
}

// Default role -> permission matrix (from ROLES_AND_PERMISSIONS.md).
const ROLES: RoleDef[] = [
  {
    name: 'system_owner',
    arabicName: 'مالك النظام',
    description: 'Full superuser — has * permission, bypasses all checks',
    isSystem: true,
    permissions: ['*'],
  },
  {
    name: 'it_admin',
    arabicName: 'مسؤول تقنية المعلومات',
    description: 'Manages users, roles, system settings',
    permissions: [
      'users:view', 'users:create', 'users:edit', 'users:suspend',
      'users:delete', 'users:export', 'roles:view', 'roles:edit',
      'permissions:grant', 'permissions:revoke', 'orgs:view', 'orgs:manage',
      'workflows:view', 'workflows:approve', 'workflows:reject',
      'contractors:view', 'contractors:manage', 'contractors:extend',
      'self:update_profile', 'settings:view', 'settings:manage',
    ],
  },
  {
    name: 'security_officer',
    arabicName: 'مسؤول الأمن السيبراني',
    description: 'Audit log access, role matrix editing',
    permissions: [
      'roles:view', 'roles:edit', 'permissions:grant', 'permissions:revoke',
      'audit:view', 'audit:export', 'self:update_profile',
    ],
  },
  {
    name: 'internal_auditor',
    arabicName: 'المدقق الداخلي',
    description: 'Read-only audit log access',
    permissions: ['audit:view', 'audit:export', 'self:update_profile'],
  },
  {
    name: 'senior_manager',
    arabicName: 'المدير الأعلى',
    description: 'Approves workflows, views users and org',
    permissions: [
      'users:view', 'orgs:view', 'workflows:view', 'workflows:approve',
      'workflows:reject', 'self:request_access', 'self:update_profile',
    ],
  },
  {
    name: 'department_manager',
    arabicName: 'مدير القسم',
    description: 'Approves workflows, views org, self-service',
    permissions: [
      'orgs:view', 'workflows:view', 'workflows:approve', 'workflows:reject',
      'self:request_access', 'self:update_profile',
    ],
  },
  {
    name: 'hr_employee',
    arabicName: 'موظف الموارد البشرية',
    description: 'Manages users and contractors',
    permissions: [
      'users:view', 'users:create', 'users:edit', 'users:export', 'orgs:view',
      'contractors:view', 'contractors:manage', 'contractors:extend',
      'self:request_access', 'self:update_profile',
    ],
  },
  {
    name: 'regular_employee',
    arabicName: 'موظف عادي',
    description: 'Self-service only',
    permissions: ['self:request_access', 'self:update_profile'],
  },
  {
    name: 'contractor',
    arabicName: 'متعاقد مؤقت',
    description: 'Self-service + contract extension only',
    permissions: [
      'self:request_access', 'self:request_extension', 'self:update_profile',
    ],
  },
];

/**
 * Seeds the government roles & permissions on boot (idempotent). Creates any
 * missing permission and any missing role (with its default matrix). Existing
 * roles are left untouched so admin edits via the UI are never overwritten.
 */
@Injectable()
export class IamRolesSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IamRolesSeedService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.seed();
    } catch (err) {
      this.logger.error(
        'IAM roles/permissions seed failed',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  private async seed(): Promise<void> {
    // 1. Ensure every permission exists.
    const byName = new Map<string, Permission>();
    let createdPerms = 0;
    for (const [name, label] of PERMISSIONS) {
      let perm = await this.permissions.findOne({ where: { name } });
      if (!perm) {
        perm = await this.permissions.save(
          this.permissions.create({ name, label }),
        );
        createdPerms++;
      }
      byName.set(name, perm);
    }
    if (createdPerms) this.logger.log(`Created ${createdPerms} permission(s)`);

    // 2. Ensure every role exists (with its default matrix). Don't touch
    //    roles that already exist — admins may have customized them.
    let createdRoles = 0;
    for (const def of ROLES) {
      const existing = await this.roles.findOne({ where: { name: def.name } });
      if (existing) continue;
      const role = this.roles.create({
        name: def.name,
        arabicName: def.arabicName,
        description: def.description,
        isSystem: def.isSystem ?? false,
      });
      role.permissions = def.permissions
        .map((n) => byName.get(n))
        .filter((p): p is Permission => Boolean(p));
      await this.roles.save(role);
      createdRoles++;
      this.logger.log(
        `Created role ${def.name} with ${role.permissions.length} permissions`,
      );
    }
    if (!createdRoles) this.logger.log('IAM roles already present');
  }
}
