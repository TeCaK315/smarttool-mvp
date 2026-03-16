'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Send, FileText } from 'lucide-react';
import { Spinner } from '@/components/LoadingStates';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
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

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
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

  const generateInvoicePDF = () => {
    const tableRows = invoiceData.items.map(item => [
      item.description,
      item.quantity.toString(),
      `$${item.rate.toFixed(2)}`,
      `$${item.amount.toFixed(2)}`
    ]);

    // Добавляем строки итогов
    tableRows.push(['', '', 'Подытог:', `$${invoiceData.subtotal.toFixed(2)}`]);
    tableRows.push(['', '', 'Налог (10%):', `$${invoiceData.tax.toFixed(2)}`]);
    tableRows.push(['', '', 'Итого:', `$${invoiceData.total.toFixed(2)}`]);

    const sections = [
      {
        heading: 'Информация о клиенте',
        content: `${invoiceData.client.name}\n${invoiceData.client.email}\n${invoiceData.client.address}${invoiceData.client.phone ? '\n' + invoiceData.client.phone : ''}`
      },
      {
        heading: 'Детали счета',
        table: {
          headers: ['Описание', 'Кол-во', 'Цена', 'Сумма'],
          rows: tableRows,
          alignRight: [2, 3]
        }
      }
    ];

    if (invoiceData.notes) {
      sections.push({
        heading: 'Примечания',
        content: invoiceData.notes
      });
    }

    generatePDF({
      title: `Счет ${invoiceData.invoiceNumber}`,
      subtitle: `Дата: ${new Date(invoiceData.date).toLocaleDateString('ru-RU')} | Срок оплаты: ${new Date(invoiceData.dueDate).toLocaleDateString('ru-RU')}`,
      sections,
      brandColor: '#5a67d8'
    }, `invoice-${invoiceData.invoiceNumber}.pdf`);
  };

  const saveInvoice = async () => {
    setIsLoading(true);
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
          invoice_date: invoiceData.date,
          due_date: invoiceData.dueDate,
          items: invoiceData.items,
          subtotal: invoiceData.subtotal,
          tax: invoiceData.tax,
          total: invoiceData.total,
          notes: invoiceData.notes,
          status: 'draft'
        }])
        .select()
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Ошибка сохранения счета:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendInvoice = async () => {
    setIsSending(true);
    try {
      // Сначала сохраняем счет
      const savedInvoice = await saveInvoice();
      
      // Отправляем email
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: invoiceData.client.email,
          subject: `Счет ${invoiceData.invoiceNumber}`,
          html: `
            <h2>Новый счет</h2>
            <p>Здравствуйте, ${invoiceData.client.name}!</p>
            <p>Вы получили новый счет ${invoiceData.invoiceNumber} на сумму $${invoiceData.total.toFixed(2)}.</p>
            <p>Срок оплаты: ${new Date(invoiceData.dueDate).toLocaleDateString('ru-RU')}</p>
            <p>С уважением,<br>Ваша команда</p>
          `
        })
      });

      if (!response.ok) throw new Error('Ошибка отправки email');

      // Обновляем статус счета
      const supabase = createClient();
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', savedInvoice.id);

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
      console.error('Ошибка отправки счета:', error);
      alert('Ошибка при отправке счета. Попробуйте еще раз.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Создание счета</h1>
        <p className="text-gray-300">Заполните данные для автоматического создания и отправки счета</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Основная информация */}
        <div className="space-y-6">
          <div className="bg-gray-700 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Информация о счете</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Номер счета
                </label>
                <input
                  type="text"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Дата
                  </label>
                  <input
                    type="date"
                    value={invoiceData.date}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Срок оплаты
                  </label>
                  <input
                    type="date"
                    value={invoiceData.dueDate}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Информация о клиенте</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Имя клиента *
                </label>
                <input
                  type="text"
                  value={invoiceData.client.name}
                  onChange={(e) => setInvoiceData(prev => ({ 
                    ...prev, 
                    client: { ...prev.client, name: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={invoiceData.client.email}
                  onChange={(e) => setInvoiceData(prev => ({ 
                    ...prev, 
                    client: { ...prev.client, email: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Адрес
                </label>
                <textarea
                  value={invoiceData.client.address}
                  onChange={(e) => setInvoiceData(prev => ({ 
                    ...prev, 
                    client: { ...prev.client, address: e.target.value }
                  }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={invoiceData.client.phone}
                  onChange={(e) => setInvoiceData(prev => ({ 
                    ...prev, 
                    client: { ...prev.client, phone: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Товары и услуги */}
        <div className="space-y-6">
          <div className="bg-gray-700 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Товары и услуги</h2>
              <button
                onClick={addItem}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>
            
            <div className="space-y-4">
              {invoiceData.items.map((item, index) => (
                <div key={item.id} className="bg-gray-600 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-300">Позиция {index + 1}</span>
                    {invoiceData.items.length > 1 && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Описание товара/услуги"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-500 border border-gray-400 rounded-md text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">Кол-во</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1 bg-gray-500 border border-gray-400 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">Цена</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-gray-500 border border-gray-400 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">Сумма</label>
                        <div className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm">
                          ${item.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Итоги */}
          <div className="bg-gray-700 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Итоги</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>Подытог:</span>
                <span>${invoiceData.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Налог (10%):</span>
                <span>${invoiceData.tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-600 pt-2">
                <div className="flex justify-between text-white font-semibold text-lg">
                  <span>Итого:</span>
                  <span>${invoiceData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Примечания */}
          <div className="bg-gray-700 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Примечания</h3>
            <textarea
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Дополнительная информация для клиента..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Действия */}
      <div className="mt-8 flex flex-wrap gap-4 justify-end">
        <button
          onClick={generateInvoicePDF}
          className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Скачать PDF
        </button>
        
        <button
          onClick={sendInvoice}
          disabled={isSending || !invoiceData.client.name || !invoiceData.client.email}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {isSending ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isSending ? 'Отправка...' : 'Создать и отправить'}
        </button>
      </div>
    </div>
  );
}