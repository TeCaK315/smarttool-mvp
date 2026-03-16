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
    const tax = subtotal * 0.1; // 10% tax
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

  const saveInvoice = async (sendToClient = false) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const supabase = createClient();
      
      // Save invoice to database
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
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
          status: sendToClient ? 'sent' : 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      // Generate PDF
      const pdfData = {
        title: `Счет ${invoice.invoiceNumber}`,
        subtitle: `Дата: ${new Date(invoice.date).toLocaleDateString('ru-RU')} | Срок оплаты: ${new Date(invoice.dueDate).toLocaleDateString('ru-RU')}`,
        sections: [
          {
            heading: 'Клиент',
            content: `${invoice.client.name}\n${invoice.client.email}\n${invoice.client.address}${invoice.client.phone ? `\n${invoice.client.phone}` : ''}`
          },
          {
            heading: 'Позиции',
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
        ]
      };

      if (sendToClient && invoice.client.email) {
        // Generate PDF for email
        const doc = generatePDF(pdfData);
        
        // Send email with PDF
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: invoice.client.email,
            subject: `Счет ${invoice.invoiceNumber}`,
            html: `
              <h2>Счет ${invoice.invoiceNumber}</h2>
              <p>Здравствуйте, ${invoice.client.name}!</p>
              <p>Во вложении находится счет на сумму ₽${invoice.total.toFixed(2)}.</p>
              <p>Срок оплаты: ${new Date(invoice.dueDate).toLocaleDateString('ru-RU')}</p>
              <p>С уважением</p>
            `,
            attachments: [{
              filename: `invoice-${invoice.invoiceNumber}.pdf`,
              content: doc.output('datauristring').split(',')[1]
            }]
          })
        });

        if (!response.ok) throw new Error('Ошибка отправки email');
      } else {
        // Just download PDF
        generatePDF(pdfData, `invoice-${invoice.invoiceNumber}.pdf`);
      }

      // Reset form
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

      alert(sendToClient ? 'Счет успешно создан и отправлен клиенту!' : 'Счет успешно сохранен!');
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Ошибка при сохранении счета');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat' }}>
          Создание счета
        </h1>
        <p className="text-gray-300">Заполните данные для автоматического создания счета</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Invoice Details */}
        <div className="space-y-6">
          <div className="bg-gray-700 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Детали счета</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Номер счета
                </label>
                <input
                  type="text"
                  value={invoice.invoiceNumber}
                  onChange={(e) => setInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
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
                    value={invoice.date}
                    onChange={(e) => setInvoice(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Client Details */}
          <div className="bg-gray-700 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Данные клиента</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Название/Имя *
                </label>
                <input
                  type="text"
                  value={invoice.client.name}
                  onChange={(e) => setInvoice(prev => ({ 
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
                  value={invoice.client.email}
                  onChange={(e) => setInvoice(prev => ({ 
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
                  value={invoice.client.address}
                  onChange={(e) => setInvoice(prev => ({ 
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
                  value={invoice.client.phone}
                  onChange={(e) => setInvoice(prev => ({ 
                    ...prev, 
                    client: { ...prev.client, phone: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Items and Total */}
        <div className="space-y-6">
          <div className="bg-gray-700 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Позиции</h2>
              <button
                onClick={addItem}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>
            
            <div className="space-y-4">
              {invoice.items.map((item, index) => (
                <div key={item.id} className="bg-gray-600 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-300">Позиция {index + 1}</span>
                    {invoice.items.length > 1 && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Описание услуги/товара"
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
                        <div className="px-2 py-1 bg-gray-500 border border-gray-400 rounded text-white text-sm">
                          ₽{item.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-gray-700 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Итого</h2>
            <div className="space-y-2 text-gray-300">
              <div className="flex justify-between">
                <span>Подытог:</span>
                <span>₽{invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Налог (10%):</span>
                <span>₽{invoice.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-white border-t border-gray-600 pt-2">
                <span>Итого:</span>
                <span>₽{invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-gray-700 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Примечания</h2>
            <textarea
              value={invoice.notes}
              onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Дополнительная информация..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => saveInvoice(false)}
              disabled={isLoading || !invoice.client.name || !invoice.client.email}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-5 h-5" />
              Сохранить
            </button>
            <button
              onClick={() => saveInvoice(true)}
              disabled={isLoading || !invoice.client.name || !invoice.client.email}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: '#5a67d8' }}
            >
              <Send className="w-5 h-5" />
              Отправить клиенту
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}