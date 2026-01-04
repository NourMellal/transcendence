export abstract class  DomainEvent { 
   public readonly occurredAt : Date  ;    
   public readonly eventId: string;
   public readonly eventName: string;      
  constructor() {  
      this.occurredAt =  new Date() ;   
      this.eventId = this.generateEventId();  
      this.eventName = this.constructor.name
  }   
private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  } 
  abstract getAggregateId() :string ; 
  toJSON() : Record<string , any> {  
        return  { 
            eventId : this.eventId,   
            eventName : this.eventName,
            occurredAt : this.occurredAt.toISOString(),
            aggregateId : this.getAggregateId(),
            data: this.getEventData()
        }
  }
  protected abstract getEventData() :Record<string ,  any>  ;   
  
} 
