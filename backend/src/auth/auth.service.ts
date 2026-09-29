import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './auth.types';
import { LoginDto, LoginResponseDto, UserProfileDto } from './dto/auth.dto';

// Compared against when the email is unknown, so response time doesn't reveal
// which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('timing-attack-mitigation', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login({ email, password }: LoginDto): Promise<LoginResponseDto> {
    const user = await this.users.findByEmail(email);
    const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.config.getOrThrow<number>('JWT_EXPIRES_IN'),
    };
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      createdAt: user.createdAt,
    };
  }
}
