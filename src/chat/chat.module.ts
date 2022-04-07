import { Module } from '@nestjs/common';
import { ChannelModule } from './channel/channel.module';
import { ChannelMessageModule } from './channelMessage/channelMessage.module';
import { ChannelUserModule } from './channelUser/channelUser.module';
import { FriendModule } from './friend/friend.module';

@Module({
  imports: [
    ChannelModule,
    ChannelMessageModule,
    ChannelUserModule,
    FriendModule,
  ],
})
export class ChatModule {}
