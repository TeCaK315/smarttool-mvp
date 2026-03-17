'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useParams, useRouter } from 'next/navigation';
import { Edit, Send, Download, CheckCircle, Clock, FileText } from 'lucide-react';
import Link from 'next/link';
import { generatePDF } from '@/lib/pdf-generator';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

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
  items: InvoiceItem[];
}

export default function InvoiceDetailPage() {
  const { user } = useUser();
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user && params.id) {
      fetchInvoice();
    }
  }, [user, params.id]);

  const fetchInvoice = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setInvoice(data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      router.push('/dashboard/invoices');
    } finally {
      setLoading(false);
    }
  };

  const updateInvoiceStatus = async (status: 'draft' | 'sent' | 'paid') => {
    if (!invoice) return;

    setUpdating(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', invoice.id);

      if (error) throw error;

      // If sending invoice, also send email
      if (status === 'sent' && invoice.client_email) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: invoice.client_email,
              subject: `Счет ${invoice.invoice_number}`,
              body: `
Здравствуйте!

Направляем вам счет ${invoice.invoice_number} на сумму ${formatCurrency(invoice.amount)}.

Срок оплаты: ${formatDate(invoice.due_date)}

${invoice.notes ? `Примечания: ${invoice.notes}` : ''}

С уважением,
${user?.email}
              `
            })
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }

      setInvoice(prev => prev ? { ...prev, status } : null);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      alert('An error occurred');
    } finally {
      setUpdating(false);
    }
  };

  const downloadInvoicePDF = () => {
    if (!invoice) return;

    const tableRows = invoice.items.map(item => [
      item.description,
      item.quantity.toString(),
      formatCurrency(item.rate),
      formatCurrency(item.amount)
    ]);

    generatePDF({
      title: `Счет ${invoice.invoice_number}`,
      subtitle: `От: ${user?.email}\nДля: ${invoice.client_name}\nДата: ${formatDate(invoice.created_at)}\nСрок оплаты: ${formatDate(invoice.due_date)}`,
      sections: [
        {
          heading: 'Детали клиента',
          content: `${invoice.client_name}\n${invoice.client_email}${invoice.client_address ? `\n${invoice.client_address}` : ''}`
        },
        {
          heading: 'Позиции счета',
          table: {
            headers: ['Описание', 'Кол-во', 'Цена', 'Сумма'],
            rows: tableRows,
            alignRight: [2, 3]
          }
        },
        {
          heading: 'Итого',
          content: `Общая сумма: ${formatCurrency(invoice.amount)}`
        },
        ...(invoice.notes ? [{
          heading: 'Примечания',
          content: invoice.notes
        }] : [])
      ],
      brandColor: '#5a67d8'
    }, `invoice-${invoice.invoice_number}.pdf`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'sent':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'draft':
        return <FileText className="h-5 w-5 text-gray-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Счет не найден</h2>
          <Link
            href="/dashboard/invoices"
            className="text-indigo-400 hover:text-indigo-300"
          >
            Вернуться к списку счетов
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white font-['Montserrat'] mb-2">
              {invoice.invoice_number}
            </h1>
            <div className="flex items-center gap-3">
              {getStatusIcon(invoice.status)}
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                {getStatusText(invoice.status)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={downloadInvoicePDF}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>

            <Link
              href={`/dashboard/invoices/${invoice.id}/edit`}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Редактировать
            </Link>

            {invoice.status === 'draft' && (
              <button
                onClick={() => updateInvoiceStatus('sent')}
                disabled={updating}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Отправить
              </button>
            )}

            {invoice.status === 'sent' && (
              <button
                onClick={() => updateInvoiceStatus('paid')}
                disabled={updating}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Отметить оплаченным
              </button>
            )}
          </div>
        </div>

        {/* Invoice Details */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Информация о клиенте</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-400">Название:</span>
                  <span className="ml-2 text-white">{invoice.client_name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Email:</span>
                  <span className="ml-2 text-white">{invoice.client_email}</span>
                </div>
                {invoice.client_address && (
                  <div>
                    <span className="text-gray-400">Адрес:</span>
                    <div className="ml-2 text-white whitespace-pre-line">{invoice.client_address}</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Детали счета</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-400">Дата создания:</span>
                  <span className="ml-2 text-white">{formatDate(invoice.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Срок оплаты:</span>
                  <span className="ml-2 text-white">{formatDate(invoice.due_date)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Общая сумма:</span>
                  <span className="ml-2 text-white font-bold text-xl">{formatCurrency(invoice.amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-medium text-white mb-4">Позиции счета</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 text-gray-400">Описание</th>
                  <th className="text-right py-3 text-gray-400">Кол-во</th>
                  <th className="text-right py-3 text-gray-400">Цена</th>
                  <th className="text-right py-3 text-gray-400">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-700">
                    <td className="py-3 text-white">{item.description}</td>
                    <td className="py-3 text-right text-white">{item.quantity}</td>
                    <td className="py-3 text-right text-white">{formatCurrency(item.rate)}</td>
                    <td className="py-3 text-right text-white font-medium">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} className="py-4 text-right text-gray-400 font-medium">
                    Итого:
                  </td>
                  <td className="py-4 text-right text-white font-bold text-xl">
                    {formatCurrency(invoice.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Примечания</h3>
            <p className="text-gray-300 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}