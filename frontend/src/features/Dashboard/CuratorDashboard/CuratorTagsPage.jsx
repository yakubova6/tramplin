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
import CustomSelect from '@/shared/ui/CustomSelect';
import { getTagCategoryLabel } from '@/shared/lib/utils/tagCategories';
import { useToast } from '@/shared/hooks/use-toast';
import styles from '@/features/Dashboard/EmployerDashboard/sections/EmployerTagsPage.module.scss';

const CuratorTagsPage = () => {
  const { toast } = useToast();
  const filterOptions = [
    { value: 'PENDING', label: 'На модерации' },
    { value: 'APPROVED', label: 'Одобренные' },
    { value: 'REJECTED', label: 'Отклонённые' },
    { value: 'ALL', label: 'Все' },
  ];
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
      toast({
        title: 'Тег одобрен',
        description: 'Изменения успешно применены',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error?.message || 'Не удалось одобрить тег',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectModerationTag(id);
      await loadTags();
      toast({
        title: 'Тег отклонён',
        description: 'Заявка на тег отклонена',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error?.message || 'Не удалось отклонить тег',
        variant: 'destructive',
      });
    }
  };

  const handleCreate = async (tagData) => {
    try {
      await createCuratorTag(tagData);
      setShowCreateForm(false);
      await loadTags();
      toast({
        title: 'Тег создан',
        description: 'Новый тег успешно добавлен',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error?.message || 'Не удалось создать тег',
        variant: 'destructive',
      });
    }
  };

  const openModerationTask = (id) => setSelectedTagId(id);

  if (loading) return <div className={styles.loader}>Загрузка...</div>;

  return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Теги и модерация</h1>
          <button className={styles.createBtn} onClick={() => setShowCreateForm(true)}>+ Новый тег</button>
        </div>

        <div className={styles.filters}>
          <div className={styles.filtersField}>
            <label>Статус</label>
            <CustomSelect value={filterStatus} onChange={setFilterStatus} options={filterOptions} />
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <table className={styles.table}>
          <thead>
          <tr>
            <th>Название</th>
            <th>Категория</th>
            <th>Статус</th>
            <th>Источник</th>
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
                    <td>{getTagCategoryLabel(tag.category)}</td>
                    <td><TagStatusBadge status={tag.moderationStatus} /></td>
                    <td>
                      {tag.createdByType === 'EMPLOYER' ? 'Работодатель' : tag.createdByType === 'CURATOR' ? 'Куратор' : 'Система'}
                    </td>
                    <td>
                      <button className={styles.detailBtn} onClick={() => openModerationTask(tag.id)}>
                        Открыть карточку
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
