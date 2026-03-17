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
  due_date: string;
  notes: string;
  items: InvoiceItem[];
}

export default function NewInvoicePage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    client_name: '',
    client_email: '',
    client_address: '',
    invoice_number: `INV-${Date.now()}`,
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    items: [
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0
      }
    ]
  });

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: crypto.randomUUID(),
          description: '',
          quantity: 1,
          rate: 0,
          amount: 0
        }
      ]
    }));
  };

  const removeItem = (id: string) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id)
      }));
    }
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

  const getTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + item.amount, 0);
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
        due_date: formData.due_date,
        notes: formData.notes,
        items: formData.items,
        amount: getTotalAmount(),
        status: action === 'send' ? 'sent' : 'draft'
      };

      const { data, error } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (error) throw error;

      // If sending, also send email
      if (action === 'send' && formData.client_email) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: formData.client_email,
              subject: `Invoice ${formData.invoice_number}`,
              body: `Dear ${formData.client_name},\n\nPlease find your invoice ${formData.invoice_number} attached.\n\nTotal Amount: ${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(getTotalAmount())}\nDue Date: ${new Date(formData.due_date).toLocaleDateString('ru-RU')}\n\nThank you for your business!`
            })
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // Continue even if email fails
        }
      }

      router.push(`/dashboard/invoices/${data.id}`);
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
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
            Заполните данные для создания счета
          </p>
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Client Information */}
        <div className="bg-[#2d3748] p-6 rounded-lg border border-gray-700">
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
                className="w-full px-3 py-2 bg-[#1a202c] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#5a67d8]"
                placeholder="Введите имя клиента"
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
                className="w-full px-3 py-2 bg-[#1a202c] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#5a67d8]"
                placeholder="client@example.com"
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
                className="w-full px-3 py-2 bg-[#1a202c] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#5a67d8]"
                placeholder="Введите адрес клиента"
              />
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="bg-[#2d3748] p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 font-['Montserrat']">
            Детали счета
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Номер счета *
              </label>
              <input
                type="text"
                required
                value={formData.invoice_number}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                className="w-full px-3 py-2 bg-[#1a202c] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#5a67d8]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Срок оплаты *
              </label>
              <input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full px-3 py-2 bg-[#1a202c] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#5a67d8]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Примечания
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-[#1a202c] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#5a67d8]"
                placeholder="Дополнительные примечания к счету"
              />
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="bg-[#2d3748] p-6 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white font-['Montserrat']">
              Позиции счета
            </h2>
            <button
              type="button"
              onClick={addItem}
              className="bg-[#5a67d8] hover:bg-[#4c51bf] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Добавить позицию
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-[#1a202c] rounded-lg">
                <div className="md:col-span-5">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Описание *
                  </label>
                  <input
                    type="text"
                    required
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    className="w-full px-3 py-2 bg-[#2d3748] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#5a67d8]"
                    placeholder="Описание услуги или товара"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Количество *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#2d3748] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#5a67d8]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Цена *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#2d3748] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#5a67d8]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Сумма
                  </label>
                  <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300">
                    {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(item.amount)}
                  </div>
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={formData.items.length === 1}
                    className="w-full p-2 text-red-400 hover:text-red-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-600">
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-gray-400">Общая сумма:</p>
                <p className="text-2xl font-bold text-white">
                  {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(getTotalAmount())}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Отмена
          </Link>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'draft')}
            disabled={loading}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Spinner /> : 'Сохранить как черновик'}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'send')}
            disabled={loading}
            className="px-6 py-3 bg-[#5a67d8] hover:bg-[#4c51bf] text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Spinner /> : 'Создать и отправить'}
          </button>
        </div>
      </form>
    </div>
  );
}