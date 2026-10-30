import { createDeliveryCoordinator } from '../src/delivery.js';
export function memoryStorage() {
  const items = new Map();
  const storage = {
    items,
    get: async (key) => globalThis.structuredClone(items.get(key)),
    put: async (key, value) => {
      items.set(key, globalThis.structuredClone(value));
    },
    transaction: async (callback) => callback(storage),
    setAlarm: async (value) => {
      storage.alarmAt = value;
    },
    deleteAll: async () => {
      items.clear();
    },
  };
  return storage;
}
export function deliveryBinding(env, options) {
  const objects = new Map();
  const ns = {
    jurisdiction(value) {
      if (value !== 'eu') throw Error('jurisdiction');
      return ns;
    },
    idFromName(value) {
      return value;
    },
    get(id) {
      if (!objects.has(id))
        objects.set(id, createDeliveryCoordinator(memoryStorage(), options));
      return {
        async fetch(request) {
          try {
            const result = await objects.get(id).run(await request.json(), env);
            return Response.json(result, { status: result.status });
          } catch {
            return Response.json(
              { code: 'intake_unavailable' },
              { status: 503 },
            );
          }
        },
      };
    },
  };
  return ns;
}
