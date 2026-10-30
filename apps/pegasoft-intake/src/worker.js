import { createIntake } from './intake.js';
const intake = createIntake();
export default {
  fetch: (request, env) => intake.fetch(request, env),
  scheduled: (_event, env, context) => context.waitUntil(intake.expire(env)),
};

export { IntakeDelivery } from './delivery.js';

export { IntakeAdmission } from './admission.js';
