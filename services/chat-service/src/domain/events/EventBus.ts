import { DomainEvent } from "./DomainEvent";
import { EventHandler , IEventBus } from "./IeventBus";

export class EventBus implements IEventBus { 
    private handlers : Map<string , EventHandler<any>[]> = new Map()

    subscribe<T extends DomainEvent>( 
    eventType: new (...args: any[]) => T,
    handler: EventHandler<T>
    ) : void { 
        const eventName  = eventType.name ;  
        if(!this.handlers.has(eventName)){ 
            this.handlers.set(eventName , [])
        } 
        this.handlers.get(eventName)?.push(handler)
    }  

    async publish(event : DomainEvent) : Promise<void> { 
          const eventName =  event.eventName
          const handlers = this.handlers.get(eventName)  || [] 
       await Promise.all(
        handlers.map(handler => 
        Promise.resolve(handler(event)).catch(error => {
          console.error(`Error in event handler for ${eventName}:`, error);
        })
      )
    );
    }

}   
