import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, AuthResult, AuthTokens } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from './public.decorator';
import type { JwtPayload } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<AuthResult> {
    return this.authService.login(loginDto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refresh(refreshTokenDto.refresh_token);
  }

  @Get('profile')
  getProfile(@Req() req: Request & { user: JwtPayload }): JwtPayload {
    return req.user;
  }

  @Patch('profile')
  updateProfile(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  @Patch('password')
  changePassword(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.sub, dto);
  }

  @Get('permissions')
  getMyPermissions(@Req() req: Request & { user: JwtPayload }) {
    return this.authService.getMyPermissions(req.user.sub);
  }

  @Get('login-logs')
  getLoginLogs(@Req() req: Request & { user: JwtPayload }) {
    return this.authService.getLoginLogs(req.user.sub);
  }

  @Get('sessions')
  getSessions(@Req() req: Request & { user: JwtPayload }) {
    return this.authService.getActiveSessions(req.user.sub, req.user.sid);
  }

  @Delete('sessions')
  endAllSessions(
    @Req() req: Request & { user: JwtPayload },
    @Query('keepCurrent') keepCurrent?: string,
  ) {
    const exceptSid = keepCurrent === 'true' ? req.user.sid : undefined;
    return this.authService.endAllSessions(req.user.sub, exceptSid);
  }

  @Delete('sessions/:id')
  endSession(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
  ) {
    return this.authService.endSession(req.user.sub, +id);
  }
}
