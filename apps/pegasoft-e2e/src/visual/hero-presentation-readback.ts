import type { CaptureSample } from './hero-capture-contract';

type Rect = { x: number; y: number; width: number; height: number };
export type HeroPresentation = {
  status: 'observed' | 'uncertain' | 'unavailable';
  binding: { status: 'bound-to-completed-frame' | 'mismatch' | 'unavailable'; frameId: number | null };
  clipping: { status: 'supported-rectangular' | 'unsupported'; intersection: Rect | null; horizontalCropPlaneCssY: null; reasons: string[] };
  opacity: { status: 'observed-css-opacity-product' | 'uncertain'; quantity: 'ancestor-css-group-opacity-product'; cssOpacityProduct: number; sceneMaterialOpacity: null; reasons: string[] };
  temporal: { status: 'static-at-sample' | 'uncertain-animated-presentation' };
  timing: { sampleStartedAtMs: number; sampleEndedAtMs: number };
};

/** Serialized into one browser task: no imported runtime helpers or named-state injection. */
export function readHeroCaptureWithPresentation(options: { expectedFrameId?: number } = {}): CaptureSample & { presentation: HeroPresentation } {
  const sampleStartedAtMs = performance.now();
  const root = document.querySelector('[data-hero-render-ready]');
  const canvases = root?.querySelectorAll('canvas');
  const canvas = canvases?.length === 1 ? canvases[0] : null;
  const runtime = window as Window & { __pegasoftHeroFrame?: CaptureSample['record']; __pegasoftHeroLifecycleStartedAtMs?: number };
  const record = structuredClone(runtime.__pegasoftHeroFrame ?? null);
  const frameId = record?.frame?.frameId ?? null;
  const consumers = Object.values(record?.appliedConsumers ?? {});
  const complete = !!canvas && !!record && Number.isFinite(record.renderedAtMs) && Number.isInteger(frameId) && (frameId ?? 0) > 0 && consumers.length > 0 && consumers.every(c => c.frameId === frameId);
  const binding: HeroPresentation['binding'] = { status: !complete ? 'unavailable' : options.expectedFrameId !== undefined && options.expectedFrameId !== frameId ? 'mismatch' : 'bound-to-completed-frame', frameId };
  const clipReasons: string[] = [], opacityReasons: string[] = [];
  let cssOpacityProduct = 1, animated = false;
  const bounds = canvas?.getBoundingClientRect();
  let intersection: Rect | null = bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null;
  const intersect = (clip: Rect) => {
    if (!intersection) return;
    const x = Math.max(intersection.x, clip.x), y = Math.max(intersection.y, clip.y);
    intersection = { x, y, width: Math.max(0, Math.min(intersection.x + intersection.width, clip.x + clip.width) - x), height: Math.max(0, Math.min(intersection.y + intersection.height, clip.y + clip.height) - y) };
  };
  if (intersection) intersect({ x: 0, y: 0, width: innerWidth, height: innerHeight });
  let escapingPosition = false;
  for (let node: Element | null = canvas; node; node = node.parentElement) {
    const style = getComputedStyle(node), rect = node.getBoundingClientRect();
    const opacity = Number(style.opacity);
    if (Number.isFinite(opacity)) cssOpacityProduct *= opacity;
    else opacityReasons.push('nonfinite-css-opacity');
    if (style.display === 'contents') { opacityReasons.push('boxless-ancestor'); clipReasons.push('boxless-ancestor'); }
    if (style.filter !== 'none' || style.backdropFilter !== 'none' || style.mixBlendMode !== 'normal' || style.maskImage !== 'none') opacityReasons.push('unsupported-compositing');
    if (style.maskImage !== 'none') clipReasons.push('mask-image');
    if (style.transform !== 'none' || style.perspective !== 'none' || style.rotate !== 'none' || style.scale !== 'none' || style.translate !== 'none' || style.zoom !== '1') clipReasons.push('transformed-coordinate-system');
    if (style.position === 'fixed' || style.position === 'absolute') escapingPosition = true;
    if (node.getAnimations().some(animation => animation.playState === 'running' || animation.pending)) animated = true;
    if (style.clip !== 'auto') clipReasons.push('legacy-clip-not-supported');
    if (style.contain.split(/\s+/).some(value => ['paint', 'strict', 'content'].includes(value)) || style.contentVisibility !== 'visible') clipReasons.push('containment-not-supported');
    const overflowX = style.overflowX !== 'visible', overflowY = style.overflowY !== 'visible';
    if (overflowX || overflowY) {
      if (escapingPosition) clipReasons.push('positioned-descendant-containing-block-ambiguity');
      if (node === document.body || node === document.documentElement) clipReasons.push('viewport-overflow-propagation');
      if ([style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomLeftRadius, style.borderBottomRightRadius].some(v => !/^0(px|%)?( 0(px|%)?)?$/.test(v))) clipReasons.push('rounded-overflow');
      const html = node as HTMLElement;
      if ((style.overflowX === 'clip' || style.overflowY === 'clip') && node !== canvas) clipReasons.push('overflow-clip-margin-not-supported');
      if (node === canvas && [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth, style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].some(v => parseFloat(v) !== 0)) clipReasons.push('canvas-content-box-not-supported');
      intersect({ x: overflowX ? rect.x + html.clientLeft : 0, y: overflowY ? rect.y + html.clientTop : 0, width: overflowX ? html.clientWidth : innerWidth, height: overflowY ? html.clientHeight : innerHeight });
    }
    if (style.clipPath !== 'none') {
      const match = /^inset\(([^()]*)\)$/.exec(style.clipPath);
      const tokens = match?.[1].trim().split(/\s+/) ?? [];
      if (!tokens.length || tokens.length > 4 || tokens.some(v => !/^-?[\d.]+(px|%)$/.test(v))) clipReasons.push('nonrectangular-or-unresolved-clip-path');
      else {
        const values = tokens.length === 1 ? [tokens[0],tokens[0],tokens[0],tokens[0]] : tokens.length === 2 ? [tokens[0],tokens[1],tokens[0],tokens[1]] : tokens.length === 3 ? [tokens[0],tokens[1],tokens[2],tokens[1]] : tokens;
        const edges = values.map((v,i) => parseFloat(v) * (v.endsWith('%') ? (i % 2 ? rect.width : rect.height) / 100 : 1));
        if (edges[1] + edges[3] > rect.width || edges[0] + edges[2] > rect.height) clipReasons.push('overconstrained-inset');
        else intersect({ x: rect.x + edges[3], y: rect.y + edges[0], width: rect.width - edges[1] - edges[3], height: rect.height - edges[0] - edges[2] });
      }
    }
  }
  if (animated) { clipReasons.push('animated-presentation'); opacityReasons.push('animated-presentation'); }
  if (!canvas || !intersection || !Object.values(intersection).every(Number.isFinite)) clipReasons.push('missing-or-ambiguous-canvas');
  const clipping: HeroPresentation['clipping'] = { status: clipReasons.length ? 'unsupported' : 'supported-rectangular', intersection: clipReasons.length ? null : intersection, horizontalCropPlaneCssY: null, reasons: [...new Set(clipReasons)] };
  const presentation: HeroPresentation = {
    status: !canvas ? 'unavailable' : binding.status !== 'bound-to-completed-frame' || clipReasons.length || opacityReasons.length ? 'uncertain' : 'observed', binding, clipping,
    opacity: { status: opacityReasons.length ? 'uncertain' : 'observed-css-opacity-product', quantity: 'ancestor-css-group-opacity-product', cssOpacityProduct, sceneMaterialOpacity: null, reasons: [...new Set(opacityReasons)] },
    temporal: { status: animated ? 'uncertain-animated-presentation' : 'static-at-sample' }, timing: { sampleStartedAtMs, sampleEndedAtMs: performance.now() },
  };
  const style = canvas ? getComputedStyle(canvas) : null;
  return { attributes: root ? Object.fromEntries(Array.from(root.attributes).map(attribute => [attribute.name,attribute.value])) : {},
    canvasVisible: Boolean(bounds && bounds.width > 0 && bounds.height > 0 && style?.visibility !== 'hidden' && style?.display !== 'none'),
    fontsReady: document.fonts.status === 'loaded', loaderCleared: document.querySelector('[data-hero-shell]')?.getAttribute('data-loader-cleared') === 'true',
    lifecycleElapsedMs: typeof runtime.__pegasoftHeroLifecycleStartedAtMs === 'number' ? performance.now() - runtime.__pegasoftHeroLifecycleStartedAtMs : null, record, presentation };
}

/** Stable brackets retain DOM quantities only; this is not visual or continuous-motion qualification. */
export function compareHeroPresentationBrackets(initial: HeroPresentation | undefined, before: HeroPresentation | undefined, after: HeroPresentation | undefined) {
  const samples = [initial,before,after];
  const supported = samples.every(p => p?.status === 'observed' && p.binding.status === 'bound-to-completed-frame' && p.clipping.status === 'supported-rectangular' && p.opacity.status === 'observed-css-opacity-product' && p.temporal.status === 'static-at-sample');
  const signature = (p: HeroPresentation | undefined) => JSON.stringify([p?.binding.frameId,p?.clipping.intersection,p?.opacity.cssOpacityProduct]);
  const stable = supported && signature(initial) === signature(before) && signature(before) === signature(after);
  return { status: stable ? 'supported-stable-brackets' : 'blocked', qualification: 'blocked', readback: stable ? { rectangularIntersectionCss: before?.clipping.intersection, ancestorCssOpacityProduct: before?.opacity.cssOpacityProduct } : null };
}
