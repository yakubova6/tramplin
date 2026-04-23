const TAG_CATEGORY_LABELS = {
  TECH: 'Технологии',
  SOFT: 'Софт-скиллы',
  DOMAIN: 'Предметная область',
  TOOL: 'Инструменты',
  OTHER: 'Другое',
};

export function getTagCategoryLabel(category) {
  if (!category) return 'Не указана';
  return TAG_CATEGORY_LABELS[category] || category;
}

