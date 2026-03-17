'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { Spinner } from '@/components/LoadingStates';
import { Plus, Search, Filter, Eye, Send, Download, Edit } from 'lucide-react';
import Link from 'next/link';
import { generatePDF } from '@/lib/pdf-generator';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_address: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid';
  created_at: string;
  due_date: string;
  notes: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

export default function InvoicesPage() {
  const { user, loading: userLoading } = useUser();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500';
      case 'sent':
        return 'bg-yellow-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Оплачен';
      case 'sent':
        return 'Отправлен';
      case 'draft':
        return 'Черновик';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const downloadInvoicePDF = (invoice: Invoice) => {
    const sections = [
      {
        heading: 'Информация о клиенте',
        content: `${invoice.client_name}\n${invoice.client_email}\n${invoice.client_address || ''}`
      },
      {
        heading: 'Детали счета',
        content: `Номер счета: ${invoice.invoice_number}\nДата создания: ${formatDate(invoice.created_at)}\nСрок оплаты: ${formatDate(invoice.due_date)}`
      },
      {
        heading: 'Позиции',
        table: {
          headers: ['Описание', 'Кол-во', 'Цена', 'Сумма'],
          rows: invoice.items.map(item => [
            item.description,
            item.quantity.toString(),
            formatCurrency(item.rate),
            formatCurrency(item.amount)
          ]),
          alignRight: [2, 3]
        }
      }
    ];

    if (invoice.notes) {
      sections.push({
        heading: 'Примечания',
        content: invoice.notes
      });
    }

    generatePDF({
      title: `Счет ${invoice.invoice_number}`,
      subtitle: `Итого: ${formatCurrency(invoice.amount)}`,
      sections,
      brandColor: '#5a67d8'
    }, `invoice-${invoice.invoice_number}.pdf`);
  };

  const sendInvoice = async (invoice: Invoice) => {
    try {
      setLoading(true);
      
      // Update status to sent
      const supabase = createClient();
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id);

      // Send email
      await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: invoice.client_email,
          subject: `Счет ${invoice.invoice_number}`,
          body: `Здравствуйте, ${invoice.client_name}!\n\nВысылаем вам счет ${invoice.invoice_number} на сумму ${formatCurrency(invoice.amount)}.\n\nСрок оплаты: ${formatDate(invoice.due_date)}\n\nС уважением,\nВаша команда`
        })
      });

      // Refresh invoices
      await fetchInvoices();
      alert('Счет успешно отправлен!');
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white font-['Montserrat']">
              Счета
            </h1>
            <p className="text-gray-400 mt-2">
              Управляйте всеми своими счетами
            </p>
          </div>
          <Link
            href="/dashboard/invoices/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Создать счет
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Поиск по номеру счета, клиенту или email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Все статусы</option>
                <option value="draft">Черновики</option>
                <option value="sent">Отправленные</option>
                <option value="paid">Оплаченные</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="overflow-x-auto">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  {searchTerm || statusFilter !== 'all' ? 'Счета не найдены' : 'Нет счетов'}
                </div>
                {!searchTerm && statusFilter === 'all' && (
                  <Link
                    href="/dashboard/invoices/new"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Создать первый счет
                  </Link>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-750">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Номер счета
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Клиент
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Сумма
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Дата создания
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Срок оплаты
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">{invoice.client_name}</div>
                          <div className="text-sm text-gray-400">{invoice.client_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(invoice.status)}`}>
                          {getStatusText(invoice.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(invoice.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(invoice.due_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/invoices/${invoice.id}`}
                            className="text-indigo-400 hover:text-indigo-300"
                            title="Просмотр"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => downloadInvoicePDF(invoice)}
                            className="text-green-400 hover:text-green-300"
                            title="Скачать PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {invoice.status === 'draft' && (
                            <>
                              <Link
                                href={`/dashboard/invoices/${invoice.id}/edit`}
                                className="text-yellow-400 hover:text-yellow-300"
                                title="Редактировать"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => sendInvoice(invoice)}
                                className="text-blue-400 hover:text-blue-300"
                                title="Отправить"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}