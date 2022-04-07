import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class ChannelMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  channelId: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creation: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  modification: Date;
}
