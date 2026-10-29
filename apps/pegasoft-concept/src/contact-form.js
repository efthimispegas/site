import { translate as t } from './locale-messages.js';
/** Drafts and selected CV stay in memory; this adapter never submits remotely. */
const shared = new Set(['name', 'email', 'company']);
export const CAREER_ROLES = Object.freeze([
  'Frontend software engineer',
  'Backend software engineer',
  'Fullstack software engineer',
  'DevOps engineer',
  'Sales specialist',
  'Operations specialist',
  'Administrator',
  'Business specialist',
  'Project manager',
  'Other',
]);
export const CONTACT_FIELDS = Object.freeze({
  General: [
    ['name', 'Name', 'text'],
    ['email', 'Email', 'email'],
    ['company', 'Company (optional)', 'text', true],
    ['message', 'Message', 'textarea'],
  ],
  'Company owner': [
    ['name', 'Name', 'text'],
    ['email', 'Business email', 'email'],
    ['company', 'Company / website', 'text'],
    ['goals', 'Project goals', 'textarea'],
  ],
  Investor: [
    ['name', 'Name', 'text'],
    ['email', 'Email', 'email'],
    ['firm', 'Firm', 'text'],
    ['interest', 'Investment interest', 'textarea'],
  ],
  Careers: [
    ['name', 'Name', 'text'],
    ['email', 'Email', 'email'],
    ['mobile', 'Mobile (optional)', 'tel', true],
    ['role', 'Role of interest', 'select'],
    ['cv', 'CV / résumé', 'file'],
    ['links', 'Other links to your work (optional)', 'textarea', true],
  ],
});
export function createContactForm({ panel, scope }) {
  const document = panel.ownerDocument,
    drafts = {
      shared: {},
      General: {},
      'Company owner': {},
      Investor: {},
      Careers: {},
    };
  function selectedFile(input) {
    const file = input.files?.[0];
    drafts.Careers.cv = file || null;
    const status = panel.querySelector('[data-cv-status]');
    status.textContent = file ? file.name : t('No file selected');
    if (file) status.dataset.userContent = '';
    else delete status.dataset.userContent;
    panel.querySelector('[data-remove-cv]').hidden = !file;
  }
  scope.listen(
    panel,
    'invalid',
    (event) => {
      const input = event.target;
      input.setCustomValidity(
        input.validity.typeMismatch
          ? t('Please enter a valid email address.')
          : t('Please complete this field.'),
      );
    },
    { capture: true },
  );
  scope.listen(panel, 'input', (event) => {
    const input = event.target,
      key = input.dataset.field;
    input.setCustomValidity?.('');
    if (!key || input.type === 'file') return;
    drafts[shared.has(key) ? 'shared' : input.dataset.audience][key] =
      input.value;
  });
  scope.listen(panel, 'change', (event) => {
    event.target.setCustomValidity?.('');
    if (event.target.dataset.field === 'cv') selectedFile(event.target);
  });
  scope.listen(panel, 'click', (event) => {
    if (!event.target.closest('[data-remove-cv]')) return;
    const input = panel.querySelector('[name=cv]');
    input.value = '';
    selectedFile(input);
    input.focus();
  });
  for (const type of ['dragenter', 'dragover'])
    scope.listen(panel, type, (event) => {
      const zone = event.target.closest('[data-cv-dropzone]');
      if (
        !zone ||
        !Array.from(event.dataTransfer?.types || []).includes('Files')
      )
        return;
      event.preventDefault();
      zone.dataset.dragging = 'true';
      if (type === 'dragover') event.dataTransfer.dropEffect = 'copy';
    });
  scope.listen(panel, 'dragleave', (event) => {
    const zone = event.target.closest('[data-cv-dropzone]');
    if (zone && !zone.contains(event.relatedTarget))
      zone.dataset.dragging = 'false';
  });
  scope.listen(panel, 'drop', (event) => {
    const zone = event.target.closest('[data-cv-dropzone]');
    if (!zone) return;
    event.preventDefault();
    zone.dataset.dragging = 'false';
    if (!event.dataTransfer?.files.length) return;
    const transfer = new document.defaultView.DataTransfer();
    transfer.items.add(event.dataTransfer.files[0]);
    const input = zone.querySelector('input');
    input.files = transfer.files;
    selectedFile(input);
  });
  scope.listen(panel, 'submit', (event) => {
    event.preventDefault();
    const form = event.target;
    if (!form.checkValidity()) return;
    form.querySelector('output').textContent =
      form.dataset.audience === 'Careers'
        ? t(
            'Application draft validated. Your CV stays in this browser; nothing has been sent.',
          )
        : t(
            'Draft validated. Nothing has been sent; the submission endpoint is not connected.',
          );
  });
  function show(audience) {
    const form = document.createElement('form');
    form.id = 'contact-preview-form';
    form.className = 'contact-preview-form';
    form.dataset.audience = audience;
    for (const [key, text, type, optional = false] of CONTACT_FIELDS[
      audience
    ]) {
      const label = document.createElement('label');
      label.textContent = t(text);
      const input = document.createElement(
        type === 'textarea'
          ? 'textarea'
          : type === 'select'
            ? 'select'
            : 'input',
      );
      if (type === 'select') {
        const prompt = document.createElement('option');
        prompt.value = '';
        prompt.textContent = t('Select a role');
        prompt.disabled = true;
        input.append(prompt);
        for (const role of CAREER_ROLES) {
          const option = document.createElement('option');
          option.value = role;
          option.textContent = t(role);
          input.append(option);
        }
      } else if (type === 'textarea') {
        input.rows = key === 'links' ? 3 : 4;
      } else input.type = type;
      input.id = 'contact-field-' + key;
      input.name = key;
      input.required = !optional;
      input.dataset.field = key;
      input.dataset.audience = audience;
      label.htmlFor = input.id;
      if (type === 'file') {
        const zone = document.createElement('span');
        zone.className = 'cv-dropzone';
        zone.dataset.cvDropzone = '';
        const title = document.createElement('strong');
        title.textContent = t('Drop your CV here');
        const hint = document.createElement('span');
        hint.textContent = t('or choose a file');
        const status = document.createElement('span');
        status.dataset.cvStatus = '';
        status.className = 'cv-file-status';
        status.setAttribute('aria-live', 'polite');
        status.textContent = drafts.Careers.cv?.name || t('No file selected');
        if (drafts.Careers.cv) status.dataset.userContent = '';
        input.setAttribute('aria-describedby', 'cv-file-note');
        if (drafts.Careers.cv) {
          const transfer = new document.defaultView.DataTransfer();
          transfer.items.add(drafts.Careers.cv);
          input.files = transfer.files;
        }
        zone.append(title, hint, input);
        label.append(zone);
        form.append(label, status);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.dataset.removeCv = '';
        remove.dataset.uiAction = 'tertiary';
        remove.className = 'cv-remove';
        remove.textContent = t('Remove CV');
        remove.hidden = !drafts.Careers.cv;
        form.append(remove);
        const note = document.createElement('span');
        note.id = 'cv-file-note';
        note.className = 'cv-file-note';
        note.textContent = t(
          'Review prototype: the file stays local and is not uploaded.',
        );
        form.append(note);
      } else {
        input.value = drafts[shared.has(key) ? 'shared' : audience][key] || '';
        input.autocomplete =
          {
            name: 'name',
            email: 'email',
            company: 'organization',
            mobile: 'tel',
          }[key] || 'off';
        if (key === 'links')
          input.placeholder = t(
            'GitHub, portfolio, LinkedIn or other links — one per line',
          );
        label.append(input);
        form.append(label);
      }
    }
    const button = document.createElement('button');
    button.type = 'submit';
    button.dataset.uiAction = 'primary';
    button.textContent =
      audience === 'Careers' ? t('Review application') : t('Review message');
    const status = document.createElement('output');
    status.id = 'contact-preview-status';
    status.setAttribute('aria-live', 'polite');
    form.append(button, status);
    panel.replaceChildren(form);
  }
  return { show };
}
