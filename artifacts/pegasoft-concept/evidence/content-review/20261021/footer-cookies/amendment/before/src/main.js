import {createLocalization} from './localization.js';
import './hero-opening.css';
import './outcome.css';
import './loader.css';
import './website-motion.css';
import './content-sections.css';
import './localization.css';
import {createContentController} from './content-controller.js';
import {createJourneyHost} from './journey-host.js';

const languages=createLocalization({document,onChange(){content.refreshLanguage();journey.refreshLanguage();}});
export const journey = createJourneyHost(document.querySelector('main'));
const ready=journey.mount();
export const content=createContentController({root:document.querySelector('main'),journey});content.mount();ready.then(()=>content.followInitialHash());
if (import.meta.hot) import.meta.hot.dispose(() => {languages.dispose();content.dispose();journey.dispose();});
