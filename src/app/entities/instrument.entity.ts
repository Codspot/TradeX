import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('instruments')
export class Instrument {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ name: 'server_uuid' })
  serverUuid: string;

  @Column({ name: 'websocket_uuid' })
  websocketUuid: string;

  @Column({ name: 'instrument_token', unique: true })
  instrumentToken: string;

  @Column({ name: 'exchange_token' })
  exchangeToken: string;

  @Column({ name: 'trading_symbol' })
  tradingSymbol: string;

  @Column()
  name: string;

  @Column()
  exchange: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ name: 'strike_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  strikePrice: number;

  @Column({ name: 'tick_size', type: 'decimal', precision: 6, scale: 4, default: 0.05 })
  tickSize: number;

  @Column({ name: 'lot_size', default: 1 })
  lotSize: number;

  @Column({ name: 'instrument_type' })
  instrumentType: 'EQ' | 'FUT' | 'CE' | 'PE' | 'INDEX';

  @Column()
  segment: string;

  @Column({ name: 'last_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  lastPrice: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
