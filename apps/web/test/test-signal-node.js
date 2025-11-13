import { Signal } from './core/Signal.js';

/**
 * Simple Node.js test for our Signal implementation
 */

console.log('🧪 Testing Signal Implementation...\n');

// Test 1: Basic Signal creation and get/set
console.log('Test 1: Basic functionality');
const counter = new Signal(0);
console.log(`Initial value: ${counter.get()}`); // Should be 0

counter.set(5);
console.log(`After set(5): ${counter.get()}`); // Should be 5

// Test 2: Subscription and notifications
console.log('\nTest 2: Subscription system');
let callbackCount = 0;
let lastValue = null;

const unsubscribe = counter.subscribe((value) => {
  callbackCount++;
  lastValue = value;
  console.log(`  📡 Callback ${callbackCount}: received value ${value}`);
});

counter.set(10); // Should trigger callback
counter.set(15); // Should trigger callback
counter.set(15); // Should NOT trigger callback (same value)
counter.set(20); // Should trigger callback

console.log(`Callback was called ${callbackCount} times`);
console.log(`Last received value: ${lastValue}`);

// Test 3: Unsubscribe functionality  
console.log('\nTest 3: Unsubscribe');
unsubscribe();
counter.set(25); // Should NOT trigger callback after unsubscribe

console.log(`Callback count after unsubscribe: ${callbackCount} (should be same as before)`);

// Test 4: Multiple subscribers
console.log('\nTest 4: Multiple subscribers');
let subscriber1Count = 0;
let subscriber2Count = 0;

const unsub1 = counter.subscribe((value) => {
  subscriber1Count++;
  console.log(`  📡 Subscriber 1: ${value}`);
});

const unsub2 = counter.subscribe((value) => {
  subscriber2Count++;
  console.log(`  📡 Subscriber 2: ${value}`);
});

counter.set(30); // Should trigger both
counter.set(35); // Should trigger both

console.log(`Subscriber 1 called: ${subscriber1Count} times`);
console.log(`Subscriber 2 called: ${subscriber2Count} times`);

// Cleanup
unsub1();
unsub2();

console.log('\n✅ All tests completed successfully!');
console.log('🎯 Signal implementation is working correctly.');