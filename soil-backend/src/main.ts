import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // THÊM DÒNG NÀY ĐỂ CHO PHÉP FRONTEND KẾT NỐI
  app.enableCors({
    origin: true, // Hoặc để '*' nếu muốn mở rộng hoàn toàn
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();