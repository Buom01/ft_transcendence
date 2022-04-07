import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ChannelUser } from './channelUser.entity';

@Entity()
export class Channel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'smallint', default: '1' })
  type: number;

  @Column({ type: 'text', default: 'My channel' })
  name: string;

  @Column({ type: 'text', default: 'password' })
  password: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationDate: Date;

  @OneToMany(() => ChannelUser, (user: ChannelUser) => user.channel)
  users: ChannelUser[];
}
