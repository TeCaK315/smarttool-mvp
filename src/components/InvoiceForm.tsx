'use client';

import { useState } from 'react';
import { Plus, Trash2, Send, Save, FileText } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
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
    const updatedItems = invoiceData.items.map(item => {
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
    setInvoiceData(prev => ({
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
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (id: string) => {
    if (invoiceData.items.length === 1) return;
    
    const updatedItems = invoiceData.items.filter(item => item.id !== id);
    const totals = calculateTotals(updatedItems);
    setInvoiceData(prev => ({
      ...prev,
      items: updatedItems,
      ...totals
    }));
  };

  const saveInvoice = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoiceData.invoiceNumber,
          client_name: invoiceData.client.name,
          client_email: invoiceData.client.email,
          client_address: invoiceData.client.address,
          client_phone: invoiceData.client.phone,
          items: invoiceData.items,
          subtotal: invoiceData.subtotal,
          tax: invoiceData.tax,
          total: invoiceData.total,
          due_date: invoiceData.dueDate,
          notes: invoiceData.notes,
          status: 'draft'
        }])
        .select()
        .single();

      if (error) throw error;

      alert('Счет успешно сохранен!');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка при сохранении счета');
    } finally {
      setIsSaving(false);
    }
  };

  const sendInvoice = async () => {
    if (!invoiceData.client.email) {
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
          invoice_number: invoiceData.invoiceNumber,
          client_name: invoiceData.client.name,
          client_email: invoiceData.client.email,
          client_address: invoiceData.client.address,
          client_phone: invoiceData.client.phone,
          items: invoiceData.items,
          subtotal: invoiceData.subtotal,
          tax: invoiceData.tax,
          total: invoiceData.total,
          due_date: invoiceData.dueDate,
          notes: invoiceData.notes,
          status: 'sent'
        }])
        .select()
        .single();

      if (error) throw error;

      // Отправляем email
      const response = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: invoiceData.client.email,
          invoiceData: invoiceData
        })
      });

      if (!response.ok) throw new Error('Ошибка отправки email');

      alert('Счет успешно создан и отправлен клиенту!');
      
      // Сбрасываем форму
      setInvoiceData({
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
      console.error('Ошибка отправки:', error);
      alert('Ошибка при отправке счета');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDFPreview = () => {
    const tableRows = invoiceData.items.map(item => [
      item.description,
      item.quantity.toString(),
      `₽${item.rate.toFixed(2)}`,
      `₽${item.amount.toFixed(2)}`
    ]);

    generatePDF({
      title: `Счет ${invoiceData.invoiceNumber}`,
      subtitle: `Дата: ${new Date(invoiceData.date).toLocaleDateString('ru-RU')} | Срок оплаты: ${new Date(invoiceData.dueDate).toLocaleDateString('ru-RU')}`,
      sections: [
        {
          heading: 'Клиент',
          content: `${invoiceData.client.name}\n${invoiceData.client.email}\n${invoiceData.client.address}${invoiceData.client.phone ? `\n${invoiceData.client.phone}` : ''}`
        },
        {
          heading: 'Позиции',
          table: {
            headers: ['Описание', 'Кол-во', 'Цена', 'Сумма'],
            rows: tableRows,
            alignRight: [2, 3]
          }
        },
        {
          content: `Подытог: ₽${invoiceData.subtotal.toFixed(2)}\nНалог (10%): ₽${invoiceData.tax.toFixed(2)}\nИтого: ₽${invoiceData.total.toFixed(2)}`
        }
      ],
      brandColor: '#5a67d8'
    }, `${invoiceData.invoiceNumber}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white font-['Montserrat']">Создание счета</h2>
        <div className="flex gap-2">
          <button
            onClick={generatePDFPreview}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={saveInvoice}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
            Сохранить
          </button>
          <button
            onClick={sendInvoice}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#5a67d8] text-white rounded-lg hover:bg-[#4c51bf] transition-colors disabled:opacity-50"
          >
            {isLoading ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
            Отправить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Информация о счете */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Информация о счете</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Номер счета</label>
              <input
                type="text"
                value={invoiceData.invoiceNumber}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#5a67d8] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Дата</label>
              <input
                type="date"
                value={invoiceData.date}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#5a67d8] focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Срок оплаты</label>
            <input
              type="date"
              value={invoiceData.dueDate}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#5a67d8] focus:border-transparent"
            />
          </div>
        </div>

        {/* Информация о клиенте */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Информация о клиенте</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Имя клиента *</label>
            <input
              type="text"
              value={invoiceData.client.name}
              onChange={(e) => setInvoiceData(prev => ({ 
                ...prev, 
                client: { ...prev.client, name: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#5a67d8] focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
            <input
              type="email"
              value={invoiceData.client.email}
              onChange={(e) => setInvoiceData(prev => ({ 
                ...prev, 
                client: { ...prev.client, email: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#5a67d8] focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Адрес</label>
            <textarea
              value={invoiceData.client.address}
              onChange={(e) => setInvoiceData(prev => ({ 
                ...prev, 
                client: { ...prev.client, address: e.target.value }
              }))}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#5a67d8] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Телефон</label>
            <input
              type="tel"
              value={invoiceData.client.phone}
              onChange={(e) => setInvoiceData(prev => ({ 
                ...prev, 
                client: { ...prev.client, phone: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#5a67d8] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Позиции счета */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Позиции счета</h3>
          <button
            onClick={addItem}
            className="flex items-center gap-2 px-3 py-2 bg-[#5a67d8] text-white rounded-lg hover:bg-[#4c51bf] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Добавить позицию
          </button>
        </div>

        <div className="space-y-3">
          {invoiceData.items.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-700 rounded-lg">
              <div className="col-span-5">
                <input
                  type="text"
                  placeholder="Описание услуги/товара"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:ring-2 focus:ring-[#5a67d8] focus:border-transparent"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  placeholder="Кол-во"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:ring-2 focus:ring-[#5a67d8] focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  placeholder="Цена"
                  value={item.rate}
                  onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:ring-2 focus:ring-[#5a67d8] focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-span-2">
                <div className="px-3 py-2 bg-gray-600 rounded text-white text-right">
                  ₽{item.amount.toFixed(2)}
                </div>
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={invoiceData.items.length === 1}
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
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-gray-300">
            <span>Подытог:</span>
            <span>₽{invoiceData.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Налог (10%):</span>
            <span>₽{invoiceData.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-white font-bold text-lg border-t border-gray-600 pt-2">
            <span>Итого:</span>
            <span>₽{invoiceData.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Примечания */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Примечания</label>
        <textarea
          value={invoiceData.notes}
          onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          placeholder="Дополнительная информация, условия оплаты..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#5a67d8] focus:border-transparent"
        />
      </div>
    </div>
  );
}