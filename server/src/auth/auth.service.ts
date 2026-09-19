import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(dto: SignUpDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้วในระบบ');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        name: dto.name,
        avatarUrl: dto.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const tokenPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(tokenPayload);

    return {
      message: 'สมัครสมาชิกสำเร็จ',
      user,
      accessToken,
    };
  }

  async signIn(dto: SignInDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const tokenPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(tokenPayload);

    return {
      message: 'เข้าสู่ระบบสำเร็จ',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      accessToken,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new NotFoundException('ไม่พบบัญชีผู้ใช้งานที่ใช้อีเมลนี้');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 นาที

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    return {
      message: 'สร้างรหัสโทเค็นสำหรับรีเซ็ตรหัสผ่านสำเร็จ (มีอายุ 15 นาที)',
      token: resetToken,
      expiresAt: resetExpires,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('โทเค็นไม่ถูกต้องหรือหมดอายุการใช้งานแล้ว กรุณาขอใหม่อีกครั้ง');
    }

    const newHashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return {
      message: 'รีเซ็ตรหัสผ่านสำเร็จ สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที',
    };
  }
}
