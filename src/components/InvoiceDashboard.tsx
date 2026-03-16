'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { FileText, Send, DollarSign, Clock, Plus, Eye, Download, Mail } from 'lucide-react';
import Link from 'next/link';
import { generatePDF } from '@/lib/pdf-generator';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  total: number;
  status: 'draft' | 'sent' | 'paid';
  invoice_date: string;
  due_date: string;
  items: any[];
  subtotal: number;
  tax: number;
  notes?: string;
  client_address?: string;
  client_phone?: string;
}

interface DashboardStats {
  totalInvoices: number;
  sentInvoices: number;
  totalAmount: number;
  overdueInvoices: number;
}

export default function InvoiceDashboard() {
  const { user } = useUser();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    sentInvoices: 0,
    totalAmount: 0,
    overdueInvoices: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    if (!user) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvoices(data || []);
      
      // Calculate stats
      const now = new Date();
      const totalInvoices = data?.length || 0;
      const sentInvoices = data?.filter(inv => inv.status === 'sent').length || 0;
      const totalAmount = data?.reduce((sum, inv) => sum + inv.total, 0) || 0;
      const overdueInvoices = data?.filter(inv => 
        inv.status === 'sent' && new Date(inv.due_date) < now
      ).length || 0;

      setStats({
        totalInvoices,
        sentInvoices,
        totalAmount,
        overdueInvoices
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadInvoicePDF = (invoice: Invoice) => {
    const pdfData = {
      title: `Счет ${invoice.invoice_number}`,
      subtitle: `Дата: ${new Date(invoice.invoice_date).toLocaleDateString('ru-RU')} | Срок оплаты: ${new Date(invoice.due_date).toLocaleDateString('ru-RU')}`,
      sections: [
        {
          heading: 'Клиент',
          content: `${invoice.client_name}\n${invoice.client_email}${invoice.client_address ? `\n${invoice.client_address}` : ''}${invoice.client_phone ? `\n${invoice.client_phone}` : ''}`
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

    generatePDF(pdfData, `invoice-${invoice.invoice_number}.pdf`);
  };

  const sendInvoiceEmail = async (invoice: Invoice) => {
    try {
      const doc = generatePDF({
        title: `Счет ${invoice.invoice_number}`,
        subtitle: `Дата: ${new Date(invoice.invoice_date).toLocaleDateString('ru-RU')} | Срок оплаты: ${new Date(invoice.due_date).toLocaleDateString('ru-RU')}`,
        sections: [
          {
            heading: 'Клиент',
            content: `${invoice.client_name}\n${invoice.client_email}${invoice.client_address ? `\n${invoice.client_address}` : ''}${invoice.client_phone ? `\n${invoice.client_phone}` : ''}`
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
      });

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: invoice.client_email,
          subject: `Счет ${invoice.invoice_number}`,
          html: `
            <h2>Счет ${invoice.invoice_number}</h2>
            <p>Здравствуйте, ${invoice.client_name}!</p>
            <p>Во вложении находится счет на сумму ₽${invoice.total.toFixed(2)}.</p>
            <p>Срок оплаты: ${new Date(invoice.due_date).toLocaleDateString('ru-RU')}</p>
            <p>С уважением</p>
          `,
          attachments: [{
            filename: `invoice-${invoice.invoice_number}.pdf`,
            content: doc.output('datauristring').split(',')[1]
          }]
        })
      });

      if (!response.ok) throw new Error('Ошибка отправки email');

      // Update invoice status
      const supabase = createClient();
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id);

      alert('Счет успешно отправлен клиенту!');
      fetchInvoices(); // Refresh data
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Ошибка при отправке счета');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'sent': return 'bg-blue-500';
      case 'paid': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'sent': return 'Отправлен';
      case 'paid': return 'Оплачен';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat' }}>
              Панель управления счетами
            </h1>
            <p className="text-gray-300">Управляйте своими счетами и отслеживайте платежи</p>
          </div>
          <Link
            href="/dashboard/create"
            className="flex items-center gap-2 px-4 py-2 text-white rounded-md hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#5a67d8' }}
          >
            <Plus className="w-5 h-5" />
            Создать счет
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Всего счетов</p>
              <p className="text-2xl font-bold text-white">{stats.totalInvoices}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Отправлено</p>
              <p className="text-2xl font-bold text-white">{stats.sentInvoices}</p>
            </div>
            <Send className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Общая сумма</p>
              <p className="text-2xl font-bold text-white">₽{stats.totalAmount.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Просрочено</p>
              <p className="text-2xl font-bold text-white">{stats.overdueInvoices}</p>
            </div>
            <Clock className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Последние счета</h2>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">Нет счетов</h3>
            <p className="text-gray-400 mb-4">Создайте свой первый счет, чтобы начать работу</p>
            <Link
              href="/dashboard/create"
              className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-md hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#5a67d8' }}
            >
              <Plus className="w-4 h-4" />
              Создать счет
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Номер
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Клиент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Срок оплаты
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{invoice.client_name}</div>
                        <div className="text-sm text-gray-400">{invoice.client_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      ₽{invoice.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(invoice.status)}`}>
                        {getStatusText(invoice.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(invoice.due_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => downloadInvoicePDF(invoice)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Скачать PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => sendInvoiceEmail(invoice)}
                            className="text-green-400 hover:text-green-300"
                            title="Отправить клиенту"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}