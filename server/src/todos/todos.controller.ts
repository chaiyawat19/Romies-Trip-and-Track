import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { TodosService } from './todos.service';

@Controller('trips/:tripId/todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  /**
   * สร้าง To-Do ใหม่ในทริป
   * POST /trips/:tripId/todos
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Param('tripId') tripId: string,
    @Request() req: any,
    @Body() dto: CreateTodoDto,
  ) {
    return this.todosService.create(tripId, req.user.id, dto);
  }

  /**
   * ดึงรายการ To-Do ทั้งหมดในทริป
   * GET /trips/:tripId/todos
   */
  @Get()
  findAll(@Param('tripId') tripId: string) {
    return this.todosService.findAll(tripId);
  }

  /**
   * สลับสถานะทำเสร็จ / ยังไม่เสร็จ
   * PATCH /trips/:tripId/todos/:id/toggle
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/toggle')
  toggle(
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.todosService.toggle(tripId, id, req.user.id);
  }

  /**
   * อัปเดตรายละเอียด To-Do
   * PATCH /trips/:tripId/todos/:id
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('tripId') tripId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTodoDto,
  ) {
    return this.todosService.update(tripId, id, dto);
  }

  /**
   * ลบ To-Do ออกจากทริป
   * DELETE /trips/:tripId/todos/:id
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('tripId') tripId: string, @Param('id') id: string) {
    return this.todosService.remove(tripId, id);
  }
}
