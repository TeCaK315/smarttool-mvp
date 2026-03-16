'use client';

import { useState } from 'react';
import { Plus, Trash2, Send, Save, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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

interface InvoiceFormProps {
  onInvoiceCreated?: (invoice: InvoiceData) => void;
}

export default function InvoiceForm({ onInvoiceCreated }: InvoiceFormProps) {
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(true);
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoice.invoiceNumber,
          client_name: invoice.client.name,
          client_email: invoice.client.email,
          client_address: invoice.client.address,
          client_phone: invoice.client.phone,
          invoice_date: invoice.date,
          due_date: invoice.dueDate,
          items: invoice.items,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          notes: invoice.notes,
          status: 'draft'
        }])
        .select()
        .single();

      if (error) throw error;

      onInvoiceCreated?.(invoice);
      alert('Счет успешно сохранен!');
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Ошибка при сохранении счета');
    } finally {
      setIsLoading(false);
    }
  };

  const sendInvoice = async () => {
    if (!invoice.client.email) {
      alert('Укажите email клиента для отправки');
      return;
    }

    setIsLoading(true);
    try {
      // Сначала сохраняем счет
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoice.invoiceNumber,
          client_name: invoice.client.name,
          client_email: invoice.client.email,
          client_address: invoice.client.address,
          client_phone: invoice.client.phone,
          invoice_date: invoice.date,
          due_date: invoice.dueDate,
          items: invoice.items,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          notes: invoice.notes,
          status: 'sent'
        }])
        .select()
        .single();

      if (error) throw error;

      // Отправляем email
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: invoice.client.email,
          subject: `Счет ${invoice.invoiceNumber}`,
          html: `
            <h2>Счет ${invoice.invoiceNumber}</h2>
            <p>Уважаемый ${invoice.client.name},</p>
            <p>Направляем вам счет на сумму ${invoice.total.toFixed(2)} руб.</p>
            <p>Срок оплаты: ${new Date(invoice.dueDate).toLocaleDateString('ru-RU')}</p>
            <p>С уважением,<br>Ваша команда</p>
          `
        }),
      });

      if (!response.ok) throw new Error('Failed to send email');

      onInvoiceCreated?.(invoice);
      alert('Счет успешно создан и отправлен клиенту!');
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Ошибка при отправке счета');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDFInvoice = () => {
    const tableRows = invoice.items.map(item => [
      item.description,
      item.quantity.toString(),
      item.rate.toFixed(2),
      item.amount.toFixed(2)
    ]);

    // Добавляем строки итогов
    tableRows.push(['', '', 'Подытог:', invoice.subtotal.toFixed(2)]);
    tableRows.push(['', '', 'Налог (10%):', invoice.tax.toFixed(2)]);
    tableRows.push(['', '', 'Итого:', invoice.total.toFixed(2)]);

    generatePDF({
      title: `Счет ${invoice.invoiceNumber}`,
      subtitle: `Дата: ${new Date(invoice.date).toLocaleDateString('ru-RU')} | Срок оплаты: ${new Date(invoice.dueDate).toLocaleDateString('ru-RU')}`,
      brandColor: '#5a67d8',
      sections: [
        {
          heading: 'Информация о клиенте',
          content: `${invoice.client.name}\n${invoice.client.address}\n${invoice.client.email}${invoice.client.phone ? '\n' + invoice.client.phone : ''}`
        },
        {
          heading: 'Детали счета',
          table: {
            headers: ['Описание', 'Кол-во', 'Цена', 'Сумма'],
            rows: tableRows,
            alignRight: [1, 2, 3]
          }
        },
        ...(invoice.notes ? [{
          heading: 'Примечания',
          content: invoice.notes
        }] : [])
      ]
    }, `invoice-${invoice.invoiceNumber}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Создание счета</h2>
        <div className="flex gap-2">
          <button
            onClick={generatePDFInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={saveInvoice}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Сохранить
          </button>
          <button
            onClick={sendInvoice}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Отправить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Информация о счете */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Информация о счете</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Номер счета
              </label>
              <input
                type="text"
                value={invoice.invoiceNumber}
                onChange={(e) => setInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Дата
                </label>
                <input
                  type="date"
                  value={invoice.date}
                  onChange={(e) => setInvoice(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Срок оплаты
                </label>
                <input
                  type="date"
                  value={invoice.dueDate}
                  onChange={(e) => setInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Информация о клиенте */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Информация о клиенте</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Название/Имя
              </label>
              <input
                type="text"
                value={invoice.client.name}
                onChange={(e) => setInvoice(prev => ({ 
                  ...prev, 
                  client: { ...prev.client, name: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={invoice.client.email}
                onChange={(e) => setInvoice(prev => ({ 
                  ...prev, 
                  client: { ...prev.client, email: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Адрес
              </label>
              <textarea
                value={invoice.client.address}
                onChange={(e) => setInvoice(prev => ({ 
                  ...prev, 
                  client: { ...prev.client, address: e.target.value }
                }))}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Телефон
              </label>
              <input
                type="tel"
                value={invoice.client.phone}
                onChange={(e) => setInvoice(prev => ({ 
                  ...prev, 
                  client: { ...prev.client, phone: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Позиции счета */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Позиции счета</h3>
          <button
            onClick={addItem}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Добавить позицию
          </button>
        </div>

        <div className="space-y-4">
          {invoice.items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-4 items-end p-4 bg-gray-700 rounded-lg">
              <div className="col-span-5">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Описание
                </label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Описание услуги/товара"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Количество
                </label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Цена
                </label>
                <input
                  type="number"
                  value={item.rate}
                  onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Сумма
                </label>
                <div className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white">
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
      <div className="flex justify-end mb-6">
        <div className="w-80 space-y-2">
          <div className="flex justify-between py-2 border-b border-gray-600">
            <span className="text-gray-300">Подытог:</span>
            <span className="text-white font-semibold">{invoice.subtotal.toFixed(2)} ₽</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-600">
            <span className="text-gray-300">Налог (10%):</span>
            <span className="text-white font-semibold">{invoice.tax.toFixed(2)} ₽</span>
          </div>
          <div className="flex justify-between py-2 text-lg font-bold">
            <span className="text-white">Итого:</span>
            <span className="text-orange-400">{invoice.total.toFixed(2)} ₽</span>
          </div>
        </div>
      </div>

      {/* Примечания */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Примечания
        </label>
        <textarea
          value={invoice.notes}
          onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Дополнительная информация, условия оплаты и т.д."
        />
      </div>
    </div>
  );
}