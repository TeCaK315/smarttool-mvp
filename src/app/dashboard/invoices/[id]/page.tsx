'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Edit, Download, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Spinner } from '@/components/LoadingStates';
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
  const { user, loading: userLoading } = useUser();
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user && params.id) {
      loadInvoice();
    }
  }, [user, params.id]);

  const loadInvoice = async () => {
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
      console.error('Error loading invoice:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const sendInvoice = async () => {
    if (!invoice) return;

    setActionLoading(true);
    try {
      const supabase = createClient();
      
      // Update status to sent
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id);

      if (error) throw error;

      // Send email
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: invoice.client_email,
          subject: `Счет ${invoice.invoice_number}`,
          body: `Здравствуйте, ${invoice.client_name}!\n\nВысылаем вам счет ${invoice.invoice_number} на сумму ${formatCurrency(invoice.amount)}.\n\nСрок оплаты: ${formatDate(invoice.due_date)}\n\nС уважением`
        })
      });

      setInvoice(prev => prev ? { ...prev, status: 'sent' } : null);
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const markAsPaid = async () => {
    if (!invoice) return;

    setActionLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoice.id);

      if (error) throw error;
      setInvoice(prev => prev ? { ...prev, status: 'paid' } : null);
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!invoice) return;

    const tableRows = invoice.items.map(item => [
      item.description,
      item.quantity.toString(),
      formatCurrency(item.rate),
      formatCurrency(item.amount)
    ]);

    generatePDF({
      title: `Счет ${invoice.invoice_number}`,
      subtitle: `Клиент: ${invoice.client_name}`,
      sections: [
        {
          heading: 'Информация о клиенте',
          content: `${invoice.client_name}\n${invoice.client_email}\n${invoice.client_address}`
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
          heading: 'Итого',
          content: formatCurrency(invoice.amount)
        },
        ...(invoice.notes ? [{
          heading: 'Примечания',
          content: invoice.notes
        }] : [])
      ]
    }, `invoice-${invoice.invoice_number}.pdf`);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Счет не найден</h2>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
            Вернуться к панели управления
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Назад
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat' }}>
                Счет {invoice.invoice_number}
              </h1>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mt-2 ${getStatusColor(invoice.status)}`}>
                {getStatusText(invoice.status)}
              </span>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={downloadPDF}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Скачать PDF
            </button>

            {invoice.status === 'draft' && (
              <button
                onClick={sendInvoice}
                disabled={actionLoading}
                className="flex items-center px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#5a67d8' }}
              >
                {actionLoading ? <Spinner size="sm" className="mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Отправить
              </button>
            )}

            {invoice.status === 'sent' && (
              <button
                onClick={markAsPaid}
                disabled={actionLoading}
                className="flex items-center px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#f6ad55' }}
              >
                {actionLoading ? <Spinner size="sm" className="mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Отметить как оплаченный
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Invoice Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Montserrat' }}>
                Информация о клиенте
              </h3>
              <div className="space-y-2">
                <p className="font-medium text-gray-900">{invoice.client_name}</p>
                <p className="text-gray-600">{invoice.client_email}</p>
                {invoice.client_address && (
                  <p className="text-gray-600 whitespace-pre-line">{invoice.client_address}</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Montserrat' }}>
                Детали счета
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Дата создания:</span>
                  <span className="text-gray-900">{formatDate(invoice.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Срок оплаты:</span>
                  <span className="text-gray-900">{formatDate(invoice.due_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Статус:</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                    {getStatusText(invoice.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Montserrat' }}>
              Позиции счета
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Описание
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Кол-во
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Цена
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Сумма
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(item.rate)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="mt-6 flex justify-end">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xl font-bold text-gray-900">
                  Итого: {formatCurrency(invoice.amount)}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Montserrat' }}>
                Примечания
              </h3>
              <p className="text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}