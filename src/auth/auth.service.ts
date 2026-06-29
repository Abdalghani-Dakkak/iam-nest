import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LogsService } from '../logs/logs.service';
import { Log } from '../logs/entities/log.entity';
import { SessionsService, SessionMeta } from './sessions.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { jwtConstants } from './constants';
import { JwtPayload } from './jwt-auth.guard';

const LOGIN_PROCEDURE = 'login';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResult extends AuthTokens {
  user: Omit<User, 'password' | 'role'>;
  role: Omit<Role, 'permissions' | 'users'> | null;
  permissions: Permission[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly logsService: LogsService,
    private readonly sessionsService: SessionsService,
  ) {}

  async login(loginDto: LoginDto, meta: SessionMeta = {}): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email,
    );

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      if (user) {
        await this.recordLogin(user, 'failure', 'Invalid password', meta);
      }
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      await this.recordLogin(user, 'failure', 'Account is disabled', meta);
      throw new UnauthorizedException('Account is disabled');
    }

    const expiresAt = new Date(
      Date.now() + jwtConstants.refreshExpiresIn * 1000,
    );
    const session = await this.sessionsService.create(user, expiresAt, meta);

    const permissionEntities = await this.getMyPermissions(user.id);
    const permissionNames = permissionEntities.map((p) => p.name);
    const tokens = await this.issueTokens(
      { ...user, role: user.role ?? null },
      session.id,
      permissionNames,
    );
    await this.recordLogin(user, 'success', null, meta);
    return this.buildAuthResult(user, tokens);
  }

  updateProfile(userId: number, dto: UpdateProfileDto): Promise<User> {
    return this.usersService.update(userId, dto);
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<{ updated: true }> {
    await this.usersService.changePassword(
      userId,
      dto.old_password,
      dto.new_password,
    );
    return { updated: true };
  }

  getLoginLogs(userId: number): Promise<Log[]> {
    return this.logsService.findAll({
      userId,
      procedureType: LOGIN_PROCEDURE,
    });
  }

  private async recordLogin(
    user: User,
    state: 'success' | 'failure',
    description: string | null,
    meta: SessionMeta = {},
  ): Promise<void> {
    try {
      await this.logsService.create({
        userId: user.id,
        procedureType: LOGIN_PROCEDURE,
        state,
        department: user.department ?? undefined,
        description: description ?? undefined,
        ipAddress: meta.ipAddress ?? undefined,
        userAgent: meta.userAgent ?? undefined,
        method: 'POST',
        path: '/auth/login',
      });
    } catch (err) {
      this.logger.error(
        `Failed to record login log for user #${user.id}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  private buildAuthResult(user: User, tokens: AuthTokens): AuthResult {
    const { password, role, ...userInfo } = user;
    const permissions = role?.permissions ?? [];

    let roleInfo: AuthResult['role'] = null;
    if (role) {
      const { permissions: _permissions, users: _users, ...rest } = role;
      roleInfo = rest;
    }

    return {
      user: userInfo,
      role: roleInfo,
      permissions,
      ...tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: jwtConstants.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.sid === undefined) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const session = await this.sessionsService.findLive(
      payload.sid,
      payload.sub,
    );
    if (!session) {
      throw new UnauthorizedException('Session has ended');
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    await this.sessionsService.touch(session);
    const permissionEntities = await this.getMyPermissions(user.id);
    const permissionNames = permissionEntities.map((p) => p.name);
    return this.issueTokens(
      { ...user, role: user.role ?? null },
      session.id,
      permissionNames,
    );
  }

  async getMyPermissions(userId: number): Promise<Permission[]> {
    const user = await this.usersService.findWithPermissions(userId);
    const byId = new Map<number, Permission>();
    for (const permission of user.role?.permissions ?? []) {
      byId.set(permission.id, permission);
    }
    for (const permission of user.directPermissions ?? []) {
      byId.set(permission.id, permission);
    }
    return [...byId.values()];
  }

  async getActiveSessions(userId: number, currentSid?: number) {
    const sessions = await this.sessionsService.findActiveForUser(userId);
    return sessions.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      current: session.id === currentSid,
    }));
  }

  async endSession(
    userId: number,
    sessionId: number,
  ): Promise<{ ended: true; id: number }> {
    await this.sessionsService.end(userId, sessionId);
    return { ended: true, id: sessionId };
  }

  async endAllSessions(
    userId: number,
    exceptSid?: number,
  ): Promise<{ ended: true; count: number }> {
    const count = await this.sessionsService.endAll(userId, exceptSid);
    return { ended: true, count };
  }

  private async issueTokens(
    user: {
      id: number;
      email: string;
      username: string;
      role?: { name: string } | null;
    },
    sid: number,
    permissions: string[] = [],
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      sid,
      permissions,
      roleName: user.role?.name,
    };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: jwtConstants.refreshSecret,
        expiresIn: jwtConstants.refreshExpiresIn,
      }),
    ]);

    return { access_token, refresh_token };
  }
}
