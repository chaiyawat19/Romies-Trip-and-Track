import { Controller, Get, Query } from '@nestjs/common';
import { ProvincesService } from './provinces.service';

@Controller('provinces')
export class ProvincesController {
  constructor(private readonly provincesService: ProvincesService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('region') region?: string,
  ) {
    return this.provincesService.findAll(search, region);
  }

  @Get('regions')
  async getRegions() {
    return this.provincesService.getRegions();
  }
}
