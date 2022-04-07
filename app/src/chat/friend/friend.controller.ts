import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { FriendService } from './friend.service';
import { FriendDTO } from './../orm/friend.dto';

@Controller('chat/friend')
export class FriendController {
  constructor(private friendService: FriendService) {}

  @Get('get/:userId')
  async allFriends(@Param('userId') userId: number) {
    const friends = await this.friendService.get(userId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Friends fetched successfully',
      friends,
    };
  }

  @Post('add')
  async addFriend(@Body() data: FriendDTO) {
    const add = await this.friendService.create(data);
    return {
      statusCode: HttpStatus.OK,
      message: 'Friend add successfully',
      add,
    };
  }

  @Patch('update/:userId/:friendId')
  async toggleBlocked(
    @Param('userId') userId: number,
    @Param('friendId') friendId: number,
  ) {
    await this.friendService.toggleBlocked(userId, friendId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Friend blocking is toogle',
    };
  }

  @Delete('delete/:userId/:friendId')
  async deleteFriend(
    @Param('userId') userId: number,
    @Param('friendId') friendId: number,
  ) {
    await this.friendService.delete(userId, friendId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Friend deleted successfully',
    };
  }
}
