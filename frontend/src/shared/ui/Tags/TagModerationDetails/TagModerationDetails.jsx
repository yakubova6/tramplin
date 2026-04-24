import React, { useEffect } from 'react';
import { getTagCategoryLabel } from '@/shared/lib/utils/tagCategories';
import styles from './TagModerationDetails.module.scss';

const TAG_STATUS_LABELS = {
  PENDING: 'На модерации',
  APPROVED: 'Одобрен',
  REJECTED: 'Отклонен',
};

const getTagStatusLabel = (status) => TAG_STATUS_LABELS[String(status || '').toUpperCase()] || 'Не указан';

const TagModerationDetails = ({ tag, onClose }) => {
  if (!tag) return null;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.documentElement.classList.add('is-lock');
    return () => document.documentElement.classList.remove('is-lock');
  }, []);

  return (
      <div
        className={styles.overlay}
        onClick={(event) => event.target === event.currentTarget && onClose?.()}
      >
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
          <h3>Информация о теге</h3>
          <div className={styles.field}>
            <span className={styles.label}>Название:</span>
            <span>{tag.name}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Категория:</span>
            <span>{getTagCategoryLabel(tag.category)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Статус:</span>
            <span>{getTagStatusLabel(tag.moderationStatus)}</span>
          </div>
          {tag.moderationComment && (
              <div className={styles.field}>
                <span className={styles.label}>Комментарий модератора:</span>
                <span className={styles.comment}>{tag.moderationComment}</span>
              </div>
          )}
        </div>
      </div>
  );
};

export default TagModerationDetails;
