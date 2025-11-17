import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class SoilData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('float') temp: number;  // Nhiệt độ
  @Column('float') hum: number;   // Độ ẩm KK
  @Column('int') soil: number;    // Độ ẩm đất
  @Column('int') light: number;   // Ánh sáng
  @Column('int') hour: number;    // Giờ mô phỏng

  // Trạng thái thiết bị (0 hoặc 1)
  @Column('int') fan: number;
  @Column('int') pump: number;
  @Column('int') mist: number;
  @Column('int') lamp: number;

  @CreateDateColumn()
  createdAt: Date; // Tự động lưu ngày giờ thực tế
}