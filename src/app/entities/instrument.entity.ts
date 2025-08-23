import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('instruments')
export class Instrument {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ name: 'server_uuid' })
  serverUuid: string;

  @Column({ name: 'websocket_uuid' })
  websocketUuid: string;

  @Column({ name: 'input_symbol' })
  inputSymbol: string;

  @Column({ name: 'resolved_symbol' })
  resolvedSymbol: string;

  @Column()
  name: string;

  @Column()
  exchange: string;

  @Column()
  series: string;

  @Column({ nullable: true })
  symboltoken: string;

  @Column()
  token: string;

  @Column()
  lotsize: string;

  @Column({ name: 'tick_size' })
  tickSize: string;

  @Column({ name: 'expiry', nullable: true })
  expiry: string;

  @Column({ name: 'strike' })
  strike: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
