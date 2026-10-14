import {createJourneyHost} from './journey-host.js';

export const journey = createJourneyHost(document.querySelector('main'));
journey.mount();
if (import.meta.hot) import.meta.hot.dispose(() => journey.dispose());
