import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';

import { ChannelDTO } from '../orm/channel.dto';
import { Channel } from '../orm/channel.entity';

@Injectable()
export class ChannelService {
  constructor(
    @InjectRepository(Channel)
    private channelRepository: Repository<Channel>,
  ) {}

  async get(id: number): Promise<Channel[]> {
    return this.channelRepository.find({
      where: {
        id: id,
      },
    });
  }

  async gets(id: number): Promise<Channel[]> {
    const query = await this.channelRepository.find({ relations: ['users'] });
    const ret = [];
    for (const channel of query) {
      for (const user of channel.users) {
        if (user.userId === id) {
          delete channel.users;
          ret.push(channel);
          break;
        }
      }
    }
    return query;
  }

  async create(data: ChannelDTO) {
    const user = this.channelRepository.create(data);
    user.password = await argon2.hash(user.password);
    await this.channelRepository.save(user);
    return user;
  }

  async update(data: ChannelDTO) {
    const temp = data.id;
    delete data.id;
    const update = await this.channelRepository.findOne({
      where: {
        id: temp,
      },
    });
    update.name = data.name;
    if (!(await argon2.verify(update.password, data.password)))
      update.password = await argon2.hash(data.password);
    update.type = data.type;
    await this.channelRepository.update({ id: temp }, update);
  }

  async delete(data: ChannelDTO) {
    const user = await this.channelRepository.findOne({
      where: {
        id: data.id,
      },
    });
    if (await argon2.verify(user.password, data.password)) {
      await this.channelRepository.delete({ id: data.id });
      return { deleted: true };
    }
    return {
      error: "Password don't recognize",
      deleted: false,
    };
  }
}
