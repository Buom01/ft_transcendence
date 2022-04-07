export interface ChannelUserDTO {
  id: number;
  channelId: number;
  userId: number;
  isMuted: Date;
  isBlocked: boolean;
  isAdmin: boolean;
  isCreator: boolean;
}
