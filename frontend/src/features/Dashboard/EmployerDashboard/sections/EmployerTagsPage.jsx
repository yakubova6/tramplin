import React, { useCallback, useEffect, useState } from 'react';
import { getEmployerTags, cancelEmployerTagModeration, createEmployerTag } from '@/shared/api/employerTag.js';
import TagStatusBadge from '@/shared/ui/Tags/TagStatusBadge/TagStatusBadge.jsx';
import TagModerationDetails from '@/shared/ui/Tags/TagModerationDetails/TagModerationDetails.jsx';
import CreateTagForm from '@/shared/ui/Tags/CreateTagForm/CreateTagForm.jsx';
import styles from './EmployerTagsPage.module.scss';

const EmployerTagsPage = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [error, setError] = useState(null);

  const loadTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filterStatus !== 'ALL' ? { status: filterStatus } : {};
      const data = await getEmployerTags(params);
      setTags(Array.isArray(data) ? data : []);
    } catch {
      setError('Не удалось загрузить теги');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleCancel = async (tagId) => {
    if (!window.confirm('Вы уверены, что хотите отменить заявку на модерацию?')) return;
    try {
      await cancelEmployerTagModeration(tagId);
      await loadTags();
    } catch {
      alert('Ошибка при отмене заявки');
    }
  };

  const handleCreate = async (tagData) => {
    try {
      await createEmployerTag(tagData);
      setShowCreateForm(false);
      await loadTags();
    } catch {
      alert('Ошибка при создании тега');
    }
  };

  const openDetails = (tag) => setSelectedTag(tag);

  if (loading) return <div className={styles.loader}>Загрузка...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Мои теги</h1>
        <button className={styles.createBtn} onClick={() => setShowCreateForm(true)}>+ Предложить тег</button>
      </div>

      <div className={styles.filters}>
        <label>Статус:</label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="ALL">Все</option>
          <option value="PENDING">На модерации</option>
          <option value="APPROVED">Одобренные</option>
          <option value="REJECTED">Отклонённые</option>
        </select>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Название</th>
            <th>Категория</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {tags.length === 0 ? (
            <tr><td colSpan="4" className={styles.empty}>Нет тегов</td></tr>
          ) : (
            tags.map(tag => (
              <tr key={tag.id}>
                <td>{tag.name}</td>
                <td>{tag.category}</td>
                <td><TagStatusBadge status={tag.moderationStatus} /></td>
                <td>
                  <button className={styles.detailBtn} onClick={() => openDetails(tag)}>Детали</button>
                  {tag.moderationStatus === 'PENDING' && (
                    <button className={styles.cancelBtn} onClick={() => handleCancel(tag.id)}>Отменить</button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {selectedTag && (
        <TagModerationDetails tag={selectedTag} onClose={() => setSelectedTag(null)} />
      )}

      {showCreateForm && (
        <CreateTagForm
          onCreate={handleCreate}
          onCancel={() => setShowCreateForm(false)}
          isLoading={loading}
        />
      )}
    </div>
  );
};

export default EmployerTagsPage;