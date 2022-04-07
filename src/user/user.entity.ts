import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  username: string;

  @Column({ type: 'text' })
  password: string;

  @Column({ type: 'boolean', default: 'false' })
  connected: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created: Date;
}
