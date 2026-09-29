import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: { findByEmail: jest.Mock; findById: jest.Mock };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };

  const user: User = {
    id: 'user-1',
    email: 'reviewer@simpleinvoice.dev',
    passwordHash: bcrypt.hashSync('Password123!', 4),
    fullname: 'Reviewer',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    users = { findByEmail: jest.fn(), findById: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { getOrThrow: () => 3600 } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('returns a bearer token for valid credentials', async () => {
    users.findByEmail.mockResolvedValue(user);
    await expect(service.login({ email: user.email, password: 'Password123!' })).resolves.toEqual({
      accessToken: 'signed.jwt.token',
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: user.id, email: user.email });
  });

  it('rejects a wrong password', async () => {
    users.findByEmail.mockResolvedValue(user);
    await expect(service.login({ email: user.email, password: 'wrong' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an unknown email with the same error as a wrong password', async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(
      service.login({ email: 'nobody@example.com', password: 'Password123!' }),
    ).rejects.toThrow('Invalid email or password');
  });

  it('returns the profile without the password hash', async () => {
    users.findById.mockResolvedValue(user);
    const profile = await service.getProfile(user.id);
    expect(profile).toEqual({
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      createdAt: user.createdAt,
    });
    expect(profile).not.toHaveProperty('passwordHash');
  });
});
