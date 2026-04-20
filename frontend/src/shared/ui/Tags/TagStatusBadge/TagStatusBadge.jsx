import React from 'react';
import styles from './TagStatusBadge.module.scss';

const statusConfig = {
  PENDING: { label: 'На модерации', className: styles.pending },
  APPROVED: { label: 'Одобрен', className: styles.approved },
  REJECTED: { label: 'Отклонён', className: styles.rejected },
};

const TagStatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.PENDING;
  return <span className={`${styles.badge} ${config.className}`}>{config.label}</span>;
};

export default TagStatusBadge;