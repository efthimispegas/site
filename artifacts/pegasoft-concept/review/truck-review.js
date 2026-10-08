const stage = document.querySelector('#stage');
const detail = document.querySelector('#detail');
const brand = document.querySelector('#brand');
const branding = document.querySelector('#branding');
const state = document.querySelector('#review-state');
const image = document.querySelector('#truck-image');
const originalLink = document.querySelector('#original-link');
const brandingLink = document.querySelector('#branding-link');
const views = {
  side: {
    id: 'T01', file: 'T01-side-original.png', size: [3072, 1024],
    alt: 'Accepted side master: right-facing high-roof carbon and blue cab with full empty container chassis',
    lettering: [[2670, 516, 30, 'PEGASOFT'], [2670, 538, 16, 'Solutions']],
    status: 'Side identity and lettering accepted.'
  },
  upper: {
    id: 'T02', file: 'T02-upper-original.png', size: [3072, 1024],
    alt: 'Generated upper candidate: carbon and blue roof and empty chassis, with oblique wheel faces requiring correction',
    lettering: [], status: 'Upper image accepted as supplied; oblique angle retained.'
  },
  front: {
    id: 'T03', file: 'T03-front-original.png', size: [1536, 2048],
    alt: 'Generated front candidate: carbon and blue cab with trailer offset to the left, retained as approved',
    lettering: [[954, 1064, 40, 'PEGASOFT'], [954, 1092, 20, 'Solutions']],
    status: 'Front image accepted as supplied; trailer offset retained in the reference.'
  }
};
let view = 'side', surface = 'carbon', zoom = false, branded = true;
function update() {
  const current = views[view];
  const hasLettering = current.lettering.length > 0;
  stage.classList.toggle('paper', surface === 'paper');
  stage.classList.toggle('front', view === 'front');
  stage.classList.toggle('detail', zoom && view === 'side');
  detail.disabled = view !== 'side';
  detail.setAttribute('aria-pressed', String(zoom && view === 'side'));
  brand.disabled = !hasLettering;
  brand.setAttribute('aria-pressed', String(branded && hasLettering));
  branding.toggleAttribute('hidden', !branded || !hasLettering);
  image.src = '../generation/truck-family/' + current.id + '/' + current.file;
  image.alt = current.alt;
  branding.setAttribute('viewBox', '0 0 ' + current.size.join(' '));
  branding.setAttribute('aria-label', view === 'front' ? 'Proposed PEGASOFT Solutions external front-panel lettering' : 'Accepted PEGASOFT Solutions external door lettering');
  const texts = branding.querySelectorAll('text');
  current.lettering.forEach(([x, y, size, label], i) => {
    texts[i].setAttribute('x', x);
    texts[i].setAttribute('y', y);
    texts[i].setAttribute('font-size', size);
    texts[i].textContent = label;
  });
  document.querySelector('#dimensions').textContent = current.size.join(' × ') + ' PNG';
  originalLink.href = image.src;
  brandingLink.hidden = !hasLettering;
  brandingLink.href = '../generation/truck-family/' + current.id + '/' + current.id + '-branding.svg';
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  const finish = !hasLettering ? 'no roof lettering' : branded ? 'external Pegasoft lettering shown' : 'original PNG without lettering';
  state.textContent = current.id + ' / ' + (surface === 'paper' ? 'Porcelain' : 'Carbon') + ' / ' + (zoom && view === 'side' ? 'cab detail' : 'complete vehicle') + ' / ' + finish + '. ' + current.status;
}
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
  view = b.dataset.view;
  zoom = false;
  update();
}));
document.querySelectorAll('[data-surface]').forEach(b => b.addEventListener('click', () => {
  surface = b.dataset.surface;
  document.querySelectorAll('[data-surface]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  update();
}));
detail.addEventListener('click', () => { zoom = !zoom; update(); });
brand.addEventListener('click', () => { branded = !branded; update(); });
update();
