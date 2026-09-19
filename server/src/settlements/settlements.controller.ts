import {
  BadRequestException,
  Body,
  Controller,
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
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { SettlementsService } from './settlements.service';

const slipStorageConfig = {
  storage: diskStorage({
    destination: './uploads/slips',
    filename: (req, file, callback) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = extname(file.originalname).toLowerCase();
      callback(null, `slip-${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req: any, file: any, callback: any) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      return callback(
        new BadRequestException('รองรับเฉพาะไฟล์รูปภาพ (jpg, jpeg, png, webp) เท่านั้น'),
        false,
      );
    }
    callback(null, true);
  },
};

@Controller('trips/:tripId/settlements')
@UseGuards(JwtAuthGuard)
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  /**
   * บันทึกการโอนเงินเคลียร์หนี้ พร้อมแนบสลิป (ถ้ามี)
   * POST /trips/:tripId/settlements
   */
  @Post()
  @UseInterceptors(FileInterceptor('slip', slipStorageConfig))
  create(
    @Param('tripId') tripId: string,
    @Req() req: any,
    @Body() dto: CreateSettlementDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let proofUrl: string | undefined = undefined;
    if (file) {
      const host = req.get('host') || 'localhost:3001';
      const protocol = req.protocol || 'http';
      proofUrl = `${protocol}://${host}/uploads/slips/${file.filename}`;
    }

    return this.settlementsService.create(tripId, req.user.id, dto, proofUrl);
  }

  /**
   * ดึงประวัติการเคลียร์หนี้ทั้งหมดในทริป
   * GET /trips/:tripId/settlements
   */
  @Get()
  findAll(@Param('tripId') tripId: string, @Req() req: any) {
    return this.settlementsService.findAll(tripId, req.user.id);
  }

  /**
   * ยืนยันการรับเงินเคลียร์หนี้ (เฉพาะผู้รับ หรือ เจ้าของทริป)
   * PATCH /trips/:tripId/settlements/:id/confirm
   */
  @Patch(':id/confirm')
  confirm(
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.settlementsService.confirm(tripId, id, req.user.id);
  }

  /**
   * ยกเลิกรายการเคลียร์หนี้
   * PATCH /trips/:tripId/settlements/:id/cancel
   */
  @Patch(':id/cancel')
  cancel(
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.settlementsService.cancel(tripId, id, req.user.id);
  }
}
