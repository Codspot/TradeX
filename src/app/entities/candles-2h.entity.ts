import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('candles_2h')
export class Candles2h {
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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ default: false })
  deleted: boolean;
}
