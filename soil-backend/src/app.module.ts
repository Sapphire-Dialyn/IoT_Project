import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoilModule } from './soil/soil.module';
import { SoilData } from './soil/soil.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres', // <--- SỬA TÊN USER CỦA BẠN (thường là postgres)
      password: '123456',      // <--- SỬA MẬT KHẨU DB CỦA BẠN
      database: 'iot_garden', // <--- Đảm bảo bạn đã tạo DB tên này trong pgAdmin
      entities: [SoilData],
      synchronize: true, // Tự động tạo bảng (Chỉ dùng cho Dev)
    }),
    SoilModule,
  ],
})
export class AppModule {}