import { Controller, Get } from '@nestjs/common';
import { SoilService } from './soil.service';

@Controller('soil')
export class SoilController {
  constructor(private readonly soilService: SoilService) {}

  @Get('history')
  async getHistory() {
    return this.soilService.getHistory();
  }
  @Get('all') // Đây chính là cái tạo ra đường dẫn /soil/all
  async getAllData() {
    return this.soilService.getAll();
  }
}