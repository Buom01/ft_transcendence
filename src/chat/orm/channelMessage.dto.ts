export interface ChannelMessageDTO {
  id: number;
  channelId: number;
  userId: number;
  message: string;
  creation: Date;
  modification: Date;
}
