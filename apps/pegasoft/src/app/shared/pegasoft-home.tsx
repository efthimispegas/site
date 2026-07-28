'use client';

import clsx from 'clsx';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HeroScene } from './hero-scene/hero-scene';
import {
  getHeroJourneySnapshot,
  HERO_STEP_STARTS,
} from './hero-scene/hero-sequence';
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

function PegasoftLoader({ hidden }: { hidden: boolean }) {
  return (
    <div className="pegasoft-loader" data-hidden={hidden} aria-hidden="true">
      <div className="pegasoft-loader__core">P</div>
      <svg
        className="pegasoft-loader__ellipse pegasoft-loader__ellipse--outer"
        viewBox="0 0 1500 800"
      >
        <ellipse cx="750" cy="400" rx="749" ry="399" />
      </svg>
      <svg
        className="pegasoft-loader__ellipse pegasoft-loader__ellipse--inner"
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
  const featuresRef = useRef<HTMLElement>(null);
  const standardsRef = useRef<HTMLElement>(null);
  const faqRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const featureRefs = useRef<Array<HTMLDivElement | null>>([]);

  const [loaderHidden, setLoaderHidden] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [heroHidden, setHeroHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [flowProgress, setFlowProgress] = useState(0);
  const [activeFaqIndex, setActiveFaqIndex] = useState(0);
  const [headerWhite, setHeaderWhite] = useState(false);
  const [heroExitProgress, setHeroExitProgress] = useState(0);
  const [heroFadeProgress, setHeroFadeProgress] = useState(0);
  const [flowRevealProgress, setFlowRevealProgress] = useState(0);
  const [fieldVisibility, setFieldVisibility] = useState(1);
  const heroJourney = useMemo(
    () => getHeroJourneySnapshot(flowProgress),
    [flowProgress],
  );

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    if (reduceMotion) {
      setSceneReady(true);
      setPageReady(true);
      setLoaderHidden(true);
      return;
    }

    const sceneTimer = window.setTimeout(() => {
      setSceneReady(true);
    }, 1180);
    const revealTimer = window.setTimeout(() => {
      setPageReady(true);
    }, 2460);
    const hideTimer = window.setTimeout(() => {
      setLoaderHidden(true);
    }, 2080);

    return () => {
      window.clearTimeout(sceneTimer);
      window.clearTimeout(revealTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle(
      'pegasoft-locked',
      mobileMenuOpen || !loaderHidden,
    );

    return () => document.body.classList.remove('pegasoft-locked');
  }, [loaderHidden, mobileMenuOpen]);

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

    const updateFeatures = () => {
      const section = featuresRef.current;
      if (!section) {
        return;
      }

      const total = section.offsetHeight - window.innerHeight;
      const progress =
        total <= 0
          ? 1
          : Math.min(
              1,
              Math.max(0, -section.getBoundingClientRect().top / total),
            );
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

        item.style.opacity = `${0.22 + local * 0.78}`;
        item.style.transform = `translate3d(0, ${(1 - local) * 80}px, 0)`;
      });

      const rect = section.getBoundingClientRect();
      const fadeStart = window.innerHeight * 0.78;
      const fadeEnd = window.innerHeight * 0.18;
      const nextVisibility =
        rect.top >= fadeStart
          ? 1
          : rect.top <= fadeEnd
            ? 0
            : (rect.top - fadeEnd) / (fadeStart - fadeEnd);

      setFieldVisibility((previous) =>
        Math.abs(previous - nextVisibility) < 0.01 ? previous : nextVisibility,
      );
    };

    const updateFlow = () => {
      const flowSection = flowRef.current;
      if (!flowSection) {
        return;
      }

      const total = flowSection.offsetHeight - window.innerHeight;
      const progress =
        total <= 0
          ? 0
          : Math.min(
              1,
              Math.max(0, -flowSection.getBoundingClientRect().top / total),
            );
      setFlowProgress((previous) =>
        Math.abs(previous - progress) < 0.0001 ? previous : progress,
      );
    };

    const updateHeader = () => {
      const darkTargets = [ctaRef.current, footerRef.current].filter(
        Boolean,
      ) as HTMLElement[];
      const headerHeight = headerRef.current?.offsetHeight ?? 80;
      const landingWindow = window.innerHeight * 0.24 || 1;
      const exitProgress = Math.min(
        1,
        Math.max(0, window.scrollY / landingWindow),
      );
      const fadeProgress = Math.min(
        1,
        Math.max(0, (exitProgress - 0.28) / 0.72),
      );
      const revealProgress = Math.min(
        1,
        Math.max(0, (exitProgress - 0.2) / 0.8),
      );
      const shouldWhite = darkTargets.some((target) => {
        const rect = target.getBoundingClientRect();
        return rect.top < headerHeight && rect.bottom > 0;
      });

      setHeaderWhite((previous) =>
        previous === shouldWhite ? previous : shouldWhite,
      );
      setHeroHidden(window.scrollY > window.innerHeight * 0.16);
      setHeroExitProgress((previous) =>
        Math.abs(previous - exitProgress) < 0.01 ? previous : exitProgress,
      );
      setHeroFadeProgress((previous) =>
        Math.abs(previous - fadeProgress) < 0.01 ? previous : fadeProgress,
      );
      setFlowRevealProgress((previous) =>
        Math.abs(previous - revealProgress) < 0.01 ? previous : revealProgress,
      );
    };

    const update = () => {
      frame = 0;
      updateHeader();
      updateFlow();
      updateFeatures();
      revealSection(standardsRef.current);
      revealSection(faqRef.current);
      revealSection(ctaRef.current);
      revealSection(footerRef.current);
    };

    const onScroll = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const scrollToProcess = () => {
    const flowSection = flowRef.current;
    if (!flowSection) {
      return;
    }

    const rect = flowSection.getBoundingClientRect();
    window.scrollTo({
      top: window.scrollY + rect.top,
      behavior: 'smooth',
    });
  };

  const jumpToFlowStep = (index: number) => {
    const flowSection = flowRef.current;
    if (!flowSection) {
      return;
    }

    const total = flowSection.offsetHeight - window.innerHeight;
    const top = window.scrollY + flowSection.getBoundingClientRect().top;
    const stepTop = top + total * HERO_STEP_STARTS[index];

    window.scrollTo({
      top: stepTop,
      behavior: 'smooth',
    });
  };

  return (
    <div className={clsx(styles.root, 'pegasoft-vectr-page')}>
      <PegasoftLoader hidden={loaderHidden} />

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
            className="menu-btn"
            type="button"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div
          className={clsx('mobile-nav__overlay', {
            show: mobileMenuOpen,
          })}
          onClick={() => setMobileMenuOpen(false)}
        />

        <nav
          className={clsx('mobile-nav', {
            'is-open': mobileMenuOpen,
            'is-closing': !mobileMenuOpen,
          })}
          aria-label="Mobile navigation"
        >
          <div className="mobile-nav__panel-bg" />
          <div className="mobile-nav__panel">
            <div className="mobile-nav__header">
              <Link
                className="mobile-nav__logo"
                href="/"
                onClick={() => setMobileMenuOpen(false)}
              >
                PEGASOFT
              </Link>
              <button
                className="mobile-nav__close"
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <ul className="mobile-nav__list">
              <li className="mobile-nav__item">
                <Link href="/services" onClick={() => setMobileMenuOpen(false)}>
                  Services
                </Link>
              </li>
              <li className="mobile-nav__item">
                <Link href="/work" onClick={() => setMobileMenuOpen(false)}>
                  Work
                </Link>
              </li>
              <li className="mobile-nav__item">
                <Link href="/studio" onClick={() => setMobileMenuOpen(false)}>
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
                >
                  <span className="pill-btn-span">Concept Lab</span>
                </Link>
              </div>
              <div className="mncta">
                <a
                  href={bookingUrl}
                  className="pill-btn pill-btn--dark mobile-nav__cta"
                >
                  <span className="pill-btn-span">Book a Call</span>
                </a>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <div
        className={clsx('top', {
          'top--scene-live': sceneReady,
          'top--copy-live': pageReady,
          'top--loader-cleared': loaderHidden,
        })}
        style={
          {
            '--hero-exit-progress': heroExitProgress.toFixed(4),
            '--hero-fade-progress': heroFadeProgress.toFixed(4),
            '--flow-reveal-progress': flowRevealProgress.toFixed(4),
            '--field-visibility': fieldVisibility.toFixed(4),
          } as CSSProperties
        }
      >
        <HeroScene
          ready={sceneReady}
          introReady={loaderHidden}
          progress={heroJourney.progress}
        />

        <section
          className={clsx('hero', {
            show: pageReady,
            hide: heroHidden,
          })}
        >
          <div className="hero__content">
            <h1 className="hero__title">
              <span>The New Standard</span>
              <span>in Product Delivery</span>
            </h1>
            <p className="hero__subtitle">
              <span>Design driven clarity. Production rigor.</span>
              <span>
                Pegasoft builds premium digital products and brand platforms
                with interface systems that still hold together in code.
              </span>
            </p>
          </div>
          <button
            className="hero__scroll-btn"
            type="button"
            onClick={scrollToProcess}
          >
            <span>
              <span className="hsbtn-in">scroll to discover our process</span>
            </span>
          </button>
        </section>

        <div className="hero-spacer" />

        <section ref={flowRef} className="flow">
          <div className="flow__wrapper">
            <div className="flow__steps">
              {flowSteps.map((step, index) => (
                <div
                  key={step.number}
                  className={clsx('flow__step', {
                    'flow__step--active': heroJourney.stepIndex === index,
                  })}
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
                    className="flow__header"
                    type="button"
                    onClick={() => jumpToFlowStep(index)}
                  >
                    <div className="flow__number">
                      <span>{step.number}</span>
                    </div>
                    <h3 className="flow__title">{step.title}</h3>
                  </button>
                  <div className="flow__body">
                    <div className="flow__body-inner">
                      <div className="flow__track">
                        <div className="flow__track-bar">
                          <div className="flow__track-fill" />
                        </div>
                      </div>
                      <p className="flow__description">{step.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={featuresRef} className="features">
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
