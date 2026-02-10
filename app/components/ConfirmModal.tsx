// components/ConfirmModal.tsx
"use client";

import React from 'react';
import '../common.css';

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'confirm' | 'alert'; // confirm: OK/キャンセル, alert: OKのみ
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'OK',
  cancelLabel = 'キャンセル',
  type = 'confirm',
}) => {
  return (
    <div
      className="modal-overlay"
      onClick={type === 'confirm' && onCancel ? onCancel : undefined}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal-message">
          {message}
        </p>
        <div className="modal-buttons">
          {type === 'confirm' && onCancel && (
            <button
              type="button"
              className="modal-btn-cancel"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className="btn-primary modal-btn-confirm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
