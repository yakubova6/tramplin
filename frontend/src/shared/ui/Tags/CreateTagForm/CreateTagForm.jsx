import React, { useState } from 'react';
import styles from './CreateTagForm.module.scss';

const CATEGORIES = [
  { value: 'TECH', label: 'Технология' },
  { value: 'GRADE', label: 'Грейд' },
  { value: 'EMPLOYMENT_TYPE', label: 'Тип занятости' },
  { value: 'DIRECTION', label: 'Направление' },
  { value: 'BENEFIT', label: 'Бонус' },
  { value: 'OTHER', label: 'Другое' },
];

const CreateTagForm = ({ onCreate, onCancel, isLoading }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('TECH');
  const [error, setError] = useState('');

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
      <div className={styles.overlay}>
        <div className={styles.formContainer}>
          <h3>Предложить новый тег</h3>
          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label>Название тега *</label>
              <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="например, JavaScript"
                  disabled={isLoading}
              />
            </div>
            <div className={styles.field}>
              <label>Категория</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={isLoading}>
                {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.actions}>
              <button type="button" onClick={onCancel} disabled={isLoading}>Отмена</button>
              <button type="submit" disabled={isLoading}>Создать</button>
            </div>
          </form>
        </div>
      </div>
  );
};

export default CreateTagForm;