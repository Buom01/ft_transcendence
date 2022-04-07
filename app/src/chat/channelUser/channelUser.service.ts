import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelUser } from '../orm/channelUser.entity';
import { ChannelUserDTO } from '../orm/channelUser.dto';

@Injectable()
export class ChannelUserService {
  constructor(
    @InjectRepository(ChannelUser)
    private channelUserRepository: Repository<ChannelUser>,
  ) {}

  async get(id: number, user: number): Promise<ChannelUser[]> {
    return user !== -1
      ? this.channelUserRepository.find({
          where: {
            channelId: id,
            userId: user,
          },
        })
      : this.channelUserRepository.find({
          where: {
            channelId: id,
          },
        });
  }

  async add(data: ChannelUserDTO) {
    try {
      const user = this.channelUserRepository.create(data);
      await this.channelUserRepository.save(user);
      return false;
    } catch (___) {
      return true;
    }
  }

  async mute(data: ChannelUserDTO) {
    try {
      const update = await this.channelUserRepository.findOne({
        where: {
          channelId: data.channelId,
          userId: data.userId,
        },
      });
      await this.channelUserRepository.update(
        {
          channelId: data.channelId,
          userId: data.userId,
        },
        update,
      );
      return false;
    } catch (___) {
      return true;
    }
  }

  async delete(data: ChannelUserDTO) {
    const user = await this.channelUserRepository.findOne({
      where: {
        channelId: data.channelId,
        userId: data.userId,
      },
    });
    if (!user)
      return {
        error: "User don't exist",
        deleted: false,
      };
    await this.channelUserRepository.delete({
      channelId: data.channelId,
      userId: data.userId,
    });
    return {
      deleted: true,
    };
  }
}
