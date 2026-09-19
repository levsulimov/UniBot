const START_TEXT = '👋 Добро пожаловать в UniBot — помощник Финансового университета!\n\nВыберите, кто вы:';
const GROUP_PROMPT = '👋 Отлично!\n\nЧтобы показывать информацию именно для вашей группы, напишите название учебной группы.\n\nНапример: ПИ25-2';
const STUB_TEXT = 'Эта функция пока находится в разработке.';

const applicantItems = [
  '📚 Направления обучения', '📅 Важные даты', '🏠 Общежитие',
  '📞 Контакты', '❓ FAQ', '🤖 Задать вопрос',
];
const freshmanItems = [
  '📅 Расписание', '🏢 Навигация', '📚 Учебный процесс', '💰 Стипендия',
  '🔔 Важные события', '📞 Контакты', '❓ FAQ', '🤖 Задать вопрос',
];

function keyboard(items) {
  return items.map((text) => [{ text, payload: `menu:${text}` }]);
}

export class BotService {
  constructor(users) { this.users = users; }

  async handle({ userId, text, payload }) {
    if (!userId) return [];
    try {
      if (text === '/start') {
        this.users.touch(userId);
        return [{ text: START_TEXT, keyboard: [[{ text: '🎓 Абитуриент', payload: 'role:applicant' }], [{ text: '👨‍🎓 Первокурсник', payload: 'role:freshman' }]], kind: 'role' }];
      }

      const action = payload ?? text;
      if (action === '🎓 Абитуриент' || action === 'role:applicant') {
        this.users.setRole(userId, 'applicant');
        return [this.applicantMenu()];
      }
      if (action === '👨‍🎓 Первокурсник' || action === 'role:freshman') {
        const user = this.users.setRole(userId, 'freshman');
        return user.studyGroup ? [this.freshmanMenu()] : [{ text: GROUP_PROMPT, kind: 'group-prompt' }];
      }
      if (typeof action === 'string' && action.startsWith('menu:')) {
        return [{ text: STUB_TEXT, kind: 'stub' }];
      }

      const user = this.users.get(userId);
      if (user?.role === 'freshman' && !user.studyGroup && typeof text === 'string') {
        const studyGroup = text.trim();
        if (!studyGroup || studyGroup.length > 64) {
          return [{ text: 'Введите название учебной группы длиной до 64 символов.', kind: 'group-error' }];
        }
        this.users.saveGroup(userId, studyGroup);
        return [{ text: `✅ Группа ${studyGroup} сохранена.`, kind: 'group-saved' }, this.freshmanMenu()];
      }

      return [{ text: 'Пожалуйста, начните с команды /start.', kind: 'unexpected' }];
    } catch (error) {
      console.error('Bot workflow error:', error);
      return [{ text: 'Не удалось обработать запрос. Попробуйте ещё раз.', kind: 'error' }];
    }
  }

  applicantMenu() { return { text: 'Главное меню абитуриента:', keyboard: keyboard(applicantItems), kind: 'applicant-menu' }; }
  freshmanMenu() { return { text: 'Главное меню первокурсника:', keyboard: keyboard(freshmanItems), kind: 'freshman-menu' }; }
}

export const messages = { START_TEXT, GROUP_PROMPT, STUB_TEXT, applicantItems, freshmanItems };
