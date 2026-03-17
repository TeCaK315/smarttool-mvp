'use client';

import { useState, useEffect } from 'react';
import { Eye, Send, Download, Edit, Trash2, Search } from 'lucide-react';
import { Spinner } from '@/components/LoadingStates';
import { generatePDF } from '@/lib/pdf-generator';
import { createClient } from '@/lib/supabase/client';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_address: string;
  client_phone?: string;
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
  due_date: string;
  notes?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  created_at: string;
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sendingId, setSendingId] = useState<string | null>(null);

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
      console.error('Ошибка загрузки счетов:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-600 text-gray-200';
      case 'sent': return 'bg-blue-600 text-blue-100';
      case 'paid': return 'bg-green-600 text-green-100';
      case 'overdue': return 'bg-red-600 text-red-100';
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

  const downloadInvoicePDF = (invoice: Invoice) => {
    const tableRows = invoice.items.map(item => [
      item.description,
      item.quantity.toString(),
      `₽${item.rate.toFixed(2)}`,
      `₽${item.amount.toFixed(2)}`
    ]);

    generatePDF({
      title: `Счет ${invoice.invoice_number}`,
      subtitle: `Дата: ${new Date(invoice.created_at).toLocaleDateString('ru-RU')} | Срок оплаты: ${new Date(invoice.due_date).toLocaleDateString('ru-RU')}`,
      sections: [
        {
          heading: 'Клиент',
          content: `${invoice.client_name}\n${invoice.client_email}\n${invoice.client_address}${invoice.client_phone ? `\n${invoice.client_phone}` : ''}`
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
          content: `Подытог: ₽${invoice.subtotal.toFixed(2)}\nНалог (10%): ₽${invoice.tax.toFixed(2)}\nИтого: ₽${invoice.total.toFixed(2)}`
        }
      ],
      brandColor: '#5a67d8'
    }, `${invoice.invoice_number}.pdf`);
  };

  const sendInvoice = async (invoice: Invoice) => {
    setSendingId(invoice.id);
    try {
      const response = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: invoice.client_email,
          invoiceData: {
            invoiceNumber: invoice.invoice_number,
            date: invoice.created_at,
            dueDate: invoice.due_date,
            client: {
              name: invoice.client_name,
              email: invoice.client_email,
              address: invoice.client_address,
              phone: invoice.client_phone
            },
            items: invoice.items,
            subtotal: invoice.subtotal,
            tax: invoice.tax,
            total: invoice.total,
            notes: invoice.notes
          }
        })
      });

      if (!response.ok) throw new Error('Ошибка отправки email');

      // Обновляем статус счета
      const supabase = createClient();
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id);

      alert('Счет успешно отправлен!');
      loadInvoices();
    } catch (error) {
      console.error('Ошибка отправки:', error);
      alert('Ошибка при отправке счета');
    } finally {
      setSendingId(null);
    }
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
      
      setInvoices(prev => prev.filter(invoice => invoice.id !== id));
      alert('Счет удален');
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка при удалении счета');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Фильтры */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Поиск по клиенту или номеру счета..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#5a67d8] focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#5a67d8] focus:border-transparent"
        >
          <option value="all">Все статусы</option>
          <option value="draft">Черновики</option>
          <option value="sent">Отправленные</option>
          <option value="paid">Оплаченные</option>
          <option value="overdue">Просроченные</option>
        </select>
      </div>

      {/* Список счетов */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {searchTerm || statusFilter !== 'all' ? 'Счета не найдены' : 'У вас пока нет счетов'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {invoice.invoice_number}
                  </h3>
                  <p className="text-gray-300">{invoice.client_name}</p>
                  <p className="text-sm text-gray-400">{invoice.client_email}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white mb-1">
                    ₽{invoice.total.toFixed(2)}
                  </div>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                    {getStatusText(invoice.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-400">Создан:</span>
                  <span className="text-white ml-2">
                    {new Date(invoice.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Срок оплаты:</span>
                  <span className="text-white ml-2">
                    {new Date(invoice.due_date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => downloadInvoicePDF(invoice)}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                
                {invoice.status !== 'paid' && (
                  <button
                    onClick={() => sendInvoice(invoice)}
                    disabled={sendingId === invoice.id}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-[#5a67d8] text-white rounded hover:bg-[#4c51bf] transition-colors disabled:opacity-50"
                  >
                    {sendingId === invoice.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Отправить
                  </button>
                )}
                
                <button
                  onClick={() => deleteInvoice(invoice.id)}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}