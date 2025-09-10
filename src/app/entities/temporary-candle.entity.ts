import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('temporary_candles')
@Index(['exchangeToken', 'interval', 'datetime'])
export class TemporaryCandle {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ name: 'exchange_token' })
  exchangeToken: string;

  @Column()
  symbol: string;

  @Column()
  name: string;

  @Column()
  interval: string; // 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M

  @Column({ type: 'timestamp' })
  datetime: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  open: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  high: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  low: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  close: number;

  @Column({ type: 'bigint' })
  volume: number;

  @Column({ name: 'is_temporary', default: true })
  isTemporary: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
