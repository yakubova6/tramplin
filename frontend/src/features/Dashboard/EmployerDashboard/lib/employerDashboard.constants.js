export const OPPORTUNITY_TYPES = [
    { value: 'VACANCY', label: 'Вакансия' },
    { value: 'INTERNSHIP', label: 'Стажировка' },
    { value: 'MENTORING', label: 'Менторская программа' },
    { value: 'EVENT', label: 'Мероприятие' },
]

export const WORK_FORMATS = [
    { value: 'OFFICE', label: 'Офис' },
    { value: 'HYBRID', label: 'Гибрид' },
    { value: 'REMOTE', label: 'Удалённо' },
    { value: 'ONLINE', label: 'Онлайн' },
]

export const EXPERIENCE_LEVELS = [
    { value: 'INTERN', label: 'Intern' },
    { value: 'JUNIOR', label: 'Junior' },
    { value: 'MIDDLE', label: 'Middle' },
    { value: 'SENIOR', label: 'Senior' },
]

export const EMPLOYMENT_TYPES = [
    { value: 'FULL_TIME', label: 'Полная занятость' },
    { value: 'PART_TIME', label: 'Частичная занятость' },
    { value: 'PROJECT', label: 'Проектная работа' },
]

export const COMPANY_SIZE_OPTIONS = [
    { value: 'STARTUP', label: 'Стартап (1–10)' },
    { value: 'SMALL', label: 'Малый бизнес (11–50)' },
    { value: 'MEDIUM', label: 'Средний (51–200)' },
    { value: 'LARGE', label: 'Крупный (201–1000)' },
    { value: 'ENTERPRISE', label: 'Корпорация (1000+)' },
]

export const VERIFICATION_METHODS = [
    { value: 'CORPORATE_EMAIL', label: 'Корпоративная почта' },
    { value: 'TIN', label: 'ИНН' },
    { value: 'PROFESSIONAL_LINKS', label: 'Профессиональные ссылки' },
]

export const APPLICATION_STATUSES = [
    { value: '', label: 'Все статусы' },
    { value: 'SUBMITTED', label: 'Подан' },
    { value: 'IN_REVIEW', label: 'На рассмотрении' },
    { value: 'ACCEPTED', label: 'Принят' },
    { value: 'REJECTED', label: 'Отклонён' },
    { value: 'RESERVE', label: 'В резерве' },
    { value: 'WITHDRAWN', label: 'Отозван' },
]

export const APPLICATION_SORT_OPTIONS = [
    { value: 'DESC', label: 'Сначала новые' },
    { value: 'ASC', label: 'Сначала старые' },
]

export const EMPLOYER_LOGO_FORMATS_HINT = 'JPG, PNG, WEBP'