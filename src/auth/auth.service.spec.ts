import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: { findByEmailWithPassword: jest.Mock; findOne: jest.Mock };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };

  beforeEach(async () => {
    users = { findByEmailWithPassword: jest.fn(), findOne: jest.fn() };
    jwt = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access.jwt.token')
        .mockResolvedValueOnce('refresh.jwt.token'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns an access + refresh token for valid credentials', async () => {
    const password = 'password123';
    users.findByEmailWithPassword.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      username: 'alice',
      isActive: true,
      password: await bcrypt.hash(password, 10),
    });

    const result = await service.login({ email: 'a@b.com', password });

    expect(result).toEqual({
      access_token: 'access.jwt.token',
      refresh_token: 'refresh.jwt.token',
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 1,
      email: 'a@b.com',
      username: 'alice',
    });
  });

  it('throws Unauthorized for an unknown email', async () => {
    users.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nobody@b.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws Unauthorized for a wrong password', async () => {
    users.findByEmailWithPassword.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      username: 'alice',
      isActive: true,
      password: await bcrypt.hash('correct-password', 10),
    });

    await expect(
      service.login({ email: 'a@b.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws Unauthorized for a disabled account', async () => {
    const password = 'password123';
    users.findByEmailWithPassword.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      username: 'alice',
      isActive: false,
      password: await bcrypt.hash(password, 10),
    });

    await expect(
      service.login({ email: 'a@b.com', password }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('issues a new token pair from a valid refresh token', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: 1,
      email: 'a@b.com',
      username: 'alice',
    });
    users.findOne.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      username: 'alice',
      isActive: true,
    });

    const result = await service.refresh('some.refresh.token');

    expect(result).toEqual({
      access_token: 'access.jwt.token',
      refresh_token: 'refresh.jwt.token',
    });
    expect(users.findOne).toHaveBeenCalledWith(1);
  });

  it('throws Unauthorized for an invalid/expired refresh token', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(service.refresh('bad.token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(users.findOne).not.toHaveBeenCalled();
  });

  it('throws Unauthorized when refreshing a disabled account', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: 1,
      email: 'a@b.com',
      username: 'alice',
    });
    users.findOne.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      username: 'alice',
      isActive: false,
    });

    await expect(service.refresh('some.refresh.token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
