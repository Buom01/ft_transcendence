import { Module } from '@nestjs/common';
import { ChannelModule } from './channel/channel.module';
import { ChannelMessageModule } from './channelMessage/channelMessage.module';
import { ChannelUserModule } from './channelUser/channelUser.module';
import { ChatGateway } from './chat.gateway';
import { FriendModule } from './friend/friend.module';

@Module({
  imports: [
    ChannelModule,
    ChannelMessageModule,
    ChannelUserModule,
    FriendModule,
  ],
  providers: [],
})
export class ChatModule {}
