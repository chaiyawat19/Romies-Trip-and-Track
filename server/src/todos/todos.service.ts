import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /**
   * ตรวจสอบว่ามีทริปนี้อยู่ในระบบหรือไม่
   */
  private async ensureTripExists(tripId: string) {
    if (!TodosService.UUID_REGEX.test(tripId)) {
      throw new NotFoundException(`ไม่พบข้อมูลทริป ID: ${tripId}`);
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true },
    });
    if (!trip) {
      throw new NotFoundException(`ไม่พบข้อมูลทริป ID: ${tripId}`);
    }
    return trip;
  }

  /**
   * สร้างรายการ To-Do ใหม่ในทริป
   */
  async create(tripId: string, userId: string, dto: CreateTodoDto) {
    await this.ensureTripExists(tripId);

    // หา orderIndex ล่าสุดในทริป
    const lastTodo = await this.prisma.tripTodo.findFirst({
      where: { tripId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const nextOrder = lastTodo ? lastTodo.orderIndex + 1 : 0;

    const todo = await this.prisma.tripTodo.create({
      data: {
        tripId,
        title: dto.title,
        description: dto.description || null,
        sticker: dto.sticker || null,
        createdById: userId,
        orderIndex: nextOrder,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        completedBy: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      message: 'สร้าง To-Do สำเร็จ',
      todo,
    };
  }

  /**
   * ดึงรายการ To-Do ทั้งหมดในทริป
   */
  async findAll(tripId: string) {
    await this.ensureTripExists(tripId);

    return this.prisma.tripTodo.findMany({
      where: { tripId },
      orderBy: [
        { isCompleted: 'asc' },
        { orderIndex: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        completedBy: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * สลับสถานะทำสำเร็จ / ยังไม่สำเร็จ (Toggle Completion)
   */
  async toggle(tripId: string, id: string, userId: string) {
    await this.ensureTripExists(tripId);

    const todo = await this.prisma.tripTodo.findFirst({
      where: { id, tripId },
    });

    if (!todo) {
      throw new NotFoundException(`ไม่พบรายการ To-Do ID: ${id}`);
    }

    const nextCompleted = !todo.isCompleted;

    const updated = await this.prisma.tripTodo.update({
      where: { id },
      data: {
        isCompleted: nextCompleted,
        completedById: nextCompleted ? userId : null,
        completedAt: nextCompleted ? new Date() : null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        completedBy: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      message: nextCompleted ? 'ทำรายการสำเร็จแล้ว' : 'ยกเลิกสถานะสำเร็จแล้ว',
      todo: updated,
    };
  }

  /**
   * อัปเดตข้อมูล To-Do
   */
  async update(tripId: string, id: string, dto: UpdateTodoDto) {
    await this.ensureTripExists(tripId);

    const todo = await this.prisma.tripTodo.findFirst({
      where: { id, tripId },
    });

    if (!todo) {
      throw new NotFoundException(`ไม่พบรายการ To-Do ID: ${id}`);
    }

    const updated = await this.prisma.tripTodo.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sticker !== undefined && { sticker: dto.sticker }),
        ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        completedBy: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      message: 'อัปเดต To-Do สำเร็จ',
      todo: updated,
    };
  }

  /**
   * ลบรายการ To-Do
   */
  async remove(tripId: string, id: string) {
    await this.ensureTripExists(tripId);

    const todo = await this.prisma.tripTodo.findFirst({
      where: { id, tripId },
    });

    if (!todo) {
      throw new NotFoundException(`ไม่พบรายการ To-Do ID: ${id}`);
    }

    await this.prisma.tripTodo.delete({
      where: { id },
    });

    return {
      message: 'ลบรายการ To-Do สำเร็จ',
      id,
    };
  }
}
