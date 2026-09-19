import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEqualExpenseDto } from './dto/create-equal-expense.dto';
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
   * สร้างค่าใช้จ่ายทั่วไป (Default: Equal Split)
   * POST /trips/:tripId/expenses
   */
  @Post('trips/:tripId/expenses')
  @UseGuards(JwtAuthGuard)
  createExpense(
    @Param('tripId') tripId: string,
    @Req() req: any,
    @Body() dto: CreateEqualExpenseDto,
  ) {
    return this.expensesService.createEqualSplit(tripId, req.user.id, dto);
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
   * ดูรายละเอียดค่าใช้จ่ายเดี่ยว
   * GET /trips/:tripId/expenses/:id
   */
  @Get('trips/:tripId/expenses/:id')
  findOne(@Param('tripId') tripId: string, @Param('id') id: string) {
    return this.expensesService.findOne(tripId, id);
  }
}
