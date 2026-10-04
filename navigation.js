import { text } from './i18n.js';

// These same authored articles power both the accessible document and drawers.
const articles = [...document.querySelectorAll('#ledger .room')];
export const entries = articles.filter(el => el.hasAttribute('data-entry'));
const byId = new Map(articles.map(el => [el.id, el]));
const panel = document.getElementById('panel');
const directory = document.getElementById('directory');
const menuButton = document.getElementById('directory-btn');
let current = null;
let returnFocus = null;
const title = el => el.querySelector('.room-title').textContent;
const children = el => articles.filter(child => child.dataset.parent === el.id);
const siblings = el => articles.filter(other => other.dataset.parent === el.dataset.parent);
export const isPanelOpen = () => current !== null;
export const isDirectoryOpen = () => !directory.hidden;
function link(el) {
  const a = document.createElement('a');
  a.href = `#${el.id}`;
  a.textContent = title(el);
  return a;
}
function closeDirectory() { directory.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); }
function renderDirectory() {
  const list = document.getElementById('directory-list');
  list.replaceChildren();
  for (const entry of entries) {
    const li = document.createElement('li');
    li.append(link(entry));
    const sub = document.createElement('ul');
    for (const child of children(entry)) { const item = document.createElement('li'); item.append(link(child)); sub.append(item); }
    li.append(sub); list.append(li);
  }
}
function renderPanel({ focus = false } = {}) {
  if (!current) return;
  const parent = byId.get(current.dataset.parent);
  panel.classList.toggle('entry-panel', current.hasAttribute('data-entry'));
  document.getElementById('panel-title').textContent = title(current);
  document.getElementById('panel-kicker').textContent = parent ? title(parent) : text('brand', 'Kaleidoscope');
  document.getElementById('panel-body').innerHTML = current.querySelector('.room-body').innerHTML;
  const photo = current.querySelector('.room-img');
  const figure = document.getElementById('panel-figure');
  figure.replaceChildren();
  if (photo) { const image = photo.cloneNode(); image.removeAttribute('class'); image.loading = 'eager'; figure.append(image); }
  const back = document.getElementById('panel-back');
  back.href = parent ? `#${parent.id}` : '#';
  back.textContent = `← ${parent ? title(parent) : text('home', 'All paths')}`;
  const nested = document.getElementById('panel-children');
  nested.replaceChildren(...children(current).map(link));
  nested.hidden = !nested.childElementCount;
  const group = siblings(current);
  document.getElementById('panel-count').textContent = `${group.indexOf(current) + 1} / ${group.length}`;
  for (const a of document.querySelectorAll('.quick-nav a')) {
    if (a.hash === `#${current.id}`) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  if (focus) {
    panel.querySelector('.panel-inner').scrollTop = 0;
    document.getElementById('panel-title').focus({ preventScroll: true });
  }
}
function showRoute() {
  const next = byId.get(location.hash.slice(1));
  closeDirectory();
  if (!next) {
    current = null; panel.hidden = true; panel.classList.remove('open'); document.body.classList.remove('panel-open');
    document.querySelectorAll('.quick-nav [aria-current]').forEach(a => a.removeAttribute('aria-current'));
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('pathclose'));
    return;
  }
  if (!current) returnFocus = document.activeElement;
  current = next;
  panel.hidden = false; panel.classList.add('open'); document.body.classList.add('panel-open');
  renderPanel({ focus: true });
  const entry = current.hasAttribute('data-entry') ? current : byId.get(current.dataset.parent);
  document.dispatchEvent(new CustomEvent('pathopen', { detail: { entry: entries.indexOf(entry) } }));
}
function navigate(hash) {
  if (location.hash !== hash) history.pushState(null, '', `${location.pathname}${location.search}${hash}`);
  showRoute();
}
export function openEntry(index) { navigate(`#${entries[index].id}`); }
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.hash && !byId.has(a.hash.slice(1))) return;
  e.preventDefault(); navigate(a.hash);
  if (a.id === 'panel-back' && !a.hash) document.dispatchEvent(new CustomEvent('pathhome'));
});
document.getElementById('panel-close').addEventListener('click', () => navigate(''));
function step(delta) {
  if (!current) return;
  const group = siblings(current);
  navigate(`#${group[(group.indexOf(current) + delta + group.length) % group.length].id}`);
}
document.getElementById('panel-prev').addEventListener('click', () => step(-1));
document.getElementById('panel-next').addEventListener('click', () => step(1));
menuButton.addEventListener('click', () => {
  directory.hidden = !directory.hidden;
  menuButton.setAttribute('aria-expanded', String(!directory.hidden));
  if (!directory.hidden) directory.querySelector('a')?.focus();
});
document.addEventListener('click', e => { if (!directory.contains(e.target) && !menuButton.contains(e.target)) closeDirectory(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!directory.hidden) { closeDirectory(); menuButton.focus(); }
    else if (current) navigate('');
  }
  if (!current || e.target.closest('input, textarea, select') || e.altKey || e.metaKey || e.ctrlKey) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
});
addEventListener('popstate', showRoute);
addEventListener('hashchange', showRoute);
document.addEventListener('languagechange', () => { renderDirectory(); renderPanel(); });
renderDirectory();
document.body.classList.add('navigation-ready');
showRoute();
