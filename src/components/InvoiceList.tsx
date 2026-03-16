'use client';

import { useState, useEffect } from 'react';
import { Eye, Send, Download, Edit, Trash2, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { generatePDF } from '@/lib/pdf-generator';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_address: string;
  client_phone?: string;
  invoice_date: string;
  due_date: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  created_at: string;
}

interface InvoiceListProps {
  onEditInvoice?: (invoice: Invoice) => void;
}

export default function InvoiceList({ onEditInvoice }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-600 text-gray-200';
      case 'sent': return 'bg-blue-600 text-blue-200';
      case 'paid': return 'bg-green-600 text-green-200';
      case 'overdue': return 'bg-red-600 text-red-200';
      default: return 'bg-gray-600 text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'sent': return 'Отправлен';
      case 'paid': return 'Оплачен';
      case 'overdue': return 'Просрочен';
      default: return status;
    }
  };

  const sendInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: invoice.client_email,
          subject: `Счет ${invoice.invoice_number}`,
          html: `
            <h2>Счет ${invoice.invoice_number}</h2>
            <p>Уважаемый ${invoice.client_name},</p>
            <p>Направляем вам счет на сумму ${invoice.total.toFixed(2)} руб.</p>
            <p>Срок оплаты: ${new Date(invoice.due_date).toLocaleDateString('ru-RU')}</p>
            <p>С уважением,<br>Ваша команда</p>
          `
        }),
      });

      if (!response.ok) throw new Error('Failed to send email');

      // Обновляем статус счета
      const supabase = createClient();
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id);

      loadInvoices();
      alert('Счет успешно отправлен!');
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Ошибка при отправке счета');
    }
  };

  const generateInvoicePDF = (invoice: Invoice) => {
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
      title: `Счет ${invoice.invoice_number}`,
      subtitle: `Дата: ${new Date(invoice.invoice_date).toLocaleDateString('ru-RU')} | Срок оплаты: ${new Date(invoice.due_date).toLocaleDateString('ru-RU')}`,
      brandColor: '#5a67d8',
      sections: [
        {
          heading: 'Информация о клиенте',
          content: `${invoice.client_name}\n${invoice.client_address}\n${invoice.client_email}${invoice.client_phone ? '\n' + invoice.client_phone : ''}`
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
    }, `invoice-${invoice.invoice_number}.pdf`);
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот счет?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Ошибка при удалении счета');
    }
  };

  const updateInvoiceStatus = async (id: string, status: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      loadInvoices();
    } catch (error) {
      console.error('Error updating invoice status:', error);
      alert('Ошибка при обновлении статуса');
    }
  };

  const filteredInvoices = filter === 'all' 
    ? invoices 
    : invoices.filter(invoice => invoice.status === filter);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Фильтры */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Все' },
          { key: 'draft', label: 'Черновики' },
          { key: 'sent', label: 'Отправленные' },
          { key: 'paid', label: 'Оплаченные' },
          { key: 'overdue', label: 'Просроченные' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-white">
            {invoices.length}
          </div>
          <div className="text-gray-400 text-sm">Всего счетов</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-400">
            {invoices.filter(i => i.status === 'paid').length}
          </div>
          <div className="text-gray-400 text-sm">Оплачено</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-400">
            {invoices.filter(i => i.status === 'sent').length}
          </div>
          <div className="text-gray-400 text-sm">Отправлено</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-400">
            {invoices.reduce((sum, i) => sum + i.total, 0).toFixed(2)} ₽
          </div>
          <div className="text-gray-400 text-sm">Общая сумма</div>
        </div>
      </div>

      {/* Список счетов */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Номер счета
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Клиент
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Срок оплаты
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Сумма
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {invoice.invoice_number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">{invoice.client_name}</div>
                    <div className="text-sm text-gray-400">{invoice.client_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {new Date(invoice.invoice_date).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {new Date(invoice.due_date).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {invoice.total.toFixed(2)} ₽
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={invoice.status}
                      onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)} border-none focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="draft">Черновик</option>
                      <option value="sent">Отправлен</option>
                      <option value="paid">Оплачен</option>
                      <option value="overdue">Просрочен</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => generateInvoicePDF(invoice)}
                        className="text-gray-400 hover:text-gray-300"
                        title="Скачать PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {invoice.status !== 'sent' && (
                        <button
                          onClick={() => sendInvoice(invoice)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Отправить"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onEditInvoice?.(invoice)}
                        className="text-yellow-400 hover:text-yellow-300"
                        title="Редактировать"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteInvoice(invoice.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-300">Нет счетов</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' ? 'Создайте свой первый счет' : `Нет счетов со статусом "${getStatusText(filter)}"`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}