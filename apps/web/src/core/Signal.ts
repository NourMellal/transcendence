class Signal<T> {
  private value: T;
  private subscribers: Set<(value: T) => void> = new Set();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get() { return this.value; }
  
  set(newValue: T) {
    if (this.value !== newValue) {
      this.value = newValue;
      this.notify();
    }
  }

  subscribe(callback: (value: T) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback); // unsubscribe
  }

  private notify() {
    this.subscribers.forEach(callback => callback(this.value));
  }
}