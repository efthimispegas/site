'use client';

import clsx from 'clsx';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  HeroJourneySnapshot,
  HeroPageScrollMeasurement,
} from './hero-scene/hero-contract';
import type { HeroDevelopmentDiagnostics } from './hero-scene/hero-development-diagnostics';
import type { HeroAttemptState } from './hero-scene/hero-attempt';
import { HeroScene } from './hero-scene/hero-scene';
import { HERO_TEST_DIAGNOSTICS } from './hero-scene/hero-test-diagnostics';
import {
  getScrollYForRawJourneyProgress,
  getScrollYForSceneProgress,
  getEffectiveHeroHeight,
  isHeroMobileDevice,
  HERO_STEP_STARTS,
  HERO_STEP_NAVIGATION_OFFSETS,
} from './hero-scene/hero-sequence';
import heroStyles from './hero-scene/hero-shell.module.css';
import { useHeroJourneyController } from './hero-scene/use-hero-controller';
import styles from './pegasoft-home.module.css';

const flowSteps = [
  {
    number: '01',
    title: 'Signal becomes system',
    body: 'A loose product brief turns into an operating map with priorities, risks, acceptance criteria, and delivery intent before the build gets expensive.',
  },
  {
    number: '02',
    title: 'Interface logic takes shape',
    body: 'Pegasoft designs product flows, screen systems, motion rules, and design tokens that can survive handoff without turning fragile in code.',
  },
  {
    number: '03',
    title: 'Quality is engineered early',
    body: 'Accessibility, performance posture, responsive behavior, and implementation guardrails are folded into the system before launch pressure starts to bend it.',
  },
  {
    number: '04',
    title: 'Proof stays honest',
    body: 'Concept Lab studies stay clearly labeled, client portfolio work stays earned, and the site tells the truth about what is exploratory versus approved.',
  },
];

const features = [
  {
    title: 'Rapid framing',
    body: 'We shorten the distance between product intent and a buildable operating model.',
  },
  {
    title: 'Delivery-grade systems',
    body: 'The design language is structured for implementation, not for static approval only.',
  },
  {
    title: 'Measured motion',
    body: 'Interaction polish is treated like product behavior, with restraint, accessibility, and hierarchy.',
  },
  {
    title: 'Honest proof',
    body: 'Concepts, real work, and capability claims stay cleanly separated so credibility holds.',
  },
];

const faqItems = [
  {
    question: 'How does Pegasoft start a new engagement?',
    answer:
      'We begin by framing scope, product goals, and delivery risk together. That produces a decision map, experience direction, and quality bar before visual detail starts to outrun clarity.',
  },
  {
    question: 'Does Pegasoft only design, or also support delivery?',
    answer:
      'Delivery quality is part of the offer. We shape interface systems, implementation priorities, accessibility expectations, and release readiness so the work lands well beyond the prototype.',
  },
  {
    question: 'How do you handle Concept Lab versus real portfolio work?',
    answer:
      'Concept Lab studies are clearly presented as speculative explorations. Client and product portfolio work appears only when permission, assets, and source truth are approved.',
  },
  {
    question: 'What kinds of teams are the best fit?',
    answer:
      'Pegasoft works best with founders, product teams, and premium digital businesses that care as much about shipping quality as they do about looking polished in the deck.',
  },
];

const INITIAL_PAGE_MEASUREMENT: HeroPageScrollMeasurement = {
  measurementSequence: 0,
  measuredAtMs: 0,
  viewportWidth: 1440,
  effectiveHeroHeight: 900,
  wrapperHeight: 900,
  scrollY: 0,
  viewportHeight: 900,
  flowDocumentTop: 0,
  flowHeight: 900,
  fieldSectionViewportTop: null,
};

type HeroShellDiagnosticsFactory = (
  snapshot: HeroJourneySnapshot,
) => HeroDevelopmentDiagnostics;

function pageMeasurementsMatch(
  current: HeroPageScrollMeasurement,
  next: HeroPageScrollMeasurement,
) {
  const fieldTopMatches =
    current.fieldSectionViewportTop === next.fieldSectionViewportTop ||
    (current.fieldSectionViewportTop !== null &&
      next.fieldSectionViewportTop !== null &&
      Math.abs(current.fieldSectionViewportTop - next.fieldSectionViewportTop) <
        0.01);

  return (
    Math.abs(current.scrollY - next.scrollY) < 0.01 &&
    Math.abs(current.viewportHeight - next.viewportHeight) < 0.01 &&
    Math.abs(current.flowDocumentTop - next.flowDocumentTop) < 0.01 &&
    current.viewportWidth === next.viewportWidth &&
    current.effectiveHeroHeight === next.effectiveHeroHeight &&
    current.wrapperHeight === next.wrapperHeight &&
    Math.abs(current.flowHeight - next.flowHeight) < 0.01 &&
    fieldTopMatches
  );
}

function PegasoftLoader({
  hidden,
  revealing,
  direct,
}: {
  hidden: boolean;
  revealing: boolean;
  direct: boolean;
}) {
  return (
    <div
      className={heroStyles.loader}
      data-hidden={hidden}
      data-revealing={revealing}
      data-direct={direct}
      aria-hidden="true"
    >
      <svg
        className={heroStyles.loaderCore}
        width="96"
        height="96"
        viewBox="0 0 96 96"
        fill="none"
        overflow="visible"
      >
        <defs>
          <mask id="pegasoft-loader-arrow-mask">
            <path
              d="M14.0002 13.9917L47.0002 46.9917"
              stroke="white"
              strokeWidth="16.1"
            />
            <path
              d="M14.0002 81.9917L47.0002 48.9917"
              stroke="white"
              strokeWidth="16.1"
            />
            <path d="M0 47.9917H56" stroke="white" strokeWidth="16.1" />
          </mask>
        </defs>
        <g fill="currentColor">
          <path d="M39.9963 96.0002H55.9926V80.0039H39.9963V96.0002Z" />
          <path d="M76.2787 87.59L64.9673 76.2787L76.2787 64.9673L87.59 76.2787L76.2787 87.59Z" />
          <path d="M80.0039 55.9926V39.9963H96.0001V55.9926H80.0039Z" />
          <path d="M76.2899 8.39893L87.6013 19.7103L76.2899 31.0217L64.9785 19.7103L76.2899 8.39893Z" />
          <path d="M40.0076 0H56.0038V15.9962H40.0076V0Z" />
          <path d="M19.7216 87.59L31.033 76.2787L19.7216 64.9673L8.41019 76.2787L19.7216 87.59Z" />
          <path d="M15.9963 55.9926V39.9963H9.91821e-05V55.9926H15.9963Z" />
          <path d="M19.7103 8.39893L8.39896 19.7103L19.7103 31.0217L31.0217 19.7103L19.7103 8.39893Z" />
        </g>
        <path
          d="M53.6557 53.6557C56.7827 50.5287 56.7827 45.4713 53.6557 42.3443V42.3556L19.7103 8.41016L13.7046 14.4158L8.39887 19.7215L28.6736 40.0188H0V56.015H28.6849L19.7103 64.9784L8.39887 76.2897L19.7103 87.6011L53.6557 53.6557Z"
          fill="currentColor"
          mask="url(#pegasoft-loader-arrow-mask)"
        />
      </svg>
      <svg
        className={clsx(
          heroStyles.loaderEllipse,
          heroStyles.loaderEllipseOuter,
        )}
        viewBox="0 0 1500 800"
      >
        <ellipse cx="750" cy="400" rx="749" ry="399" />
      </svg>
      <svg
        className={clsx(
          heroStyles.loaderEllipse,
          heroStyles.loaderEllipseInner,
        )}
        viewBox="0 0 800 800"
      >
        <ellipse cx="400" cy="400" rx="399" ry="399" />
      </svg>
    </div>
  );
}

export function PegasoftHome() {
  const bookingUrl =
    process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'mailto:hello@pegasoft.studio';

  const flowRef = useRef<HTMLElement>(null);
  const flowWrapperRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const standardsRef = useRef<HTMLElement>(null);
  const faqRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavigationRef = useRef<HTMLElement>(null);
  const featureRefs = useRef<Array<HTMLDivElement | null>>([]);
  const initializedDirectStateRef = useRef<string | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroAttemptState, setHeroAttemptState] =
    useState<HeroAttemptState>('initializing');
  const [pageMeasurement, setPageMeasurement] =
    useState<HeroPageScrollMeasurement>(INITIAL_PAGE_MEASUREMENT);
  const [activeFaqIndex, setActiveFaqIndex] = useState(0);
  const [headerWhite, setHeaderWhite] = useState(false);
  const [getDevelopmentHeroDiagnostics, setGetDevelopmentHeroDiagnostics] =
    useState<HeroShellDiagnosticsFactory | null>(null);
  const heroJourney = useHeroJourneyController(pageMeasurement);
  const developmentHeroDiagnostics =
    getDevelopmentHeroDiagnostics?.(heroJourney) ?? {};
  const usableFallback = heroAttemptState === 'fallback';
  const sceneReady = heroAttemptState === 'ready';
  const loaderRevealing =
    usableFallback ||
    heroJourney.motion === 'reduced' ||
    heroJourney.localClocks.loaderMs >= 3200;
  const loaderHidden =
    usableFallback ||
    heroJourney.motion === 'reduced' ||
    heroJourney.localClocks.loaderMs >= 4800;
  const pageReady =
    usableFallback ||
    heroJourney.motion === 'reduced' ||
    heroJourney.localClocks.loaderMs >= 3595;
  const fieldClipBottom = Math.min(
    pageMeasurement.viewportHeight,
    Math.max(
      0,
      pageMeasurement.viewportHeight -
        (pageMeasurement.fieldSectionViewportTop ??
          pageMeasurement.viewportHeight),
    ),
  );

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && !HERO_TEST_DIAGNOSTICS) {
      return;
    }

    let active = true;

    void import('./hero-scene/hero-development-diagnostics').then(
      ({ getHeroShellDevelopmentDiagnostics }) => {
        if (active) {
          setGetDevelopmentHeroDiagnostics(
            () => getHeroShellDevelopmentDiagnostics,
          );
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle(
      'pegasoft-locked',
      mobileMenuOpen || !loaderHidden,
    );

    return () => document.body.classList.remove('pegasoft-locked');
  }, [loaderHidden, mobileMenuOpen]);

  useLayoutEffect(() => {
    const request = heroJourney.captureRequest;
    if (
      (process.env.NODE_ENV === 'production' && !HERO_TEST_DIAGNOSTICS) ||
      !request ||
      !heroJourney.progress.valid ||
      !loaderHidden
    )
      return;
    if (initializedDirectStateRef.current === request.stateKey) return;

    // Recipe selection becomes a physical scroll event. The next normal page
    // measurement determines copy, lifecycle, and DOM progress without overrides.
    const documentRoot = document.documentElement;
    const previousScrollBehavior = documentRoot.style.scrollBehavior;
    documentRoot.style.scrollBehavior = 'auto';
    window.scrollTo({
      top: getScrollYForSceneProgress(
        request.sceneTargetSelection,
        pageMeasurement,
      ),
      behavior: 'auto',
    });
    initializedDirectStateRef.current = request.stateKey;
    documentRoot.style.scrollBehavior = previousScrollBehavior;
  }, [
    heroJourney.captureRequest,
    heroJourney.progress.valid,
    loaderHidden,
    pageMeasurement,
  ]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 820) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const navigation = mobileNavigationRef.current;
    const initialFocus = navigation?.querySelector<HTMLElement>(
      '[data-mobile-nav-initial-focus]',
    );
    const focusFrame = window.requestAnimationFrame(() => {
      initialFocus?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      setMobileMenuOpen(false);
      window.requestAnimationFrame(() => {
        mobileMenuButtonRef.current?.focus();
      });
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let frame = 0;

    const revealSection = (element: HTMLElement | null) => {
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.78) {
        element.classList.add('show');
      }
    };

    const updateFeatures = (section: HTMLElement, rect: DOMRect) => {
      const total = section.offsetHeight - window.innerHeight;
      const progress =
        total <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / total));
      const segment = 1 / features.length;
      const overlap = segment * 0.3;

      featureRefs.current.forEach((item, index) => {
        if (!item) {
          return;
        }

        const start = index * segment - (index > 0 ? overlap : 0);
        const end = start + segment + overlap;
        const local = Math.min(
          1,
          Math.max(0, (progress - start) / (end - start)),
        );

        item.style.transform = `translate3d(0, ${(1 - local) * 80}px, 0)`;
      });
    };

    const updateHeader = () => {
      const darkTargets = [ctaRef.current, footerRef.current].filter(
        Boolean,
      ) as HTMLElement[];
      const headerHeight = headerRef.current?.offsetHeight ?? 80;
      const shouldWhite = darkTargets.some((target) => {
        const rect = target.getBoundingClientRect();
        return rect.top < headerHeight && rect.bottom > 0;
      });

      setHeaderWhite((previous) =>
        previous === shouldWhite ? previous : shouldWhite,
      );
    };

    let measurementSequence = 0;
    let effectiveHeroHeight = 0;
    let orientationReset = false;
    const sourceMobileDevice = isHeroMobileDevice(
      navigator.userAgent,
      'ontouchend' in document,
      Boolean((window as Window & { MSStream?: unknown }).MSStream),
    );
    const update = () => {
      frame = 0;
      const flowSection = flowRef.current;
      const featureSection = featuresRef.current;
      const flowRect = flowSection?.getBoundingClientRect();
      const featureRect = featureSection?.getBoundingClientRect();
      effectiveHeroHeight = getEffectiveHeroHeight(
        window.innerHeight,
        effectiveHeroHeight,
        sourceMobileDevice,
        orientationReset,
      );
      orientationReset = false;
      const nextMeasurement: HeroPageScrollMeasurement = {
        measurementSequence: ++measurementSequence,
        measuredAtMs: performance.now(),
        viewportWidth: window.innerWidth,
        effectiveHeroHeight,
        wrapperHeight: flowWrapperRef.current?.offsetHeight ?? 0,
        scrollY: window.scrollY,
        viewportHeight: window.innerHeight,
        flowDocumentTop: (flowRect?.top ?? 0) + window.scrollY,
        flowHeight: flowSection?.offsetHeight ?? window.innerHeight,
        fieldSectionViewportTop: featureRect?.top ?? null,
      };

      setPageMeasurement((current) =>
        pageMeasurementsMatch(current, nextMeasurement)
          ? current
          : nextMeasurement,
      );
      updateHeader();
      if (featureSection && featureRect) {
        updateFeatures(featureSection, featureRect);
      }
      revealSection(standardsRef.current);
      revealSection(faqRef.current);
      revealSection(ctaRef.current);
      revealSection(footerRef.current);
    };

    const scheduleUpdate = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(update);
    };

    const scheduleOrientationUpdate = () => {
      orientationReset = true;
      scheduleUpdate();
    };
    update();
    const geometryObserver = new ResizeObserver(scheduleUpdate);
    const flowSection = flowRef.current;
    const featureSection = featuresRef.current;

    if (flowSection) {
      geometryObserver.observe(flowSection);
    }
    if (featureSection) {
      geometryObserver.observe(featureSection);
    }

    if (flowWrapperRef.current)
      geometryObserver.observe(flowWrapperRef.current);
    window.addEventListener('orientationchange', scheduleOrientationUpdate);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    window.visualViewport?.addEventListener('resize', scheduleUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      geometryObserver.disconnect();
      window.removeEventListener(
        'orientationchange',
        scheduleOrientationUpdate,
      );
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      window.visualViewport?.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  const scrollToProcess = () => {
    window.scrollTo({
      top: pageMeasurement.flowDocumentTop,
      behavior: 'smooth',
    });
  };

  const jumpToFlowStep = (index: number) => {
    window.scrollTo({
      top: getScrollYForRawJourneyProgress(
        HERO_STEP_STARTS[index] + HERO_STEP_NAVIGATION_OFFSETS[index],
        pageMeasurement,
      ),
      behavior: 'smooth',
    });
  };
  return (
    <div
      className={clsx(styles.root, 'pegasoft-vectr-page')}
      style={
        {
          '--color-bg': '#d0e1eb',
        } as CSSProperties
      }
    >
      <PegasoftLoader
        hidden={loaderHidden}
        revealing={loaderRevealing}
        direct={heroJourney.directEntry}
      />

      <header
        ref={headerRef}
        className={clsx('pegasoft-header', {
          show: pageReady,
          'header--white': headerWhite && !mobileMenuOpen,
          'menu-open': mobileMenuOpen,
        })}
      >
        <nav className="pegasoft-header__nav-left" aria-label="Primary links">
          <Link href="/services">Services</Link>
          <Link href="/studio">Studio</Link>
        </nav>

        <div className="pegasoft-header__logo">
          <Link href="/">PEGASOFT</Link>
        </div>

        <div className="pegasoft-header__nav-right">
          <div className="pegasoft-header__ctas">
            <Link href="/work/concepts" className="pill-btn pill-btn--glass">
              <span className="pill-btn-span">Concept Lab</span>
            </Link>
            <a href={bookingUrl} className="pill-btn pill-btn--dark">
              <span className="pill-btn-span">Book a Call</span>
            </a>
          </div>

          <button
            ref={mobileMenuButtonRef}
            className="menu-btn"
            type="button"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="pegasoft-mobile-navigation"
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div
          className={clsx('mobile-nav__overlay', {
            show: mobileMenuOpen,
          })}
          onClick={() => {
            setMobileMenuOpen(false);
            window.requestAnimationFrame(() => {
              mobileMenuButtonRef.current?.focus();
            });
          }}
        />

        <nav
          ref={mobileNavigationRef}
          id="pegasoft-mobile-navigation"
          className={clsx('mobile-nav', {
            'is-open': mobileMenuOpen,
            'is-closing': !mobileMenuOpen,
          })}
          aria-label="Mobile navigation"
          aria-hidden={!mobileMenuOpen}
          inert={!mobileMenuOpen}
        >
          <div className="mobile-nav__panel-bg" />
          <div className="mobile-nav__panel">
            <div className="mobile-nav__header">
              <Link
                className="mobile-nav__logo"
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                tabIndex={mobileMenuOpen ? 0 : -1}
              >
                PEGASOFT
              </Link>
              <button
                className="mobile-nav__close"
                type="button"
                aria-label="Close menu"
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.requestAnimationFrame(() => {
                    mobileMenuButtonRef.current?.focus();
                  });
                }}
                data-mobile-nav-initial-focus=""
                tabIndex={mobileMenuOpen ? 0 : -1}
              >
                <X size={18} />
              </button>
            </div>
            <ul className="mobile-nav__list">
              <li className="mobile-nav__item">
                <Link
                  href="/services"
                  onClick={() => setMobileMenuOpen(false)}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                >
                  Services
                </Link>
              </li>
              <li className="mobile-nav__item">
                <Link
                  href="/work"
                  onClick={() => setMobileMenuOpen(false)}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                >
                  Work
                </Link>
              </li>
              <li className="mobile-nav__item">
                <Link
                  href="/studio"
                  onClick={() => setMobileMenuOpen(false)}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                >
                  Studio
                </Link>
              </li>
            </ul>
            <div className="mobile-nav__ctas">
              <div className="mncta">
                <Link
                  href="/work/concepts"
                  className="pill-btn pill-btn--glass mobile-nav__cta"
                  onClick={() => setMobileMenuOpen(false)}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                >
                  <span className="pill-btn-span">Concept Lab</span>
                </Link>
              </div>
              <div className="mncta">
                <a
                  href={bookingUrl}
                  className="pill-btn pill-btn--dark mobile-nav__cta"
                  onClick={() => setMobileMenuOpen(false)}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                >
                  <span className="pill-btn-span">Book a Call</span>
                </a>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <div
        className={heroStyles.top}
        data-hero-shell=""
        data-scene-live={sceneReady}
        data-copy-live={pageReady}
        data-loader-cleared={loaderHidden}
        data-hero-attempt-state={heroAttemptState}
        {...developmentHeroDiagnostics}
        style={
          {
            '--hero-exit-progress':
              heroJourney.dom.landingExitProgress.toFixed(4),
            '--hero-fade-progress':
              heroJourney.dom.landingFadeProgress.toFixed(4),
            '--flow-reveal-progress':
              heroJourney.dom.flowRevealProgress.toFixed(4),
            '--field-visibility': heroJourney.dom.fieldVisibility.toFixed(4),
            '--field-clip-bottom': `${fieldClipBottom}px`,
          } as CSSProperties
        }
      >
        <HeroScene
          snapshot={heroJourney}
          localEffectsActive={loaderHidden}
          onAttemptStateChange={setHeroAttemptState}
        />

        <section
          className={clsx(heroStyles.hero, {
            [heroStyles.heroVisible]: pageReady,
            [heroStyles.heroHidden]: heroJourney.dom.landingHidden,
          })}
          data-hero-copy="landing"
        >
          <div className={heroStyles.heroContent}>
            <h1 className={heroStyles.heroTitle}>
              <span>The New Standard</span>
              <span>in Product Delivery</span>
            </h1>
            <p className={heroStyles.heroSubtitle}>
              <span>Design clarity. Production rigor.</span>
              <span>
                Pegasoft builds resilient digital products and brand systems
                that hold together in production.
              </span>
            </p>
          </div>
          <button
            className={heroStyles.scrollButton}
            type="button"
            onClick={scrollToProcess}
          >
            <span>
              <span className={heroStyles.scrollLabel}>
                scroll to discover our process
              </span>
            </span>
          </button>
        </section>

        <div className={heroStyles.heroSpacer} />

        <section ref={flowRef} className={heroStyles.flow} data-hero-process="">
          <div ref={flowWrapperRef} className={heroStyles.flowWrapper}>
            <div className={heroStyles.flowSteps}>
              {flowSteps.map((step, index) => (
                <div
                  key={step.number}
                  className={clsx(heroStyles.flowStep, {
                    [heroStyles.flowStepActive]:
                      heroJourney.stepIndex === index,
                  })}
                  data-hero-process-step={index + 1}
                  data-active={heroJourney.stepIndex === index}
                  style={
                    {
                      '--flow-progress': Math.min(
                        1,
                        index < heroJourney.stepIndex
                          ? 1
                          : index === heroJourney.stepIndex
                            ? heroJourney.stepProgress
                            : 0,
                      ),
                    } as CSSProperties
                  }
                >
                  <button
                    className={heroStyles.flowHeader}
                    type="button"
                    onClick={() => jumpToFlowStep(index)}
                  >
                    <div className={heroStyles.flowNumber}>
                      <span>{step.number}</span>
                    </div>
                    <h3 className={heroStyles.flowTitle}>{step.title}</h3>
                  </button>
                  <div className={heroStyles.flowBody}>
                    <div className={heroStyles.flowBodyInner}>
                      <div className={heroStyles.flowTrack}>
                        <div className={heroStyles.flowTrackBar}>
                          <div className={heroStyles.flowTrackFill} />
                        </div>
                      </div>
                      <p className={heroStyles.flowDescription}>{step.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          ref={featuresRef}
          className="features"
          data-hero-next-section=""
        >
          <div className="features__sticky">
            <h2 className="features__title">
              Designed for ambitious studios,
              <br className="pc" />
              beyond presentation-only design workflows.
            </h2>
            <div className="features__grid">
              {features.map((feature, index) => (
                <article className="feature-item" key={feature.title}>
                  <div
                    ref={(node) => {
                      featureRefs.current[index] = node;
                    }}
                    className="feature-item__content"
                  >
                    <div className="feature-item__icon">
                      <span />
                    </div>
                    <div className="feature-item__text">
                      <h3 className="feature-item__title">{feature.title}</h3>
                      <p className="feature-item__description">
                        {feature.body}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section ref={standardsRef} className="standards">
        <div className="standards__container">
          <div className="standards__visual">
            <div className="standards__panel standards__panel--a" />
            <div className="standards__panel standards__panel--b" />
            <div className="standards__panel standards__panel--c" />
            <div className="standards__panel standards__grid" />
          </div>
          <div className="standards__content">
            <h2 className="standards__title">
              <span>Launch-grade standards</span>
              <span>across every release.</span>
            </h2>
            <p className="standards__description">
              Pegasoft treats design quality like operational quality. Motion,
              accessibility, implementation logic, and proof discipline are part
              of the system from the start.
            </p>
            <div className="flx">
              <Link href="/work" className="pill-btn pill-btn--dark">
                <span className="pill-btn-span">Explore our work model</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section ref={faqRef} className="faq">
        <div className="faq__container">
          <div className="faq__left">
            <h2 className="faq__title">
              How we work and how we deliver premium digital product systems.
            </h2>
          </div>
          <div className="faq_split_bar" />
          <div className="faq__right">
            {faqItems.map((item, index) => (
              <div
                key={item.question}
                className={clsx('faq-item', {
                  'faq-item--open': activeFaqIndex === index,
                })}
              >
                <button
                  className="faq-item__header"
                  type="button"
                  aria-expanded={activeFaqIndex === index}
                  onClick={() =>
                    setActiveFaqIndex((current) =>
                      current === index ? -1 : index,
                    )
                  }
                >
                  <span className="faq-item__question">{item.question}</span>
                  <span className="faq-item__icon">
                    <ChevronDown size={16} />
                  </span>
                </button>
                <div className="faq-item__content">
                  <p className="faq-item__answer">{item.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={ctaRef} className="cta-section">
        <h2 className="cta-section__title">
          <span>Build the next product with precision,</span>
          <span>and ship it without guesswork.</span>
        </h2>
        <p className="cta-section__subtitle">
          Pegasoft helps teams frame the product, shape the interface system,
          and protect delivery quality before launch pressure takes over.
        </p>
        <div className="flx">
          <a href={bookingUrl} className="pill-btn pill-btn--light">
            <span className="pill-btn-span">Book a client call</span>
          </a>
        </div>
      </section>

      <footer ref={footerRef} className="footer">
        <nav className="footer-nav">
          {[
            { href: '/services', label: 'Services' },
            { href: '/work', label: 'Work' },
            { href: '/studio', label: 'Studio' },
          ].map((item) => (
            <Link href={item.href} className="footer-nav-btn" key={item.href}>
              <span className="footer-nav-btn__bg" />
              <span className="footer-nav-btn__label">{item.label}</span>
              <span className="footer-nav-btn__arrows">
                <ArrowRight
                  className="footer-nav-btn__arrow footer-nav-btn__arrow--current"
                  size={22}
                />
                <ArrowRight
                  className="footer-nav-btn__arrow footer-nav-btn__arrow--next"
                  size={22}
                />
              </span>
            </Link>
          ))}
        </nav>

        <div className="footer__bottom">
          <div className="footer__logo">PEGASOFT</div>
          <div className="footer__meta">
            <p className="footer__copyright">© 2026 Pegasoft</p>
            <Link href="/privacy" className="footer__privacy">
              Privacy Policy
            </Link>
            <Link href="/work/concepts" className="footer__privacy">
              Concept Lab
            </Link>
            <Link href="/work/portfolio" className="footer__credit">
              Portfolio status
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
