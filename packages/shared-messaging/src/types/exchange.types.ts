export enum ExchangeType {
    DIRECT = 'direct',
    FANOUT = 'fanout',
    TOPIC = 'topic',
    HEADERS = 'headers',
}

export interface Exchange {
    name: string;
    type: ExchangeType;
}

export const Exchanges = {
    USER: {name: 'user.events', type: ExchangeType.TOPIC},
    CHAT: {name: 'chat.events', type: ExchangeType.TOPIC},
    GAME: {name: 'game.events', type: ExchangeType.TOPIC},
    TOURNAMENT: {name: 'tournament', type: ExchangeType.TOPIC},
}