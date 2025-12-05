 import { parseArgs } from "util";
import { MessageId } from "../value-objects/MessageId";  
 import { MessageContent } from "../value-objects/messageContents";   
 import { MessageType } from "../value-objects/messageType";    

 export class Message {  
    private constructor(
        private readonly _id: MessageId,
        private readonly _senderId: string,
        private readonly _senderUsername: string,
        private readonly _content: MessageContent,
        private readonly _type: MessageType,
        private readonly _recipientId: string | undefined,
        private readonly _gameId: string | undefined,
        private readonly _createdAt: Date
  ){}   

  static create  (params:  {     
     senderId: string;
    senderUsername: string;
    content: string;
    type: MessageType;
    recipientId?: string;
    gameId?: string;
  } )  : Message
  {    
      return new Message(  
      MessageId.create()  ,
      params.senderId,
      params.senderUsername,
      
      new MessageContent(params.content) ,
      params.type,
      params.recipientId,
      params.gameId,
      new Date()     
      )
  }    

 static reconstitute(params: {
    id: string;
    senderId: string;
    senderUsername: string;
    content: string;
    type: MessageType;
    recipientId?: string;
    gameId?: string;
    createdAt: Date;
  }): Message {
    const id = MessageId.from(params.id);
    const content = new MessageContent(params.content);

    return new Message(
      id,
      params.senderId,
      params.senderUsername,
      content,
      params.type,
      params.recipientId,
      params.gameId,
      params.createdAt
    );
  }

  private static validateBusinessRules(params: {
    senderId: string;
    senderUsername: string;
    type: MessageType;
    recipientId?: string;
    gameId?: string;
  }): void {
    if (!params.senderId || params.senderId.trim() === '') {
      throw new Error('SenderId is required');
    }
    if (!params.senderUsername || params.senderUsername.trim() === '') {
      throw new Error('SenderUsername is required');
    }
    if (params.type === MessageType.PRIVATE && !params.recipientId) {
      throw new Error('PRIVATE messages require a recipientId');
    }
    if (params.type === MessageType.GAME && !params.gameId) {
      throw new Error('GAME messages require a gameId');
    }
    if (params.type === MessageType.GLOBAL) {
      if (params.recipientId) {
        throw new Error('GLOBAL messages cannot have a recipientId');
      }
      if (params.gameId) {
        throw new Error('GLOBAL messages cannot have a gameId');
      }
    }
  }   

  get id(): MessageId {
    return this._id;
  }

  get senderId(): string {
    return this._senderId;
  }

  get senderUsername(): string {
    return this._senderUsername;
  }

  get content(): MessageContent {
    return this._content;
  }

  get type(): MessageType {
    return this._type;
  }

  get recipientId(): string | undefined {
    return this._recipientId;
  }

  get gameId(): string | undefined {
    return this._gameId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  isPrivate(): boolean {
    return this._type === MessageType.PRIVATE;
  }

  isGlobal(): boolean {
    return this._type === MessageType.GLOBAL;
  }

  isGameMessage(): boolean {
    return this._type === MessageType.GAME;
  }  
   
    toJson(): {
    id: string;
    senderId: string;
    senderUsername: string;
    content: string;
    type: MessageType;
    recipientId?: string;
    gameId?: string;
    createdAt: string;
  }  {  
            return( { 
                    id :  this._id.toString() ,   
                    senderId :  this._senderId  ,  
                    senderUsername : this._senderUsername ,  
                    content:  this.content.toString()  ,   
                    type : this._type ,      
                    recipientId:this._recipientId,   
                    gameId : this._gameId ,    
                    createdAt : this._createdAt.toISOString() ,   
            }) 
  }

}   

