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
import { ChannelUserService } from './channelUser.service';
import { ChannelUserDTO } from '../orm/channelUser.dto';

@Controller('chat/user')
export class ChannelUserController {
  constructor(private channelUserService: ChannelUserService) {}

  @Get(':channelId')
  async getUsers(@Param('id') channelId: number) {
    const users = await this.channelUserService.get(channelId, -1);
    return {
      statusCode: HttpStatus.OK,
      message: 'Channel user(s) fetched successfully',
      users,
    };
  }

  @Get(':channelId/:userId')
  async getUser(
    @Param('channelId') channelId: number,
    @Param('userId') userId: number,
  ) {
    const users = await this.channelUserService.get(channelId, userId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Channel user fetched successfully',
      users,
    };
  }

  @Post()
  async addUser(@Body() data: ChannelUserDTO) {
    if (!(await this.channelUserService.add(data)))
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Channel user added successfully',
      };
    return {
      statusCode: HttpStatus.FORBIDDEN,
      message: 'Channel user added failed',
    };
  }

  @Put()
  async update(@Body() data: ChannelUserDTO) {
    if (!(await this.channelUserService.mute(data)))
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Channel user muted successfully',
      };
    return {
      statusCode: HttpStatus.FORBIDDEN,
      message: 'Channel user muted failed',
    };
  }

  @Delete()
  async deleteChannel(@Body() data: ChannelUserDTO) {
    const ret = await this.channelUserService.delete(data);
    return {
      statusCode: ret.deleted ? HttpStatus.OK : HttpStatus.FORBIDDEN,
      message: 'Channel deletion',
      ret,
    };
  }
}
