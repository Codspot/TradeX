import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('candles_15m')
export class Candles15m {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  symbol: string;

  @Column()
  name: string;

  @Column()
  exchange_token: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ type: 'float' })
  open: number;

  @Column({ type: 'float' })
  high: number;

  @Column({ type: 'float' })
  low: number;

  @Column({ type: 'float' })
  close: number;

  @Column({ type: 'float' })
  volume: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
