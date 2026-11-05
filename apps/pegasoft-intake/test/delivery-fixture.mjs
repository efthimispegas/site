import { createAdmissionCoordinator } from '../src/admission.js';
import { createDeliveryCoordinator } from '../src/delivery.js';
export function memoryStorage() {
  const items = new Map();
  const storage = {
    items,
    get: async (key) => globalThis.structuredClone(items.get(key)),
    put: async (key, value) => {
      items.set(key, globalThis.structuredClone(value));
    },
    transaction: async (callback) => {
      const backup = globalThis.structuredClone(items),
        alarm = storage.alarmAt;
      try {
        return await callback(storage);
      } catch (error) {
        items.clear();
        for (const [key, value] of backup) items.set(key, value);
        storage.alarmAt = alarm;
        throw error;
      }
    },
    delete: async (key) => items.delete(key),
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
    allocated: () => objects.size,
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

export const isolatedAdmission = async () => ({
  allowed: true,
  lease: 'synthetic-lease',
});
export function admissionBinding(env, options) {
  const coordinator = createAdmissionCoordinator(memoryStorage(), options);
  let ready;
  const ns = {
    jurisdiction(value) {
      if (value !== 'eu') throw Error('jurisdiction');
      return ns;
    },
    idFromName(value) {
      return value;
    },
    get() {
      return {
        async fetch(request) {
          ready ||= coordinator.run('/reconcile', {}, env);
          await ready;
          try {
            const result = await coordinator.run(
              new URL(request.url).pathname,
              await request.json(),
              env,
            );
            return Response.json(result, {
              status: result.allowed ? 200 : 503,
            });
          } catch {
            return Response.json({ allowed: false }, { status: 503 });
          }
        },
      };
    },
  };
  return ns;
}
