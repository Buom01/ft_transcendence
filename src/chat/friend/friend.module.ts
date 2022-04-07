import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friend } from './../orm/friend.entity';
import { FriendService } from './friend.service';
import { FriendController } from './friend.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Friend])],
  controllers: [FriendController],
  providers: [FriendService],
})
export class FriendModule {}
