import React, { useCallback, useEffect, useState } from 'react';
import {
  getModerationTags,
  approveModerationTag,
  rejectModerationTag,
  createCuratorTag,
} from '@/shared/api/curatorTag';
import TagStatusBadge from '@/shared/ui/Tags/TagStatusBadge/TagStatusBadge';
import CuratorTagModerationDetails from '@/shared/ui/Tags/TagModerationDetails/CuratorTagModerationDetails';
import CuratorCreateTagForm from '@/shared/ui/Tags/CreateTagForm/CuratorCreateTagForm';
import styles from '@/features/Dashboard/EmployerDashboard/sections/EmployerTagsPage.module.scss';

const CuratorTagsPage = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState(null);

  const loadTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filterStatus !== 'ALL' ? { status: filterStatus } : {};
      const data = await getModerationTags(params);
      const tagsArray = Array.isArray(data) ? data : data?.items || [];
      setTags(tagsArray);
    } catch {
      setError('Не удалось загрузить теги');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleApprove = async (id) => {
    try {
      await approveModerationTag(id);
      await loadTags();
    } catch {
      alert('Ошибка при одобрении тега');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Отклонить заявку на создание тега?')) return;
    try {
      await rejectModerationTag(id);
      await loadTags();
    } catch {
      alert('Ошибка при отклонении тега');
    }
  };

  const handleCreate = async (tagData) => {
    try {
      await createCuratorTag(tagData);
      setShowCreateForm(false);
      await loadTags();
    } catch {
      alert('Ошибка при создании тега');
    }
  };

  const openModerationTask = (id) => setSelectedTagId(id);

  if (loading) return <div className={styles.loader}>Загрузка...</div>;

  return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Модерация тегов</h1>
          <button className={styles.createBtn} onClick={() => setShowCreateForm(true)}>+ Создать тег</button>
        </div>

        <div className={styles.filters}>
          <label>Статус:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="PENDING">На модерации</option>
            <option value="APPROVED">Одобренные</option>
            <option value="REJECTED">Отклонённые</option>
            <option value="ALL">Все</option>
          </select>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <table className={styles.table}>
          <thead>
          <tr>
            <th>Название</th>
            <th>Категория</th>
            <th>Статус</th>
            <th>Создатель</th>
            <th>Действия</th>
          </tr>
          </thead>
          <tbody>
          {tags.length === 0 ? (
              <tr><td colSpan="5" className={styles.empty}>Нет тегов</td></tr>
          ) : (
              tags.map(tag => (
                  <tr key={tag.id}>
                    <td>{tag.name}</td>
                    <td>{tag.category}</td>
                    <td><TagStatusBadge status={tag.moderationStatus} /></td>
                    <td>{tag.createdByType === 'EMPLOYER' ? 'Работодатель' : 'Система'}</td>
                    <td>
                      <button className={styles.detailBtn} onClick={() => openModerationTask(tag.id)}>
                        Задача модерации
                      </button>
                      {tag.moderationStatus === 'PENDING' && (
                          <>
                            <button className={styles.btnApprove} onClick={() => handleApprove(tag.id)}>Одобрить</button>
                            <button className={styles.btnReject} onClick={() => handleReject(tag.id)}>Отклонить</button>
                          </>
                      )}
                    </td>
                  </tr>
              ))
          )}
          </tbody>
        </table>

        {selectedTagId && (
            <CuratorTagModerationDetails
                tagId={selectedTagId}
                onClose={() => setSelectedTagId(null)}
            />
        )}

        {showCreateForm && (
            <CuratorCreateTagForm
                onCreate={handleCreate}
                onCancel={() => setShowCreateForm(false)}
                isLoading={loading}
            />
        )}
      </div>
  );
};

export default CuratorTagsPage;
