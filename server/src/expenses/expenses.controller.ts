import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEqualExpenseDto } from './dto/create-equal-expense.dto';
import { CreateItemizedExpenseDto } from './dto/create-itemized-expense.dto';
import { CreateHybridExpenseDto } from './dto/create-hybrid-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@Controller()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  /**
   * ดึงรายการประเภทค่าใช้จ่ายทั้งหมด 11 ประเภท
   * GET /expenses/categories
   */
  @Get('expenses/categories')
  getCategories() {
    return this.expensesService.getCategories();
  }

  /**
   * 1. หารเท่ากันทุกคน (Equal Split)
   * POST /trips/:tripId/expenses/equal
   */
  @Post('trips/:tripId/expenses/equal')
  @UseGuards(JwtAuthGuard)
  createEqualSplit(
    @Param('tripId') tripId: string,
    @Req() req: any,
    @Body() dto: CreateEqualExpenseDto,
  ) {
    return this.expensesService.createEqualSplit(tripId, req.user.id, dto);
  }

  /**
   * 2. จ่ายตามที่กินจริง (Itemized / Individual Split)
   * POST /trips/:tripId/expenses/itemized
   */
  @Post('trips/:tripId/expenses/itemized')
  @UseGuards(JwtAuthGuard)
  createItemizedSplit(
    @Param('tripId') tripId: string,
    @Req() req: any,
    @Body() dto: CreateItemizedExpenseDto,
  ) {
    return this.expensesService.createItemizedSplit(tripId, req.user.id, dto);
  }

  /**
   * 3. หารส่วนกลาง + แยกจ่ายส่วนตัว (Hybrid / Shared Dishes)
   * POST /trips/:tripId/expenses/hybrid
   */
  @Post('trips/:tripId/expenses/hybrid')
  @UseGuards(JwtAuthGuard)
  createHybridSplit(
    @Param('tripId') tripId: string,
    @Req() req: any,
    @Body() dto: CreateHybridExpenseDto,
  ) {
    return this.expensesService.createHybridSplit(tripId, req.user.id, dto);
  }

  /**
   * สร้างค่าใช้จ่ายทั่วไป (Routing ตาม splitType: EQUAL | ITEMIZED | HYBRID)
   * POST /trips/:tripId/expenses
   */
  @Post('trips/:tripId/expenses')
  @UseGuards(JwtAuthGuard)
  createExpense(
    @Param('tripId') tripId: string,
    @Req() req: any,
    @Body() dto: any,
  ) {
    if (dto.splitType === 'HYBRID') {
      return this.expensesService.createHybridSplit(tripId, req.user.id, dto as CreateHybridExpenseDto);
    }
    if (dto.splitType === 'ITEMIZED') {
      return this.expensesService.createItemizedSplit(tripId, req.user.id, dto as CreateItemizedExpenseDto);
    }
    return this.expensesService.createEqualSplit(tripId, req.user.id, dto as CreateEqualExpenseDto);
  }

  /**
   * ดึงรายการค่าใช้จ่ายทั้งหมดในทริป
   * GET /trips/:tripId/expenses
   */
  @Get('trips/:tripId/expenses')
  findAll(@Param('tripId') tripId: string) {
    return this.expensesService.findAll(tripId);
  }

  /**
   * คำนวณสรุปยอดคงค้างและรายการโอนหนี้ (Debt Simplification)
   * GET /trips/:tripId/expenses/balances
   */
  @Get('trips/:tripId/expenses/balances')
  @UseGuards(JwtAuthGuard)
  getBalances(@Param('tripId') tripId: string, @Req() req: any) {
    return this.expensesService.getTripBalances(tripId, req.user.id);
  }

  /**
   * ดูรายละเอียดค่าใช้จ่ายเดี่ยว
   * GET /trips/:tripId/expenses/:id
   */
  @Get('trips/:tripId/expenses/:id')
  findOne(@Param('tripId') tripId: string, @Param('id') id: string) {
    return this.expensesService.findOne(tripId, id);
  }

  /**
   * แก้ไขข้อมูลบิลค่าใช้จ่าย
   * PATCH /trips/:tripId/expenses/:id
   */
  @Patch('trips/:tripId/expenses/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(tripId, id, req.user.id, dto);
  }

  /**
   * ลบบิลค่าใช้จ่าย
   * DELETE /trips/:tripId/expenses/:id
   */
  @Delete('trips/:tripId/expenses/:id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.expensesService.remove(tripId, id, req.user.id);
  }
}
