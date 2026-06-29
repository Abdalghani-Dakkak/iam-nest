import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { Permission } from '../permissions/entities/permission.entity';
import { Role } from '../roles/entities/role.entity';
import { System } from '../systems/entities/system.entity';

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

const ROLES: RoleDef[] = [
  {
    name: 'security_officer',
    arabicName: 'مسؤول الأمن السيبراني',
    description: 'Audit log access, role matrix editing',
    permissions: [
      'roles:view',
      'roles:edit',
      'permissions:grant',
      'permissions:revoke',
      'audit:view',
      'audit:export',
      'self:update_profile',
    ],
  },
];

@Injectable()
export class IamRolesSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IamRolesSeedService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
    @InjectRepository(System)
    private readonly systems: Repository<System>,
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

    const SYSTEM_ROLE_NAMES = ['admin', 'security_officer', 'complaints.admin'];
    const { affected } = await this.roles.update(
      { name: In(SYSTEM_ROLE_NAMES), isSystem: false },
      { isSystem: true },
    );
    if (affected) this.logger.log(`Marked ${affected} role(s) as isSystem=true`);

    let complaintsSystem = await this.systems.findOne({
      where: { name: 'complaints' },
    });
    if (!complaintsSystem) {
      complaintsSystem = await this.systems.save(
        this.systems.create({
          name: 'complaints',
          arabicName: 'نظام الشكاوى والطلبات',
          description: 'External complaints & requests system',
        }),
      );
      this.logger.log('Created system: complaints');
    }

    const complaintsRoles = await this.roles.find({
      where: { name: Like('complaints.%') },
      relations: { system: true },
    });
    const toLink = complaintsRoles.filter((r) => r.system == null);
    if (toLink.length) {
      await this.roles.save(
        toLink.map((r) => ({ ...r, system: complaintsSystem })),
      );
      this.logger.log(
        `Linked ${toLink.length} complaints.* role(s) to system "complaints"`,
      );
    }
  }
}
