// eventBus.ts
import { EventEmitter } from 'events';
const emitter = new EventEmitter();

export const eventBus = {
  on(event: string, listener: (...args: any[]) => void) {
    emitter.on(event, listener);
    return () => {
      emitter.off(event, listener); // ✅ unsubscribe function
    };
  },
  emit(event: string, ...args: any[]) {
    emitter.emit(event, ...args);
  },
};