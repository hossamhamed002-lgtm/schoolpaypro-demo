import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { X, Info, AlertTriangle, ShieldAlert } from 'lucide-react';

type Variant = 'info' | 'warning' | 'danger';

type PromptOptions = {
  title?: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
};

type ConfirmOptions = {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
};

type AlertOptions = {
  title?: string;
  message?: string;
  confirmLabel?: string;
  variant?: Variant;
};

const variantStyles: Record<Variant, { bg: string; text: string; icon: React.ReactNode; button: string }> = {
  info: {
    bg: 'bg-indigo-50 text-indigo-700',
    text: 'text-indigo-700',
    icon: <Info size={18} className="text-indigo-500" />,
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white'
  },
  warning: {
    bg: 'bg-amber-50 text-amber-700',
    text: 'text-amber-700',
    icon: <AlertTriangle size={18} className="text-amber-500" />,
    button: 'bg-amber-600 hover:bg-amber-700 text-white'
  },
  danger: {
    bg: 'bg-rose-50 text-rose-700',
    text: 'text-rose-700',
    icon: <ShieldAlert size={18} className="text-rose-500" />,
    button: 'bg-rose-600 hover:bg-rose-700 text-white'
  }
};

const BaseDialog: React.FC<{
  title?: string;
  message?: string;
  variant?: Variant;
  children?: React.ReactNode;
  onConfirm?: () => Promise<void> | void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
}> = ({ title, message, variant = 'info', children, onConfirm, onCancel, confirmLabel, cancelLabel, showCancel = true }) => {
  const [pending, setPending] = useState(false);
  const confirm = async () => {
    if (!onConfirm) return;
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-100" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {variantStyles[variant].icon}
            <h3 className="text-lg font-black text-slate-800">{title || 'تنبيه'}</h3>
          </div>
          {showCancel && (
            <button
              onClick={() => !pending && onCancel?.()}
              className="text-slate-400 hover:text-slate-600 transition"
              aria-label="close dialog"
              disabled={pending}
            >
              <X size={18} />
            </button>
          )}
        </div>
        {message && <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{message}</p>}
        {children}
        <div className="flex justify-end gap-2">
          {showCancel && (
            <button
              onClick={() => !pending && onCancel?.()}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition disabled:opacity-60"
              disabled={pending}
            >
              {cancelLabel || 'إلغاء'}
            </button>
          )}
          {onConfirm && (
            <button
              onClick={confirm}
              className={`px-4 py-2 rounded-xl text-sm font-bold shadow transition disabled:opacity-60 disabled:cursor-not-allowed ${variantStyles[variant].button}`}
              disabled={pending}
            >
              <span className="flex items-center gap-2">
                {pending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {confirmLabel || 'تأكيد'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const PromptDialog: React.FC<{
  options: PromptOptions;
  resolve: (value: string | null) => void;
  cleanup: () => void;
}> = ({ options, resolve, cleanup }) => {
  const [value, setValue] = useState(options.defaultValue ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  const close = (result: string | null) => {
    resolve(result);
    cleanup();
  };

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const onConfirm = () => close(value.trim());

  return (
    <BaseDialog
      title={options.title || 'إدخال'}
      message={options.message}
      variant={options.variant || 'info'}
      onConfirm={onConfirm}
      onCancel={() => close(null)}
      confirmLabel={options.confirmLabel || 'تأكيد'}
      cancelLabel={options.cancelLabel || 'إلغاء'}
    >
      <input
        ref={inputRef}
        type="text"
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50"
        placeholder={options.placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onConfirm();
          }
        }}
      />
    </BaseDialog>
  );
};

export const showDesktopPrompt = (options: PromptOptions = {}) => {
  return new Promise<string | null>((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const cleanup = () => {
      root.unmount();
      if (host.parentNode) host.parentNode.removeChild(host);
    };
    root.render(<PromptDialog options={options} resolve={resolve} cleanup={cleanup} />);
  });
};

export const showDesktopConfirm = (options: ConfirmOptions = {}) => {
  return new Promise<boolean>((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const cleanup = () => {
      root.unmount();
      if (host.parentNode) host.parentNode.removeChild(host);
    };
    const onConfirm = () => {
      resolve(true);
      cleanup();
    };
    const onCancel = () => {
      resolve(false);
      cleanup();
    };
    root.render(
      <BaseDialog
        title={options.title || 'تأكيد'}
        message={options.message}
        variant={options.variant || 'info'}
        onConfirm={onConfirm}
        onCancel={onCancel}
        confirmLabel={options.confirmLabel || 'تأكيد'}
        cancelLabel={options.cancelLabel || 'إلغاء'}
      />
    );
  });
};

export const showDesktopAlert = (options: AlertOptions = {}) => {
  return new Promise<void>((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const cleanup = () => {
      root.unmount();
      if (host.parentNode) host.parentNode.removeChild(host);
    };
    const onConfirm = () => {
      resolve();
      cleanup();
    };
    root.render(
      <BaseDialog
        title={options.title || 'تنبيه'}
        message={options.message}
        variant={options.variant || 'info'}
        onConfirm={onConfirm}
        onCancel={onConfirm}
        confirmLabel={options.confirmLabel || 'حسناً'}
        showCancel={false}
      />
    );
  });
};
