import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { ChatModule } from './chat/chat.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [DatabaseModule, ChatModule, UserModule],
})
export class AppModule {}
