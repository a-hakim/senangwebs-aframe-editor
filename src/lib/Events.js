import EventEmitter from 'events';

const Events = new EventEmitter();
Events.setMaxListeners(100);

export function createEventScope() {
  const subscriptions = [];
  return {
    on(name, handler) {
      Events.on(name, handler);
      subscriptions.push([name, handler]);
    },
    dispose() {
      subscriptions
        .splice(0)
        .forEach(([name, handler]) => Events.off(name, handler));
    }
  };
}

export default Events;
