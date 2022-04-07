import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './user.entity';
import { UserDTO } from './user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getId(id: number): Promise<User[]> {
    return this.userRepository.find({
      where: {
        id: id,
      },
    });
  }

  async getName(username: string): Promise<User[]> {
    return this.userRepository.find({
      where: {
        username: username,
      },
    });
  }

  async create(data: UserDTO) {
    const user = this.userRepository.create(data);
    await this.userRepository.save(data);
    return user;
  }

  async update(data: UserDTO) {
    await this.userRepository.update({ id: data.id }, data);
  }

  async delete(data: UserDTO) {
    await this.userRepository.delete({ id: data.id });
    return { deleted: true };
  }
}
