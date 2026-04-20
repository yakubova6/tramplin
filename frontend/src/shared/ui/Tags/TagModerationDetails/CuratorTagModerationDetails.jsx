import React, { useEffect, useState } from 'react';
import { getModerationTask } from '@/shared/api/curatorTag';
import styles from './TagModerationDetails.module.scss';

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

  if (!tagId) return null;

  return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
          <h3>Задача модерации тега</h3>
          {loading && <p>Загрузка...</p>}
          {error && <p className={styles.error}>{error}</p>}
          {task && (
              <div className={styles.content}>
                <p><strong>ID задачи:</strong> {task.id}</p>
                <p><strong>Статус:</strong> {task.status}</p>
                <p><strong>Создана:</strong> {new Date(task.createdAt).toLocaleString()}</p>
                {task.resolutionComment && (
                    <p><strong>Комментарий:</strong> {task.resolutionComment}</p>
                )}
                {task.history && task.history.length > 0 && (
                    <div className={styles.history}>
                      <strong>История:</strong>
                      <ul>
                        {task.history.map((item, idx) => (
                            <li key={idx}>{item.action} – {new Date(item.createdAt).toLocaleString()}</li>
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