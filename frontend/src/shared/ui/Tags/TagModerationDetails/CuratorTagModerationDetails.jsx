import React, { useEffect, useState } from 'react';
import { getModerationTask } from '@/shared/api/curatorTag';
import styles from './TagModerationDetails.module.scss';

function formatDateTime(value) {
  if (!value) return 'Не указано';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Не указано';
  return date.toLocaleString('ru-RU');
}

const CuratorTagModerationDetails = ({ tagId, onClose }) => {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const data = await getModerationTask(tagId);
        setTask(data);
      } catch (err) {
        setError('Не удалось загрузить задачу модерации');
      } finally {
        setLoading(false);
      }
    };
    if (tagId) fetchTask();
  }, [tagId]);

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

  if (!tagId) return null;

  return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
          <h3>Проверка тега</h3>
          {loading && <p>Загрузка...</p>}
          {error && <p className={styles.error}>{error}</p>}
          {task && (
              <div className={styles.content}>
                <p><strong>Номер задачи:</strong> {task.id || '—'}</p>
                <p><strong>Этап:</strong> {task.status || 'Не указан'}</p>
                <p><strong>Когда создана:</strong> {formatDateTime(task.createdAt)}</p>
                {task.resolutionComment && (
                    <p><strong>Комментарий модератора:</strong> {task.resolutionComment}</p>
                )}
                {task.history && task.history.length > 0 && (
                    <div className={styles.history}>
                      <strong>История изменений:</strong>
                      <ul>
                        {task.history.map((item, idx) => (
                            <li key={idx}>
                              {item.action || 'Действие'} — {formatDateTime(item.createdAt)}
                            </li>
                        ))}
                      </ul>
                    </div>
                )}
              </div>
          )}
        </div>
      </div>
  );
};

export default CuratorTagModerationDetails;
