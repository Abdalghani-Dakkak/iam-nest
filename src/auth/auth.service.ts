import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { jwtConstants } from './constants';
import { JwtPayload } from './jwt-auth.guard';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email,
    );

    // Same error whether the email is unknown or the password is wrong, so the
    // endpoint doesn't reveal which emails exist.
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    return this.issueTokens(user);
  }

  // Exchanges a valid refresh token for a fresh access + refresh pair.
  // The refresh token is verified against its own secret; we then re-load the
  // user so a deleted/disabled account can't keep minting access tokens.
  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: jwtConstants.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    return this.issueTokens(user);
  }

  // Signs a short-lived access token (module default secret/expiry) and a
  // long-lived refresh token (separate secret/expiry). A fresh payload is built
  // from the user so no stale iat/exp claims leak into the new tokens.
  private async issueTokens(user: {
    id: number;
    email: string;
    username: string;
  }): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
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
