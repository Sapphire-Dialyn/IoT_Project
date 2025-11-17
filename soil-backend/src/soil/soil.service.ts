import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SoilData } from './soil.entity';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { SoilGateway } from './soil.gateway';

@Injectable()
export class SoilService implements OnModuleInit {
  private lastSavedTime = 0;
  private SAVE_INTERVAL = 60 * 1000; // 60 giây mới lưu DB một lần (để không bị nặng DB)

  constructor(
    @InjectRepository(SoilData)
    private soilRepo: Repository<SoilData>,
    private soilGateway: SoilGateway,
  ) {}

  onModuleInit() {
    // CẤU HÌNH CỔNG COM (Phải là COM2 - khớp với Termite/VSPE)
    const portPath = 'COM2'; 
    
    const port = new SerialPort({
      path: portPath,
      baudRate: 9600,
    });

    // Parser đọc từng dòng lệnh
    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    port.on('open', () => {
      console.log(`🚀 Đã kết nối thành công cổng ${portPath}`);
    });

    port.on('error', (err) => {
      console.error('❌ Lỗi cổng Serial (Quên tắt Termite à?):', err.message);
    });

    // KHI NHẬN DỮ LIỆU TỪ PROTEUS
    parser.on('data', async (line: string) => {
      try {
        // 1. Parse JSON: {"hour":0,"temp":25...}
        const data = JSON.parse(line.trim());

        console.log('------------------------------------------------');
        console.log(`🕒 Giờ mô phỏng: \x1b[33m${data.hour}h\x1b[0m`); // Tô màu vàng cho giờ
        console.log(`🌡️  Môi trường : Temp: ${data.temp}°C | Hum: ${data.hum}% | Light: ${data.light}`);
        console.log(`🌱 Đất        : Soil: ${data.soil}%`);
        console.log(`⚙️  Trạng thái : Fan: [${data.fan}] | Mist: [${data.mist}] | Pump: [${data.pump}] | Lamp: [${data.lamp}]`);

        // 2. GỬI REALTIME LÊN WEB (Gửi ngay lập tức)
        this.soilGateway.server.emit('live-data', data);

        // 3. LƯU VÀO DATABASE (Chỉ lưu 1 phút 1 lần)
        const now = Date.now();
        if (now - this.lastSavedTime > this.SAVE_INTERVAL) {
          const newRecord = this.soilRepo.create(data);
          await this.soilRepo.save(newRecord);
          
          this.lastSavedTime = now;
          console.log('💾 ---> Đã lưu dữ liệu lịch sử vào DB');
        }

      } catch (error) {
        // Bỏ qua lỗi nếu JSON bị nhiễu
      }
    });
  }

  // API lấy danh sách lịch sử cho biểu đồ
  async getHistory() {
    return this.soilRepo.find({
      order: { createdAt: 'DESC' },
      take: 50, // Lấy 50 bản ghi mới nhất
    });
  }
}