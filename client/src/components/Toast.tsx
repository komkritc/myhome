import { createContext, useContext, useState } from 'react';

export const ToastContext = createContext<{
  addInfo: (msg: string) => void;
  addSuccess: (msg: string) => void;
  addError: (msg: string) => void;
}>({ addInfo: () => {}, addSuccess: () => {}, addError: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

interface ToastItem {
  id: number;
  msg: string;
  type: 'info' | 'success' | 'error';
}

const _items: ToastItem[] = [];
let nextId = 0;

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>(_items);

  const addItem = (msg: string, type: 'info' | 'success' | 'error') => {
    const id = nextId++;
    setItems(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 4000);
  };

  const addInfo = (msg: string) => addItem(msg, 'info');
  const addSuccess = (msg: string) => addItem(msg, 'success');
  const addError = (msg: string) => addItem(msg, 'error');

  const removeItem = (id: number) => setItems(prev => prev.filter(i => i.id !== id));

  return (
    <ToastContext.Provider value={{ addInfo, addSuccess, addError }}>
      <ToasterList items={items} onRemove={removeItem} />
    </ToastContext.Provider>
  );
}

function ToasterList({ items, onRemove }: { items: ToastItem[]; onRemove(id: number): void }) {
  if (items.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onRemove(item.id)}
          role="alert"
          aria-label={item.msg}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-elevated border text-sm font-medium text-left w-full max-w-sm animate-slide-in transition-opacity ${
            item.type === 'success' ? 'bg-white border-success/20 text-success-dark' :
            item.type === 'error' ? 'bg-white border-danger/20 text-danger-dark' :
            'bg-white border-brand-200 text-brand-800'
          }`}
        >
          <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
            item.type === 'success' ? 'bg-success text-white' :
            item.type === 'error' ? 'bg-danger text-white' :
            'bg-brand-600 text-white'
          }`}>
            {item.type === 'success' ? '✓' : item.type === 'error' ? '✕' : 'i'}
          </span>
          <span className="flex-1">{item.msg}</span>
        </button>
      ))}
    </div>
  );
}
