import type {
  HeroJourneySnapshot,
  HeroReferenceStateKey,
} from './hero-contract';
import styles from './hero-scene.module.css';

type HeroFallbackComposition =
  | 'loader'
  | 'landing'
  | 'journey'
  | 'field'
  | 'arrival'
  | 'exit';

function getFallbackComposition(
  key: HeroReferenceStateKey,
): HeroFallbackComposition {
  if (key === 'loader-mark' || key === 'world-reveal') {
    return 'loader';
  }
  if (key === 'landing' || key === 'landing-idle') {
    return 'landing';
  }
  if (key.startsWith('field-')) {
    return 'field';
  }
  if (key.startsWith('arrival-')) {
    return 'arrival';
  }
  if (key === 'journey-exit') {
    return 'exit';
  }
  return 'journey';
}

function LoaderFallback() {
  return (
    <>
      <g className={styles.fallbackLoaderOrbit} data-hero-fallback-shape="">
        <ellipse cx="720" cy="450" rx="610" ry="325" />
      </g>
      <g className={styles.fallbackLoaderOrbit} data-hero-fallback-shape="">
        <circle cx="720" cy="450" r="218" />
      </g>
      <g className={styles.fallbackLoaderNodes} data-hero-fallback-shape="">
        <rect x="705" y="204" width="30" height="30" />
        <rect
          x="894"
          y="260"
          width="30"
          height="30"
          transform="rotate(45 909 275)"
        />
        <rect x="936" y="435" width="30" height="30" />
        <rect
          x="894"
          y="610"
          width="30"
          height="30"
          transform="rotate(45 909 625)"
        />
        <rect x="705" y="666" width="30" height="30" />
        <rect
          x="516"
          y="610"
          width="30"
          height="30"
          transform="rotate(45 531 625)"
        />
        <rect x="474" y="435" width="30" height="30" />
        <rect
          x="516"
          y="260"
          width="30"
          height="30"
          transform="rotate(45 531 275)"
        />
      </g>
      <g className={styles.fallbackLoaderMark} data-hero-fallback-shape="">
        <path d="M576 421H700L651 372L684 339L789 444L684 549L651 516L700 467H576Z" />
      </g>
    </>
  );
}

function LandingFallback({ idle }: { idle: boolean }) {
  return (
    <>
      <g className={styles.fallbackGround} data-hero-fallback-shape="">
        <path d="M0 673L455 492H1165L1440 615V900H0Z" />
      </g>
      <g className={styles.fallbackRedRoute} data-hero-fallback-shape="">
        <path d="M0 675H284L398 601H548" />
        {idle ? <circle cx="284" cy="675" r="14" /> : null}
      </g>
      <g className={styles.fallbackTower} data-hero-fallback-shape="">
        <path d="M538 375L656 327L656 663L538 711Z" />
        <path d="M656 327L726 365L726 700L656 663Z" />
      </g>
      <g className={styles.fallbackBlocks} data-hero-fallback-shape="">
        <path d="M905 494L1030 443L1110 485L985 536Z" />
        <path d="M1030 443V581L1110 623V485Z" />
        <path d="M985 536V674L1110 623V485Z" />
        <path d="M1194 572L1325 519V704L1194 757Z" />
      </g>
    </>
  );
}

function JourneyFallback({ progress }: { progress: number }) {
  const normalized = Math.min(1, Math.max(0, progress / 0.74));
  const packetX = 210 + normalized * 840;
  const packetY = 652 - normalized * 220;

  return (
    <>
      <g className={styles.fallbackGround} data-hero-fallback-shape="">
        <path d="M0 718L357 535H1094L1440 660V900H0Z" />
      </g>
      <g className={styles.fallbackJourneyRoute} data-hero-fallback-shape="">
        <path d="M0 680H210C335 680 331 548 462 548H767C883 548 875 430 1050 430H1440" />
      </g>
      <g className={styles.fallbackJourneyPacket} data-hero-fallback-shape="">
        <circle cx={packetX} cy={packetY} r="17" />
        <circle cx={packetX} cy={packetY} r="34" />
      </g>
      <g
        className={styles.fallbackJourneyLandmarks}
        data-hero-fallback-shape=""
      >
        <path d="M428 431L514 396V629L428 664Z" />
        <path d="M514 396L563 423V656L514 629Z" />
        <path d="M1004 334L1108 292V522L1004 564Z" />
        <path d="M1108 292L1165 323V553L1108 522Z" />
      </g>
    </>
  );
}

function FieldFallback({ stateKey }: { stateKey: HeroReferenceStateKey }) {
  const pulseOuter = stateKey === 'field-pulse-b';
  const pulseInner = stateKey === 'field-pulse-a';

  return (
    <>
      <g className={styles.fallbackFieldOuter} data-hero-fallback-shape="">
        <rect x="389" y="337" width="96" height="70" rx="7" />
        <rect x="955" y="337" width="96" height="70" rx="7" />
        <rect x="389" y="595" width="96" height="70" rx="7" />
        <rect x="955" y="595" width="96" height="70" rx="7" />
      </g>
      <g
        className={
          pulseOuter ? styles.fallbackFieldPulse : styles.fallbackFieldMiddle
        }
        data-hero-fallback-shape=""
      >
        <rect x="503" y="391" width="96" height="70" rx="7" />
        <rect x="841" y="391" width="96" height="70" rx="7" />
        <rect x="503" y="541" width="96" height="70" rx="7" />
        <rect x="841" y="541" width="96" height="70" rx="7" />
      </g>
      <g
        className={
          pulseInner ? styles.fallbackFieldPulse : styles.fallbackFieldInner
        }
        data-hero-fallback-shape=""
      >
        <rect x="617" y="445" width="96" height="70" rx="7" />
        <rect x="727" y="445" width="96" height="70" rx="7" />
        <rect x="617" y="487" width="96" height="70" rx="7" />
        <rect x="727" y="487" width="96" height="70" rx="7" />
      </g>
      <g className={styles.fallbackFieldRoute} data-hero-fallback-shape="">
        <path d="M0 501H597" />
        <circle cx="597" cy="501" r="15" />
      </g>
    </>
  );
}

function ArrivalFallback({ locked }: { locked: boolean }) {
  const offset = locked ? 0 : 92;

  return (
    <>
      <g className={styles.fallbackArrivalGround} data-hero-fallback-shape="">
        <path d="M0 698L340 551H1150L1440 655V900H0Z" />
      </g>
      <g
        className={styles.fallbackArrivalRoute}
        data-hero-fallback-shape=""
        transform={`translate(${-offset} 0)`}
      >
        <path d="M0 585H610" />
        <circle cx="610" cy="585" r="15" />
      </g>
      <g
        className={styles.fallbackArrivalMark}
        data-hero-fallback-shape=""
        transform={`translate(${offset} 0)`}
      >
        <path d="M600 526H767L705 464L764 405L925 566L764 727L705 668L767 606H600Z" />
      </g>
      <g className={styles.fallbackArrivalPads} data-hero-fallback-shape="">
        <rect x="451" y="398" width="82" height="82" rx="8" />
        <rect x="998" y="447" width="82" height="82" rx="8" />
        <rect x="959" y="646" width="82" height="82" rx="8" />
      </g>
    </>
  );
}

function ExitFallback() {
  return (
    <>
      <g className={styles.fallbackExitWorld} data-hero-fallback-shape="">
        <path d="M0 573L354 446H1112L1440 537V690H0Z" />
      </g>
      <g className={styles.fallbackExitRoute} data-hero-fallback-shape="">
        <path d="M0 516H548" />
        <path d="M538 477L577 516L538 555" />
      </g>
      <g className={styles.fallbackExitPanel} data-hero-fallback-shape="">
        <path d="M0 690H1440V900H0Z" />
      </g>
      <g className={styles.fallbackExitBars} data-hero-fallback-shape="">
        <rect x="864" y="748" width="298" height="15" rx="7.5" />
        <rect x="864" y="784" width="205" height="11" rx="5.5" />
        <rect x="864" y="818" width="250" height="11" rx="5.5" />
      </g>
    </>
  );
}

export function HeroFallback({ snapshot }: { snapshot: HeroJourneySnapshot }) {
  const stateKey = snapshot.referenceState.key;
  const composition = getFallbackComposition(stateKey);
  const developmentDiagnostics =
    process.env.NODE_ENV !== 'production'
      ? {
          'data-hero-fallback-state': stateKey,
          'data-hero-fallback-composition': composition,
        }
      : {};

  return (
    <div
      className={`${styles.field} ${styles.fallback}`}
      data-hero-surface="fallback"
      {...developmentDiagnostics}
      aria-hidden="true"
    >
      <svg
        className={styles.fallbackArt}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        {composition === 'loader' ? <LoaderFallback /> : null}
        {composition === 'landing' ? (
          <LandingFallback idle={stateKey === 'landing-idle'} />
        ) : null}
        {composition === 'journey' ? (
          <JourneyFallback progress={snapshot.sceneTargetProgress} />
        ) : null}
        {composition === 'field' ? <FieldFallback stateKey={stateKey} /> : null}
        {composition === 'arrival' ? (
          <ArrivalFallback locked={stateKey === 'arrival-lockup'} />
        ) : null}
        {composition === 'exit' ? <ExitFallback /> : null}
      </svg>
    </div>
  );
}
