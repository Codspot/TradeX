import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('candles_month')
export class CandlesMonth {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

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

  @Column({ type: 'bigint' })
  volume: number;

  @Column()
  symbol: string;

  @Column()
  name: string;
}
