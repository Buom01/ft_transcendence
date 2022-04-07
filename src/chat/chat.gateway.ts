import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AppGateway');

  //#region Channel
  @SubscribeMessage('chat::channel::send')
  channelGet(client: Socket, payload: string): void {}

  //#endregion Channel

  //#region Channel message

  //#endregion Channel message

  //#region Channel User

  //#endregion Channel User

  //#region Friend

  //#endregion Friend
  @SubscribeMessage('chat::channel::')
  join(client: Socket, payload: string): void {
    this.server.emit('chat:join', payload);
  }

  @SubscribeMessage('chat:send')
  send(client: Socket, payload: string): void {
    this.server.emit('chat:send', payload);
  }

  @SubscribeMessage('chat:quit')
  quit(client: Socket, payload: string): void {
    this.server.emit('chat:quit', payload);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  afterInit(server: Server) {
    this.logger.log('Chat init');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} is disconnected`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client ${client.id} is connected`);
  }
}
