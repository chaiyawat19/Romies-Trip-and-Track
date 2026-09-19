import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTripDto } from './dto/create-trip.dto';
import { JoinTripDto } from './dto/join-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripsService } from './trips.service';

const multerConfig = {
  storage: diskStorage({
    destination: './uploads/trips',
    filename: (req, file, callback) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = extname(file.originalname).toLowerCase();
      callback(null, `trip-${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // กำหนดขนาดสูงสุด 5MB
  },
  fileFilter: (req: any, file: Express.Multer.File, callback: any) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/)) {
      return callback(
        new BadRequestException('รองรับเฉพาะไฟล์รูปภาพ (jpg, jpeg, png, webp, gif) เท่านั้น'),
        false,
      );
    }
    callback(null, true);
  },
};

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', multerConfig))
  async create(
    @Req() req: any,
    @Body() dto: CreateTripDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;

    if (file) {
      // สร้าง URL สำหรับเข้าถึงรูปภาพผ่าน HTTP
      const host = req.get('host') || 'localhost:3001';
      const protocol = req.protocol || 'http';
      imageUrl = `${protocol}://${host}/uploads/trips/${file.filename}`;
    }

    return this.tripsService.create(req.user.id, dto, imageUrl);
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.tripsService.findAll();
  }

  @Get('invite/:code')
  async findByInviteCode(@Param('code') code: string) {
    return this.tripsService.findByInviteCode(code);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tripsService.findOne(id);
  }

  /**
   * เข้าร่วมทริปด้วยรหัสเชิญ 6 หลัก หรือ Trip ID
   * POST /trips/join
   */
  @Post('join')
  @UseGuards(JwtAuthGuard)
  async join(@Req() req: any, @Body() dto: JoinTripDto) {
    return this.tripsService.join(req.user.id, dto);
  }

  /**
   * เข้าร่วมทริปโดยตรงจากรหัสเชิญที่แนบมากับ URL (เหมาะสำหรับสแกน QR Code)
   * POST /trips/invite/:code/join
   */
  @Post('invite/:code/join')
  @UseGuards(JwtAuthGuard)
  async joinByCode(
    @Req() req: any,
    @Param('code') code: string,
    @Body() dto?: Partial<JoinTripDto>,
  ) {
    return this.tripsService.join(req.user.id, {
      ...dto,
      inviteCode: code,
    });
  }

  /**
   * แก้ไขข้อมูลทริป (รองรับอัปโหลดรูปปกใหม่)
   * PATCH /trips/:id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('coverImage', multerConfig))
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateTripDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let imageUrl: string | undefined = undefined;
    if (file) {
      const host = req.get('host') || 'localhost:3001';
      const protocol = req.protocol || 'http';
      imageUrl = `${protocol}://${host}/uploads/trips/${file.filename}`;
    }

    return this.tripsService.update(id, req.user.id, dto, imageUrl);
  }

  /**
   * นำสมาชิกออกจากทริป หรือ สมาชิกออกจากทริปด้วยตนเอง
   * DELETE /trips/:id/members/:userId
   */
  @Delete(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.tripsService.removeMember(id, req.user.id, userId);
  }

  /**
   * ลบทริป (เฉพาะ OWNER)
   * DELETE /trips/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.remove(id, req.user.id);
  }
}
