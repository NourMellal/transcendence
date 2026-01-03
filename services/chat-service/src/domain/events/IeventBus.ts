import { DomainEvent } from "./DomainEvent";
export type EventHandler<T extends DomainEvent> = (event : T)=>void | Promise<void>

export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: EventHandler<T>
  ): void;
}  

