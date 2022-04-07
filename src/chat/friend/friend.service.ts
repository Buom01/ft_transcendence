import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Friend } from './../orm/friend.entity';
import { FriendDTO } from './../orm/friend.dto';

@Injectable()
export class FriendService {
  constructor(
    @InjectRepository(Friend)
    private friendRepository: Repository<Friend>,
  ) {}

  async get(userId: number): Promise<Friend[]> {
    return this.friendRepository.find({
      where: {
        userId: userId,
      },
    });
  }

  async create(data: FriendDTO) {
    const user = this.friendRepository.create(data);
    await this.friendRepository.save(data);
    return user;
  }

  async toggleBlocked(userId: number, friendId: number) {
    const update = await this.friendRepository.findOne({
      where: {
        userId: userId,
        friendId: friendId,
      },
    });
    update.isBlocked = !update.isBlocked;
    await this.friendRepository.update({ userId, friendId }, update);
  }

  async delete(userId: number, friendId: number) {
    await this.friendRepository.delete({ userId, friendId });
    return { deleted: true };
  }
}
