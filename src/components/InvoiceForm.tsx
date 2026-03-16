'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { Plus, Trash2, Send, Save } from 'lucide-react';
import { generatePDF } from '@/lib/pdf-generator';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface ClientData {
  name: string;
  email: string;
  address: string;
  phone?: string;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  client: ClientData;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export default function InvoiceForm() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData>({
    invoiceNumber: `INV-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    client: {
      name: '',
      email: '',
      address: '',
      phone: ''
    },
    items: [{
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    }],
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: ''
  });

  const calculateTotals = (items: InvoiceItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.1; // 10% налог
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = invoice.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updatedItem.amount = updatedItem.quantity * updatedItem.rate;
        }
        return updatedItem;
      }
      return item;
    });

    const totals = calculateTotals(updatedItems);
    setInvoice(prev => ({
      ...prev,
      items: updatedItems,
      ...totals
    }));
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (id: string) => {
    if (invoice.items.length === 1) return;
    
    const updatedItems = invoice.items.filter(item => item.id !== id);
    const totals = calculateTotals(updatedItems);
    setInvoice(prev => ({
      ...prev,
      items: updatedItems,
      ...totals
    }));
  };

  const saveInvoice = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          invoice_number: invoice.invoiceNumber,
          client_name: invoice.client.name,
          client_email: invoice.client.email,
          client_address: invoice.client.address,
          client_phone: invoice.client.phone,
          items: invoice.items,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          due_date: invoice.dueDate,
          notes: invoice.notes,
          status: 'draft'
        });

      if (error) throw error;
      
      // Показать уведомление об успехе
      alert('Счет сохранен как черновик');
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Ошибка при сохранении счета');
    } finally {
      setLoading(false);
    }
  };

  const sendInvoice = async () => {
    if (!user || !invoice.client.email) return;
    
    setLoading(true);
    try {
      // Сначала сохраняем счет
      const supabase = createClient();
      const { error: saveError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          invoice_number: invoice.invoiceNumber,
          client_name: invoice.client.name,
          client_email: invoice.client.email,
          client_address: invoice.client.address,
          client_phone: invoice.client.phone,
          items: invoice.items,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          due_date: invoice.dueDate,
          notes: invoice.notes,
          status: 'sent'
        });

      if (saveError) throw saveError;

      // Генерируем PDF
      const pdfSections = [
        {
          heading: 'Детали клиента',
          content: `${invoice.client.name}\n${invoice.client.address}\n${invoice.client.email}${invoice.client.phone ? '\n' + invoice.client.phone : ''}`
        },
        {
          heading: 'Позиции счета',
          table: {
            headers: ['Описание', 'Кол-во', 'Цена', 'Сумма'],
            rows: invoice.items.map(item => [
              item.description,
              item.quantity.toString(),
              `₽${item.rate.toFixed(2)}`,
              `₽${item.amount.toFixed(2)}`
            ]),
            alignRight: [2, 3]
          }
        },
        {
          content: `Подытог: ₽${invoice.subtotal.toFixed(2)}\nНалог: ₽${invoice.tax.toFixed(2)}\nИтого: ₽${invoice.total.toFixed(2)}`
        }
      ];

      if (invoice.notes) {
        pdfSections.push({
          heading: 'Примечания',
          content: invoice.notes
        });
      }

      const doc = generatePDF({
        title: `Счет ${invoice.invoiceNumber}`,
        subtitle: `Дата: ${new Date(invoice.date).toLocaleDateString('ru-RU')} | Срок оплаты: ${new Date(invoice.dueDate).toLocaleDateString('ru-RU')}`,
        sections: pdfSections,
        brandColor: '#5a67d8'
      });

      // Отправляем email
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: invoice.client.email,
          subject: `Счет ${invoice.invoiceNumber}`,
          html: `
            <h2>Новый счет от ${user.email}</h2>
            <p>Здравствуйте, ${invoice.client.name}!</p>
            <p>Прикрепляем счет ${invoice.invoiceNumber} на сумму ₽${invoice.total.toFixed(2)}.</p>
            <p>Срок оплаты: ${new Date(invoice.dueDate).toLocaleDateString('ru-RU')}</p>
            ${invoice.notes ? `<p>Примечания: ${invoice.notes}</p>` : ''}
            <p>С уважением,<br>${user.email}</p>
          `
        })
      });

      if (!response.ok) throw new Error('Failed to send email');

      alert('Счет успешно создан и отправлен клиенту!');
      
      // Сбрасываем форму
      setInvoice({
        invoiceNumber: `INV-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        client: { name: '', email: '', address: '', phone: '' },
        items: [{ id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }],
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: ''
      });
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Ошибка при отправке счета');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Создать новый счет</h2>
        <p className="text-gray-300">Заполните данные для автоматического создания и отправки счета</p>
      </div>

      {/* Основная информация о счете */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Номер счета
          </label>
          <input
            type="text"
            value={invoice.invoiceNumber}
            onChange={(e) => setInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Дата
          </label>
          <input
            type="date"
            value={invoice.date}
            onChange={(e) => setInvoice(prev => ({ ...prev, date: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Срок оплаты
          </label>
          <input
            type="date"
            value={invoice.dueDate}
            onChange={(e) => setInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Данные клиента */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Данные клиента</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Имя клиента *
            </label>
            <input
              type="text"
              value={invoice.client.name}
              onChange={(e) => setInvoice(prev => ({ 
                ...prev, 
                client: { ...prev.client, name: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={invoice.client.email}
              onChange={(e) => setInvoice(prev => ({ 
                ...prev, 
                client: { ...prev.client, email: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Адрес
            </label>
            <input
              type="text"
              value={invoice.client.address}
              onChange={(e) => setInvoice(prev => ({ 
                ...prev, 
                client: { ...prev.client, address: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Телефон
            </label>
            <input
              type="tel"
              value={invoice.client.phone}
              onChange={(e) => setInvoice(prev => ({ 
                ...prev, 
                client: { ...prev.client, phone: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Позиции счета */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Позиции счета</h3>
          <button
            onClick={addItem}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить позицию
          </button>
        </div>

        <div className="space-y-4">
          {invoice.items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-5">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Описание
                </label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Описание услуги или товара"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Кол-во
                </label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Цена (₽)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.rate}
                  onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Сумма (₽)
                </label>
                <div className="px-3 py-2 bg-gray-600 border border-gray-600 rounded-md text-white">
                  {item.amount.toFixed(2)}
                </div>
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={invoice.items.length === 1}
                  className="p-2 text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Итоги */}
      <div className="mb-8">
        <div className="max-w-sm ml-auto space-y-2">
          <div className="flex justify-between text-gray-300">
            <span>Подытог:</span>
            <span>₽{invoice.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Налог (10%):</span>
            <span>₽{invoice.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold text-white border-t border-gray-600 pt-2">
            <span>Итого:</span>
            <span>₽{invoice.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Примечания */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Примечания
        </label>
        <textarea
          value={invoice.notes}
          onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Дополнительная информация для клиента..."
        />
      </div>

      {/* Кнопки действий */}
      <div className="flex gap-4">
        <button
          onClick={saveInvoice}
          disabled={loading || !invoice.client.name}
          className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4 mr-2" />
          Сохранить как черновик
        </button>
        <button
          onClick={sendInvoice}
          disabled={loading || !invoice.client.name || !invoice.client.email || invoice.items.some(item => !item.description)}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4 mr-2" />
          {loading ? 'Отправка...' : 'Создать и отправить счет'}
        </button>
      </div>
    </div>
  );
}