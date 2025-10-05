import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TimeInterval {
  ONE_MINUTE = '1m',
  THREE_MINUTES = '3m',
  FIVE_MINUTES = '5m',
  TEN_MINUTES = '10m',
  FIFTEEN_MINUTES = '15m',
  THIRTY_MINUTES = '30m',
  ONE_HOUR = '1h',
  TWO_HOURS = '2h',
  FOUR_HOURS = '4h',
  ONE_DAY = '1d',
  SEVEN_DAYS = '1w',
  ONE_MONTH = '1M'
}

@Entity('time_intervals')
export class TimeIntervalEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({
    type: 'enum',
    enum: TimeInterval,
    comment: 'Time interval type (1m, 3m, 5m, 10m, 15m, 30m, 1h, 2h, 4h, 1d, 7d, 1M)'
  })
  interval: TimeInterval;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Display name for the interval'
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Description of the time interval'
  })
  description: string;

  @Column({
    type: 'int',
    comment: 'Duration in minutes'
  })
  durationMinutes: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether this interval is active/available'
  })
  isActive: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Sort order for display'
  })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper method to get interval duration in minutes
  static getIntervalMinutes(interval: TimeInterval): number {
    switch (interval) {
      case TimeInterval.ONE_MINUTE:
        return 1;
      case TimeInterval.THREE_MINUTES:
        return 3;
      case TimeInterval.FIVE_MINUTES:
        return 5;
      case TimeInterval.TEN_MINUTES:
        return 10;
      case TimeInterval.FIFTEEN_MINUTES:
        return 15;
      case TimeInterval.THIRTY_MINUTES:
        return 30;
      case TimeInterval.ONE_HOUR:
        return 60;
      case TimeInterval.TWO_HOURS:
        return 120;
      case TimeInterval.FOUR_HOURS:
        return 240;
      case TimeInterval.ONE_DAY:
        return 1440;
      case TimeInterval.SEVEN_DAYS:
        return 10080;
      case TimeInterval.ONE_MONTH:
        return 43200; // Approximate
      default:
        return 1;
    }
  }

  // Helper method to get display name
  static getDisplayName(interval: TimeInterval): string {
    switch (interval) {
      case TimeInterval.ONE_MINUTE:
        return '1 Minute';
      case TimeInterval.THREE_MINUTES:
        return '3 Minutes';
      case TimeInterval.FIVE_MINUTES:
        return '5 Minutes';
      case TimeInterval.TEN_MINUTES:
        return '10 Minutes';
      case TimeInterval.FIFTEEN_MINUTES:
        return '15 Minutes';
      case TimeInterval.THIRTY_MINUTES:
        return '30 Minutes';
      case TimeInterval.ONE_HOUR:
        return '1 Hour';
      case TimeInterval.TWO_HOURS:
        return '2 Hours';
      case TimeInterval.FOUR_HOURS:
        return '4 Hours';
      case TimeInterval.ONE_DAY:
        return '1 Day';
      case TimeInterval.SEVEN_DAYS:
        return '1 Week';
      case TimeInterval.ONE_MONTH:
        return '1 Month';
      default:
        return 'Unknown';
    }
  }
}
