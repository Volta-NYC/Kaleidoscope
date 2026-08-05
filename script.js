const russianText = {
  siteName: 'Клуб народного танца «Калейдоскоп»',
  siteSupport: 'При поддержке Мультикультурного Центра «Калейдоскоп»',
  mainNavigation: 'Основная навигация',
  navHome: 'Главная',
  navNews: 'Новости',
  navEvents: 'Мероприятия',
  navGallery: 'Галерея',
  navPress: 'СМИ о нас',
  navAbout: 'О нас',
  navContacts: 'Контакты',
  heroTitle: 'Народный танец, культура и сообщество',
  heroText: 'Используйте это короткое приветствие, чтобы рассказать, кому помогает клуб, как проходят занятия и почему к вам стоит присоединиться.',
  heroLink: 'Записаться или задать вопрос',
  supportTitle: 'Поддержать клуб',
  supportText: 'Мультикультурный Центр «Калейдоскоп» — некоммерческая организация. Объясните здесь, как пожертвования помогут клубу.',
  donateLink: 'Сделать пожертвование',
  aboutTitle: 'О клубе',
  aboutText: 'Клуб даёт детям и молодёжи пространство для танца, физического развития, творчества и знакомства с культурами разных народов.',
  goalsTitle: 'Наши цели',
  goalOne: 'Регулярные занятия танцем и физическая подготовка.',
  goalTwo: 'Знакомство с культурными традициями разных стран.',
  goalThree: 'Развитие уверенности, дисциплины и умения работать в команде.',
  goalFour: 'Участие в жизни сообщества и волонтёрских проектах.',
  teamTitle: 'Наша команда',
  nameOne: 'Имя Фамилия',
  roleOne: '— президент клуба',
  nameTwo: 'Имя Фамилия',
  roleTwo: '— хореограф и художник по костюмам',
  nameThree: 'Имя Фамилия',
  roleThree: '— помощник хореографа',
  classesTitle: 'Занятия',
  classesText: 'Добавьте возрастные группы, адрес и актуальное расписание. Например: занятия проходят по будням с 18:00 до 20:00.',
  classOne: 'Разминка, растяжка и физическая подготовка.',
  classTwo: 'Основы классического танца и хореографии.',
  classThree: 'Работа над движениями и трюками в небольших группах.',
  classFour: 'Репетиция, импровизация и актёрское мастерство.',
  newsTitle: 'Новости',
  newsOneTitle: 'Заголовок последней новости',
  newsOneText: 'Дата · Краткое описание новости в одном или двух предложениях.',
  newsTwoTitle: 'Заголовок второй новости',
  newsTwoText: 'Дата · Краткое описание новости в одном или двух предложениях.',
  allNewsLink: 'Все новости',
  eventsTitle: 'Ближайшие мероприятия',
  eventName: 'Название мероприятия',
  dateTimeLabel: 'Дата и время:',
  dateTimeValue: 'Добавьте дату и время',
  placeLabel: 'Место:',
  placeValue: 'Добавьте адрес или название площадки',
  eventText: 'Коротко опишите выступление, концерт, фестиваль или встречу.',
  galleryTitle: 'Галерея',
  galleryText: 'Замените эти блоки фотографиями или видео с выступлений и репетиций.',
  mediaOne: 'Фото или видео 1',
  mediaTwo: 'Фото или видео 2',
  mediaThree: 'Фото или видео 3',
  pressTitle: 'СМИ о нас',
  pressOne: 'Название публикации или интервью',
  pressTwo: 'Название публикации или интервью',
  pressDetails: '— издание, дата',
  contactsTitle: 'Контакты',
  addressLabel: 'Адрес:',
  addressValue: 'Добавьте адрес занятий',
  phoneLabel: 'Телефон:',
  emailLabel: 'Электронная почта:',
  socialTitle: 'Мы в социальных сетях',
  footer: '© 2026 Клуб народного танца «Калейдоскоп»',
};

const languageToggle = document.querySelector('#language-toggle');
const translatableElements = document.querySelectorAll('[data-i18n]');
const translatableAriaLabels = document.querySelectorAll('[data-i18n-aria-label]');

const englishText = Object.fromEntries(
  [...translatableElements].map((element) => [element.dataset.i18n, element.textContent.trim()]),
);

const englishAriaLabels = Object.fromEntries(
  [...translatableAriaLabels].map((element) => [
    element.dataset.i18nAriaLabel,
    element.getAttribute('aria-label'),
  ]),
);

function setLanguage(language) {
  const text = language === 'ru' ? russianText : englishText;
  const ariaLabels = language === 'ru' ? russianText : englishAriaLabels;
  const isRussian = language === 'ru';

  translatableElements.forEach((element) => {
    element.textContent = text[element.dataset.i18n];
  });

  translatableAriaLabels.forEach((element) => {
    element.setAttribute('aria-label', ariaLabels[element.dataset.i18nAriaLabel]);
  });

  document.documentElement.lang = language;
  document.title = isRussian
    ? 'Клуб народного танца «Калейдоскоп»'
    : 'Folk Dance Club Kaleidoscope';
  languageToggle.textContent = isRussian ? 'English' : 'Русский';
  languageToggle.setAttribute(
    'aria-label',
    isRussian ? 'Switch site language to English' : 'Переключить сайт на русский язык',
  );
  languageToggle.setAttribute('aria-pressed', String(isRussian));
}

languageToggle.addEventListener('click', () => {
  setLanguage(document.documentElement.lang === 'en' ? 'ru' : 'en');
});

setLanguage('en');
