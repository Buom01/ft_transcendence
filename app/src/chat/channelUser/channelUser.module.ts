import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelUser } from '../orm/channelUser.entity';
import { ChannelUserService } from './channelUser.service';
import { ChannelUserController } from './channelUser.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChannelUser])],
  controllers: [ChannelUserController],
  providers: [ChannelUserService],
})
export class ChannelUserModule {}
