import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelMessage } from '../orm/channelMessage.entity';
import { ChannelMessageDTO } from '../orm/channelMessage.dto';

@Injectable()
export class ChannelMessageService {
  constructor(
    @InjectRepository(ChannelMessage)
    private channelMessageRepository: Repository<ChannelMessage>,
  ) {}

  async get(id: number, pages: number): Promise<ChannelMessage[]> {
    const size = Number(3);
    const messages = await this.channelMessageRepository.find({
      where: {
        channelId: id,
      },
    });
    if (pages < 0) return messages;
    let end = pages * size;
    let start = end - size;
    if (start > messages.length) {
      start = messages.length - size;
      end = messages.length;
    } else if (end > messages.length) end = messages.length;
    return messages.slice(start, end);
  }

  async add(data: ChannelMessageDTO) {
    const message = this.channelMessageRepository.create(data);
    await this.channelMessageRepository.save(message);
    return message;
  }

  async update(data: ChannelMessageDTO) {
    const update = await this.channelMessageRepository.findOne({
      where: {
        id: data.id,
      },
    });
    await this.channelMessageRepository.update({ id: data.id }, update);
  }

  async delete(data: ChannelMessageDTO) {
    delete data.message;
    const message = await this.channelMessageRepository.findOne({
      where: {
        id: data.id,
        userId: data.userId,
      },
    });
    if (!message)
      return {
        error: "Message don't exist",
        deleted: false,
      };
    await this.channelMessageRepository.delete({
      id: data.id,
      userId: data.userId,
    });
    return {
      deleted: true,
    };
  }
}
