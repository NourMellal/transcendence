export class Signal<T> {
  private value: T;
  private subscribers: Array<(value: T) => void> = [];

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get(): T {
    return this.value;
  }

  set(newValue: T): void {
    this.value = newValue;
    this.subscribers.forEach((callback) => callback(this.value));
  }

  update(updater: (current: T) => T): void {
    this.set(updater(this.value));
  }

  subscribe(callback: (value: T) => void): () => void {
    this.subscribers.push(callback);
    callback(this.value);

    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }
}



