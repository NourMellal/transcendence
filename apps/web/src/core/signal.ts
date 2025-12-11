type Tracker = { run: () => void; addUnsub: (u: () => void) => void };

export default class Signal<T> {
    private value: T;
    private subscribers: Set<(value: T) => void> = new Set();
    private static trackerStack: Array<Tracker> = [];

    static pushTracker(t: Tracker) {
        Signal.trackerStack.push(t);
    }

    static popTracker() {
        Signal.trackerStack.pop();
    }

    static getActiveTracker(): Tracker | null {
        return Signal.trackerStack[Signal.trackerStack.length - 1] ?? null;
    }

    constructor(initialValue: T ) {
        this.value = initialValue;
    }

    get() {
        const active = Signal.getActiveTracker();
        if (active) {
            const cb = () => active.run();
            const unsub = this.subscribe(cb as (value: T) => void);
            active.addUnsub(unsub);
        }
        return this.value;
    }

    set(newValue: T )  {
        if (this.value !== newValue) {
            this.value = newValue;
            this.notify();
        }
    }

    subscribe(callback: (value: T) => void) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    private notify() {
        Array.from(this.subscribers).forEach(cb => cb(this.value));
    }
}

export function createSignal<T>(initial: T): [() => T, (v: T) => void] {
    const s = new Signal<T>(initial);
    return [() => s.get(), (v: T) => s.set(v)];
}

export function effect(fn: () => void) {
    let unsubs: (() => void)[] = [];

    const run = () => {
        unsubs.forEach(u => u());
        unsubs = [];
        const tracker = {
            run,
            addUnsub: (u: () => void) => unsubs.push(u),
        };

        Signal.pushTracker(tracker);
        try {
            fn();
        } finally {
            Signal.popTracker();
        }
    };
    run();
    return () => {
        unsubs.forEach(u => u());
        unsubs = [];
    };
}

export const globalCounter = new Signal<number>(0);
