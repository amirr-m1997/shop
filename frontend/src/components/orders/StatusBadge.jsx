import React from 'react';
import { STATUS_CONFIG } from './constants';

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
      <Icon className={`h-3.5 w-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
