import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoilData } from './soil.entity';
import { SoilService } from './soil.service';
import { SoilGateway } from './soil.gateway';
import { SoilController } from './soil.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SoilData])],
  providers: [SoilService, SoilGateway],
  controllers: [SoilController],
})
export class SoilModule {}