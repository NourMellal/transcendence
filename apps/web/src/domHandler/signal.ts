// /domHandler/signal.ts
export class Signal<T> {
    private value: T;
    private subscribers: Set<(value: T) => void> = new Set();

    // runtime hook used by effect() to collect dependencies
    static activeTracker: { run: () => void; addUnsub: (u: () => void) => void } | null = null;

    constructor(initialValue: T) {
        this.value = initialValue;
    }

    get() {
        // If an effect is active, subscribe it to this signal
        if (Signal.activeTracker) {
            // callback ignores incoming value, only triggers the effect runner
            const cb = () => Signal.activeTracker!.run();
            const unsub = this.subscribe(cb as (value: T) => void);
            Signal.activeTracker.addUnsub(unsub);
        }
        return this.value;
    }

    set(newValue: T) {
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
        // copy to avoid mutation during iteration
        Array.from(this.subscribers).forEach(cb => cb(this.value));
    }
}

// convenience API returning [get, set]
export function createSignal<T>(initial: T): [() => T, (v: T) => void] {
    const s = new Signal<T>(initial);
    return [() => s.get(), (v: T) => s.set(v)];
}

// effect that auto-tracks signals used during fn
export function effect(fn: () => void) {
    let unsubs: (() => void)[] = [];

    const run = () => {
        // cleanup previous subscriptions
        unsubs.forEach(u => u());
        unsubs = [];

        // Install tracker so signals register this effect during their .get()
        const tracker = {
            run,
            addUnsub: (u: () => void) => unsubs.push(u),
        };

        Signal.activeTracker = tracker;
        try {
            fn();
        } finally {
            Signal.activeTracker = null;
        }
    };

    run();

    // return cleanup
    return () => {
        unsubs.forEach(u => u());
        unsubs = [];
    };
}
