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
import { UserService } from './user.service';
import { UserDTO } from './user.dto';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('id/:id')
  async userId(@Param('id') id: number) {
    const user = await this.userService.getId(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'User fetched successfully',
      user,
    };
  }

  @Get('username/:username')
  async userName(@Param('username') username: string) {
    const user = await this.userService.getName(username);
    return {
      statusCode: HttpStatus.OK,
      message: 'User fetched successfully',
      user,
    };
  }

  @Post()
  async addFriend(@Body() data: UserDTO) {
    const add = await this.userService.create(data);
    return {
      statusCode: HttpStatus.OK,
      message: 'User added successfully',
      add,
    };
  }

  @Patch()
  async toggleBlocked(@Body() data: UserDTO) {
    await this.userService.update(data);
    return {
      statusCode: HttpStatus.OK,
      message: 'User updated successfully',
    };
  }

  @Delete()
  async deleteFriend(@Body() data: UserDTO) {
    await this.userService.delete(data);
    return {
      statusCode: HttpStatus.OK,
      message: 'User deleted successfully',
    };
  }
}
