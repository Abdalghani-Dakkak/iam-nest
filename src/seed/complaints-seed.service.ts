import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../permissions/entities/permission.entity';
import { Role } from '../roles/entities/role.entity';

const ROLE_NAME = 'complaints.admin';

// Every permission the complaints system enforces.
const COMPLAINTS_PERMISSIONS: Array<{
  name: string;
  label: string;
  description: string;
}> = [
  {
    name: 'complaints.categories.create',
    label: 'Create categories',
    description: 'Create a complaints category',
  },
  {
    name: 'complaints.categories.update',
    label: 'Update categories',
    description: 'Update a complaints category',
  },
  {
    name: 'complaints.categories.delete',
    label: 'Delete categories',
    description: 'Delete a complaints category',
  },
  {
    name: 'complaints.requests.view_all',
    label: 'View all requests',
    description: 'See every request/complaint',
  },
  {
    name: 'complaints.requests.respond',
    label: 'Respond to requests',
    description: 'Reply + change status (emails the citizen)',
  },
  {
    name: 'complaints.requests.delete',
    label: 'Delete requests',
    description: 'Delete a request',
  },
];

/**
 * Runs on every boot. Idempotently guarantees the complaints permissions exist
 * and stay attached to the `complaints.admin` role (marked isSystem). Additive:
 * it only creates what's missing and re-attaches dropped permissions — it never
 * removes anything — so the assignment is permanent / self-healing.
 */
@Injectable()
export class ComplaintsSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ComplaintsSeedService.name);

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
        'Complaints permission seed failed',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  private async seed(): Promise<void> {
    // 1. Ensure every complaints permission exists (create the missing ones).
    const ensured: Permission[] = [];
    for (const def of COMPLAINTS_PERMISSIONS) {
      let permission = await this.permissions.findOne({
        where: { name: def.name },
      });
      if (!permission) {
        permission = await this.permissions.save(this.permissions.create(def));
        this.logger.log(`Created permission ${def.name}`);
      }
      ensured.push(permission);
    }

    // 2. Ensure the complaints.admin role exists (system role).
    let role = await this.roles.findOne({
      where: { name: ROLE_NAME },
      relations: { permissions: true },
    });

    if (!role) {
      role = this.roles.create({
        name: ROLE_NAME,
        arabicName: 'مدير الشكاوى',
        label: 'Complaints Admin',
        description: 'Staff who manage the complaints system',
        isSystem: true,
      });
      role.permissions = ensured;
      await this.roles.save(role);
      this.logger.log(
        `Created role ${ROLE_NAME} with ${ensured.length} permissions`,
      );
      return;
    }

    // 3. Role exists — make sure it's a system role and that all complaints
    //    permissions are attached (re-attach any that were removed). Additive.
    const attached = new Set((role.permissions ?? []).map((p) => p.id));
    const missing = ensured.filter((p) => !attached.has(p.id));
    let changed = false;

    if (!role.isSystem) {
      role.isSystem = true;
      changed = true;
    }
    if (missing.length > 0) {
      role.permissions = [...(role.permissions ?? []), ...missing];
      changed = true;
      this.logger.log(
        `Re-attached ${missing.length} permission(s) to ${ROLE_NAME}`,
      );
    }
    if (changed) {
      await this.roles.save(role);
    }
  }
}
