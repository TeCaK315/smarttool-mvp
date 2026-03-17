'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/LoadingStates';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceFormData {
  client_name: string;
  client_email: string;
  client_address: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  items: InvoiceItem[];
  notes: string;
  tax_rate: number;
}

export default function CreateInvoicePage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    client_name: '',
    client_email: '',
    client_address: '',
    invoice_number: `INV-${Date.now()}`,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }],
    notes: '',
    tax_rate: 0
  });

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }]
    }));
  };

  const removeItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'rate') {
            updatedItem.amount = updatedItem.quantity * updatedItem.rate;
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (formData.tax_rate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e: React.FormEvent, action: 'draft' | 'send') => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const supabase = createClient();
      
      const invoiceData = {
        user_id: user.id,
        invoice_number: formData.invoice_number,
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_address: formData.client_address,
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        items: formData.items,
        notes: formData.notes,
        tax_rate: formData.tax_rate,
        subtotal: calculateSubtotal(),
        tax_amount: calculateTax(),
        amount: calculateTotal(),
        status: action === 'send' ? 'sent' : 'draft'
      };

      const { data, error } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (error) throw error;

      // If sending, also send email
      if (action === 'send') {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: formData.client_email,
            subject: `Invoice ${formData.invoice_number}`,
            body: `Dear ${formData.client_name},\n\nPlease find attached your invoice ${formData.invoice_number} for the amount of ${calculateTotal().toLocaleString('ru-RU')} ₽.\n\nDue date: ${new Date(formData.due_date).toLocaleDateString('ru-RU')}\n\nThank you for your business!`
          })
        });
      }

      router.push(`/dashboard/invoice/${data.id}`);
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white font-['Montserrat']">
              Создать новый счет
            </h1>
            <p className="text-gray-400 mt-2">
              Заполните данные для автоматического создания счета
            </p>
          </div>
        </div>

        <form className="space-y-8">
          {/* Client Information */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4 font-['Montserrat']">
              Информация о клиенте
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Имя клиента *
                </label>
                <input
                  type="text"
                  required
                  value={formData.client_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email клиента *
                </label>
                <input
                  type="email"
                  required
                  value={formData.client_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Адрес клиента
                </label>
                <textarea
                  value={formData.client_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_address: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4 font-['Montserrat']">
              Детали счета
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Номер счета
                </label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Дата выставления
                </label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Срок оплаты
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white font-['Montserrat']">
                Позиции счета
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить позицию
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-12 md:col-span-5">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Описание
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Кол-во
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Цена
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Сумма
                    </label>
                    <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300">
                      {item.amount.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                  <div className="col-span-1">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-300 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 border-t border-gray-700 pt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Подытог:</span>
                    <span className="text-white">{calculateSubtotal().toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Налог:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.tax_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                        className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                      <span className="text-gray-300">%</span>
                      <span className="text-white">{calculateTax().toLocaleString('ru-RU')} ₽</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t border-gray-700 pt-2">
                    <span className="text-white">Итого:</span>
                    <span className="text-white">{calculateTotal().toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4 font-['Montserrat']">
              Примечания
            </h2>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              placeholder="Дополнительная информация для клиента..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={loading}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? <Spinner size="sm" /> : 'Сохранить как черновик'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'send')}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? <Spinner size="sm" /> : 'Создать и отправить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}