import russian from './translations-ru.js';

const english = new Map();
const initialTitle = document.title;
const pageTitleKey = document.body.dataset.titleKey || 'page-title';
let language = 'en';
try {
  const requested = new URLSearchParams(location.search).get('lang');
  language = ['en', 'ru'].includes(requested) ? requested : (localStorage.getItem('kaleidoscope-language') === 'ru' ? 'ru' : 'en');
} catch { /* Language switching also works when storage is unavailable. */ }

// Capture the authored English before translating. Only marked, owned content
// is translated; form fields and visitor-entered values are never replaced.
const elements = [...document.querySelectorAll('[data-i18n], [data-i18n-alt], [data-i18n-aria-label], [data-i18n-placeholder]')];
for (const el of elements) {
  english.set(el, { html: el.innerHTML, alt: el.getAttribute('alt'), 'aria-label': el.getAttribute('aria-label'), placeholder: el.getAttribute('placeholder') });
}
export const getLanguage = () => language;
export function text(key, fallback) { return language === 'ru' ? (russian[key] ?? fallback) : fallback; }
export function setLanguage(next) {
  language = next === 'ru' ? 'ru' : 'en';
  document.documentElement.lang = language;
  document.title = text(pageTitleKey, initialTitle);
  for (const el of elements) {
    const original = english.get(el);
    if (el.dataset.i18n) el.innerHTML = text(el.dataset.i18n, original.html);
    for (const attr of ['alt', 'aria-label', 'placeholder']) {
      const key = el.getAttribute(`data-i18n-${attr}`);
      if (key) el.setAttribute(attr, text(key, original[attr]));
    }
  }
  const toggle = document.getElementById('language-toggle');
  if (toggle) {
    toggle.textContent = language === 'en' ? 'Русский' : 'English';
    toggle.lang = language === 'en' ? 'ru' : 'en';
    toggle.setAttribute('aria-label', language === 'en' ? 'Switch to Russian' : 'Switch to English');
  }
  // Explicit URL language takes precedence, so keep it in sync with the button.
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) {
    url.searchParams.set('lang', language);
    history.replaceState(history.state, '', url);
  }
  try { localStorage.setItem('kaleidoscope-language', language); } catch { /* optional */ }
  document.dispatchEvent(new CustomEvent('languagechange'));
}
document.getElementById('language-toggle')?.addEventListener('click', () => setLanguage(language === 'en' ? 'ru' : 'en'));
setLanguage(language);
