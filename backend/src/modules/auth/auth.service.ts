import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const staff = await this.prisma.staff.findUnique({
      where: { email: loginDto.email.toLowerCase() },
    });

    if (!staff) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!staff.active) {
      throw new UnauthorizedException('This staff account has been deactivated');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, staff.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(staff.id, staff.email, staff.role);

    return {
      ...tokens,
      user: {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
      },
    };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const staff = await this.prisma.staff.findUnique({
        where: { id: payload.sub },
      });

      if (!staff || !staff.active) {
        throw new UnauthorizedException('Invalid refresh token or inactive account');
      }

      return await this.generateTokens(staff.id, staff.email, staff.role);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: userId },
    });

    if (!staff) {
      throw new NotFoundException('Staff account not found');
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, staff.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password does not match');
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.staff.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Password updated successfully' };
  }

  async getProfile(userId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('User profile not found');
    }

    return staff;
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn') || '15m';
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
    };
  }
}
