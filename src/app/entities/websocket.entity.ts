import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('websockets')
export class WebSocket {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ name: 'server_uuid' })
  serverUuid: string;

  @Column({ name: 'websocket_name' })
  websocketName: string;

  @Column({ name: 'max_stocks', default: 50 })
  maxStocks: number;

  @Column({ name: 'current_stocks', default: 0 })
  currentStocks: number;

  @Column({ name: 'connection_status', default: 'disconnected' })
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}