'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Send } from 'lucide-react';

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

export default function NewInvoice() {
  const { user } = useUser();
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

  const getTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + item.amount, 0);
  };

  const saveInvoice = async (status: 'draft' | 'sent') => {
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
        amount: getTotalAmount(),
        status,
        items: formData.items
      };

      const { data, error } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (error) throw error;

      // If sending invoice, also send email
      if (status === 'sent' && formData.client_email) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: formData.client_email,
              subject: `Счет ${formData.invoice_number} от ${formData.client_name}`,
              body: `
Здравствуйте!

Направляем вам счет ${formData.invoice_number} на сумму ${new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB'
              }).format(getTotalAmount())}.

Срок оплаты: ${new Date(formData.due_date).toLocaleDateString('ru-RU')}

${formData.notes ? `Примечания: ${formData.notes}` : ''}

С уважением,
${user.email}
              `
            })
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // Don't fail the invoice creation if email fails
        }
      }

      router.push(`/dashboard/invoices/${data.id}`);
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white font-['Montserrat']">
            Создать новый счет
          </h1>
          <p className="text-gray-400 mt-2">
            Заполните данные для создания счета
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <form className="space-y-6">
            {/* Client Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Название клиента *
                </label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email клиента *
                </label>
                <input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Адрес клиента
              </label>
              <textarea
                value={formData.client_address}
                onChange={(e) => setFormData(prev => ({ ...prev, client_address: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Номер счета *
                </label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Срок оплаты *
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Invoice Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">Позиции счета</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Добавить позицию
                </button>
              </div>

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-5">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Описание
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Описание услуги или товара"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Кол-во
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Цена
                      </label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Сумма
                      </label>
                      <div className="px-3 py-2 bg-gray-600 border border-gray-600 rounded-md text-gray-300">
                        {formatCurrency(item.amount)}
                      </div>
                    </div>

                    <div className="col-span-1">
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Итого:</div>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(getTotalAmount())}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Примечания
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Дополнительная информация для клиента"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={() => saveInvoice('draft')}
                disabled={loading || !formData.client_name || !formData.client_email}
                className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Сохранить как черновик
              </button>

              <button
                type="button"
                onClick={() => saveInvoice('sent')}
                disabled={loading || !formData.client_name || !formData.client_email}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Отправить клиенту
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}