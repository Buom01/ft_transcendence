import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Channel } from './channel.entity';

@Entity()
export class ChannelUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  channelId: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'timestamptz', nullable: true })
  isMuted: Date;

  @Column({ type: 'boolean', default: 'false' })
  isBlocked: boolean;

  @Column({ type: 'boolean', default: 'false' })
  isAdmin: boolean;

  @Column({ type: 'boolean', default: 'false' })
  isCreator: boolean;

  @ManyToOne(() => Channel, (channel: Channel) => channel.users)
  channel: Channel;
}
