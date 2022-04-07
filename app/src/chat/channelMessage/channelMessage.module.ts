import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelMessage } from '../orm/channelMessage.entity';
import { ChannelMessageService } from './channelMessage.service';
import { ChannelMessageController } from './channelMessage.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChannelMessage])],
  controllers: [ChannelMessageController],
  providers: [ChannelMessageService],
})
export class ChannelMessageModule {}
