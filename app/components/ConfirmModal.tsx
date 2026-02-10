// components/ConfirmModal.tsx
"use client";

import React from 'react';

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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={type === 'confirm' && onCancel ? onCancel : undefined}
    >
      <div
        style={{
          backgroundColor: 'var(--discord-bg-dark)',
          borderRadius: '8px',
          border: '1px solid var(--discord-border)',
          padding: '24px 28px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p
          style={{
            color: 'var(--discord-text-normal)',
            fontSize: '15px',
            lineHeight: 1.5,
            marginBottom: '24px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          {type === 'confirm' && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--discord-border)',
                backgroundColor: 'var(--discord-bg-secondary)',
                color: 'var(--discord-text-normal)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary"
            style={{ padding: '8px 20px', fontSize: '14px' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
