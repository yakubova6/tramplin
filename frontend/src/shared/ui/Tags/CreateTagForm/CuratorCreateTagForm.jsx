import React, { useEffect, useState } from 'react';
import Input from '@/shared/ui/Input';
import Label from '@/shared/ui/Label';
import Button from '@/shared/ui/Button';
import CustomSelect from '@/shared/ui/CustomSelect';
import styles from './CreateTagForm.module.scss';

const CATEGORIES = [
  { value: 'TECH', label: 'Технология' },
  { value: 'GRADE', label: 'Грейд' },
  { value: 'EMPLOYMENT_TYPE', label: 'Тип занятости' },
  { value: 'DIRECTION', label: 'Направление' },
  { value: 'BENEFIT', label: 'Бонус' },
  { value: 'OTHER', label: 'Другое' },
];

const CuratorCreateTagForm = ({ onCreate, onCancel, isLoading }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('TECH');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  useEffect(() => {
    document.documentElement.classList.add('is-lock');
    return () => document.documentElement.classList.remove('is-lock');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Введите название тега');
      return;
    }
    setError('');
    await onCreate({ name: name.trim(), category });
  };

  return (
      <div className={styles.overlay} onMouseDown={onCancel}>
        <div className={styles.formContainer} onMouseDown={(e) => e.stopPropagation()}>
          <h3>Создать тег</h3>
          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <Label>Название тега <span className="required-star">*</span></Label>
              <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="например, JavaScript"
                  disabled={isLoading}
              />
            </div>
            <div className={styles.field}>
              <CustomSelect
                  label="Категория"
                  value={category}
                  onChange={setCategory}
                  options={CATEGORIES}
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.actions}>
              <Button type="button" className="button--outline" onClick={onCancel} disabled={isLoading}>Отмена</Button>
              <Button type="submit" className="button--primary" disabled={isLoading}>Создать</Button>
            </div>
          </form>
        </div>
      </div>
  );
};

export default CuratorCreateTagForm;
