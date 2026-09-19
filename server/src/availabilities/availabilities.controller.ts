import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AvailabilitiesService } from './availabilities.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { SetAvailabilitiesDto } from './dto/set-availabilities.dto';

@Controller('trips/:tripId/availabilities')
export class AvailabilitiesController {
  constructor(private readonly availabilitiesService: AvailabilitiesService) {}

  /**
   * เพิ่มช่วงวันว่างใหม่ (Member หรือ Owner)
   * POST /trips/:tripId/availabilities
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Param('tripId') tripId: string,
    @Request() req: any,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.availabilitiesService.create(tripId, req.user.id, dto);
  }

  /**
   * กำหนดช่วงวันว่างทั้งหมดของตนเอง (Batch Update)
   * PUT /trips/:tripId/availabilities/my
   */
  @UseGuards(JwtAuthGuard)
  @Put('my')
  setMyAvailabilities(
    @Param('tripId') tripId: string,
    @Request() req: any,
    @Body() dto: SetAvailabilitiesDto,
  ) {
    return this.availabilitiesService.setMyAvailabilities(tripId, req.user.id, dto);
  }

  /**
   * ดึงรายการวันว่างของทุกคนในทริป
   * GET /trips/:tripId/availabilities
   */
  @Get()
  findAll(@Param('tripId') tripId: string) {
    return this.availabilitiesService.findAll(tripId);
  }

  /**
   * คำนวณหาวันที่ว่างตรงกันของสมาชิกและ Owner (Matching Dates Grid & Ranges)
   * ถ้าทริปมี startDate จะเริ่มนับตั้งแต่วันนั้นเลย
   * GET /trips/:tripId/availabilities/match
   */
  @Get('match')
  findMatchingDates(@Param('tripId') tripId: string) {
    return this.availabilitiesService.findMatchingDates(tripId);
  }

  /**
   * ลบช่วงวันว่าง
   * DELETE /trips/:tripId/availabilities/:id
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.availabilitiesService.remove(tripId, id, req.user.id);
  }
}
