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
import { ChannelService } from './channel.service';
import { ChannelDTO } from '../orm/channel.dto';

@Controller('chat/channel')
export class ChannelController {
  constructor(private channelService: ChannelService) {}

  @Get('get/:id')
  async getChannel(@Param('id') id: number) {
    const channel = await this.channelService.get(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Channel fetched successfully',
      channel,
    };
  }
  @Get('get/list/:id')
  async getChannels(@Param('id') id: number) {
    console.log(id);
    const channels = await this.channelService.gets(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Channel fetched successfully',
      channels,
    };
  }

  @Post('create')
  async createChannel(@Body() data: ChannelDTO) {
    const add = await this.channelService.create(data);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Channel is created successfully',
      add,
    };
  }

  @Put('update')
  async updateChannel(@Body() data: ChannelDTO) {
    await this.channelService.update(data);
    return {
      statusCode: HttpStatus.NO_CONTENT,
      message: 'Channel update',
      data,
    };
  }

  @Delete('delete')
  async deleteChannel(@Body() data: ChannelDTO) {
    const ret = await this.channelService.delete(data);
    return {
      statusCode: ret.deleted ? HttpStatus.OK : HttpStatus.FORBIDDEN,
      message: 'Channel deletion',
      ret,
    };
  }
}
