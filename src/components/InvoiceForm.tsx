'use client';

import { useState } from 'react';
import { Plus, Trash2, Send, Save, User, Building2, FileText, Calculator } from 'lucide-react';
import { Spinner } from '@/components/LoadingStates';
import { generatePDF } from '@/lib/pdf-generator';
import { createClient } from '@/lib/supabase/client';

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
  company: string;
  address: string;
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
  notes: string;
}

interface InvoiceFormProps {
  onInvoiceCreated?: (invoice: InvoiceData) => void;
}

export default function InvoiceForm({ onInvoiceCreated }: InvoiceFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData>({
    invoiceNumber: `INV-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    client: {
      name: '',
      email: '',
      company: '',
      address: ''
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
      const { data: { user } } = supabase.auth.getUser();
      
      if (!user) throw new Error('Пользователь не авторизован');

      const { error } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          invoice_number: invoice.invoiceNumber,
          client_data: invoice.client,
          items: invoice.items,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          due_date: invoice.dueDate,
          notes: invoice.notes,
          status: 'draft'
        });

      if (error) throw error;

      onInvoiceCreated?.(invoice);
      alert('Счет успешно сохранен!');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
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

    setIsSending(true);
    try {
      // Сначала сохраняем счет
      await saveInvoice();

      // Генерируем PDF
      const pdfDoc = generatePDF({
        title: `Счет ${invoice.invoiceNumber}`,
        subtitle: `Дата: ${new Date(invoice.date).toLocaleDateString('ru-RU')}`,
        sections: [
          {
            heading: 'Информация о клиенте',
            content: `${invoice.client.name}\n${invoice.client.company}\n${invoice.client.address}`
          },
          {
            heading: 'Позиции',
            table: {
              headers: ['Описание', 'Кол-во', 'Цена', 'Сумма'],
              rows: invoice.items.map(item => [
                item.description,
                item.quantity.toString(),
                `${item.rate.toFixed(2)} ₽`,
                `${item.amount.toFixed(2)} ₽`
              ]),
              alignRight: [2, 3]
            }
          },
          {
            content: `Подытог: ${invoice.subtotal.toFixed(2)} ₽\nНалог: ${invoice.tax.toFixed(2)} ₽\nИтого: ${invoice.total.toFixed(2)} ₽`
          }
        ],
        brandColor: '#5a67d8'
      });

      // Отправляем email
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: invoice.client.email,
          subject: `Счет ${invoice.invoiceNumber}`,
          body: `Здравствуйте, ${invoice.client.name}!\n\nВо вложении счет ${invoice.invoiceNumber} на сумму ${invoice.total.toFixed(2)} ₽.\n\nСрок оплаты: ${new Date(invoice.dueDate).toLocaleDateString('ru-RU')}\n\nС уважением`
        })
      });

      if (!response.ok) throw new Error('Ошибка отправки email');

      alert('Счет успешно отправлен клиенту!');
    } catch (error) {
      console.error('Ошибка отправки:', error);
      alert('Ошибка при отправке счета');
    } finally {
      setIsSending(false);
    }
  };

  const downloadPDF = () => {
    generatePDF({
      title: `Счет ${invoice.invoiceNumber}`,
      subtitle: `Дата: ${new Date(invoice.date).toLocaleDateString('ru-RU')}`,
      sections: [
        {
          heading: 'Информация о клиенте',
          content: `${invoice.client.name}\n${invoice.client.company}\n${invoice.client.address}`
        },
        {
          heading: 'Позиции',
          table: {
            headers: ['Описание', 'Кол-во', 'Цена', 'Сумма'],
            rows: invoice.items.map(item => [
              item.description,
              item.quantity.toString(),
              `${item.rate.toFixed(2)} ₽`,
              `${item.amount.toFixed(2)} ₽`
            ]),
            alignRight: [2, 3]
          }
        },
        {
          content: `Подытог: ${invoice.subtotal.toFixed(2)} ₽\nНалог: ${invoice.tax.toFixed(2)} ₽\nИтого: ${invoice.total.toFixed(2)} ₽`
        }
      ],
      brandColor: '#5a67d8'
    }, `invoice-${invoice.invoiceNumber}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-gray-100">Создание счета</h2>
      </div>

      {/* Основная информация */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Номер счета
          </label>
          <input
            type="text"
            value={invoice.invoiceNumber}
            onChange={(e) => setInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Информация о клиенте */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-100">Информация о клиенте</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Имя клиента
            </label>
            <input
              type="text"
              value={invoice.client.name}
              onChange={(e) => setInvoice(prev => ({
                ...prev,
                client: { ...prev.client, name: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={invoice.client.email}
              onChange={(e) => setInvoice(prev => ({
                ...prev,
                client: { ...prev.client, email: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Компания
            </label>
            <input
              type="text"
              value={invoice.client.company}
              onChange={(e) => setInvoice(prev => ({
                ...prev,
                client: { ...prev.client, company: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Позиции счета */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-100">Позиции счета</h3>
          </div>
          <button
            onClick={addItem}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Добавить позицию
          </button>
        </div>

        <div className="space-y-3">
          {invoice.items.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-3 items-center bg-gray-700 p-3 rounded-md">
              <div className="col-span-5">
                <input
                  type="text"
                  placeholder="Описание услуги/товара"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  placeholder="Кол-во"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  placeholder="Цена"
                  value={item.rate}
                  onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <div className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-gray-100">
                  {item.amount.toFixed(2)} ₽
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
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-100">Итоги</h3>
        </div>
        <div className="bg-gray-700 p-4 rounded-md max-w-sm ml-auto">
          <div className="flex justify-between mb-2">
            <span className="text-gray-300">Подытог:</span>
            <span className="text-gray-100">{invoice.subtotal.toFixed(2)} ₽</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-300">Налог (10%):</span>
            <span className="text-gray-100">{invoice.tax.toFixed(2)} ₽</span>
          </div>
          <div className="border-t border-gray-600 pt-2">
            <div className="flex justify-between font-bold">
              <span className="text-gray-100">Итого:</span>
              <span className="text-blue-400 text-lg">{invoice.total.toFixed(2)} ₽</span>
            </div>
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
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500"
          placeholder="Дополнительная информация..."
        />
      </div>

      {/* Действия */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={saveInvoice}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
          Сохранить
        </button>
        
        <button
          onClick={downloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Скачать PDF
        </button>
        
        <button
          onClick={sendInvoice}
          disabled={isSending || !invoice.client.email}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSending ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
          Отправить клиенту
        </button>
      </div>
    </div>
  );
}