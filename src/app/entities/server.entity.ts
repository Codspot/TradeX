import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('servers')
export class Server {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ name: 'server_name' })
  serverName: string;

  @Column({ name: 'api_key' })
  apiKey: string;

  @Column({ name: 'secret_key' })
  secretKey: string;

  @Column({ name: 'client_code' })
  clientCode: string;

  @Column({ name: 'totp_secret' })
  totpSecret: string;

  @Column()
  password: string;

  @Column({ default: 'development' })
  environment: 'development' | 'production';

  @Column({ name: 'max_instruments_per_server', default: 150 })
  maxInstrumentsPerServer: number;

  @Column({ name: 'server_status', default: 'inactive' })
  serverStatus: 'active' | 'inactive' | 'maintenance' | 'error';

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
