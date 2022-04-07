import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Put,
  Post,
} from '@nestjs/common';
import { ChannelMessageService } from './channelMessage.service';
import { ChannelMessageDTO } from '../orm/channelMessage.dto';

@Controller('chat/message')
export class ChannelMessageController {
  constructor(private channelMessageService: ChannelMessageService) {}

  @Get(':id')
  async getMessagesLast(@Param('id') id: number) {
    const messages = await this.channelMessageService.get(id, -1);
    return {
      statusCode: HttpStatus.OK,
      message: 'Channel message(s) fetched successfully',
      messages,
    };
  }

  @Get(':id/:pages')
  async getMessages(@Param('id') id: number, @Param('pages') pages: number) {
    const messages = await this.channelMessageService.get(id, pages);
    return {
      statusCode: HttpStatus.OK,
      message: 'Channel message(s) fetched successfully',
      messages,
    };
  }

  @Post()
  async addMessage(@Body() data: ChannelMessageDTO) {
    const add = await this.channelMessageService.add(data);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Channel message posted successfully',
      add,
    };
  }

  @Put()
  async updateChannel(@Body() data: ChannelMessageDTO) {
    await this.channelMessageService.update(data);
    return {
      statusCode: HttpStatus.NO_CONTENT,
      message: 'Channel update',
      data,
    };
  }

  @Delete()
  async deleteChannel(@Body() data: ChannelMessageDTO) {
    const ret = await this.channelMessageService.delete(data);
    return {
      statusCode: ret.deleted ? HttpStatus.OK : HttpStatus.FORBIDDEN,
      message: 'Channel deletion',
      ret,
    };
  }
}
