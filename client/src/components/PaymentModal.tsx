import { useState } from 'react';
import { CreditCard, Smartphone, X } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  title: string;
  description?: string;
  onSuccess?: () => void;
}

const PAYMENT_METHODS = [
  { id: 'card', label: 'Visa / Mastercard', icon: CreditCard },
  { id: 'mbank', label: 'MBANK', icon: Smartphone },
  { id: 'odengi', label: 'O!Деньги', icon: Smartphone },
] as const;

export function PaymentModal({
  open,
  onClose,
  amount,
  title,
  description,
  onSuccess,
}: PaymentModalProps) {
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]['id']>('card');
  const [processing, setProcessing] = useState(false);

  function handlePay() {
    setProcessing(true);
    window.setTimeout(() => {
      setProcessing(false);
      onSuccess?.();
      onClose();
    }, 700);
  }

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="space-y-4 p-5">
        <div className="rounded-xl bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-500">К оплате</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{amount} сом</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-900">Способ оплаты</p>
          {PAYMENT_METHODS.map((item) => {
            const Icon = item.icon;
            const active = method === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMethod(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                  active
                    ? 'border-indigo-300 bg-indigo-50/70 text-indigo-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-indigo-600' : 'bg-slate-300'}`}
                />
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">
          Демо-режим. Реальный платёж не выполняется
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={processing}>
            Отмена
          </Button>
          <Button onClick={handlePay} loading={processing}>
            Оплатить (демо)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
