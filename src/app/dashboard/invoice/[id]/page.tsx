'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useParams, useRouter } from 'next/navigation';
import { Spinner } from '@/components/LoadingStates';
import { ArrowLeft, Send, Download, Edit, Trash2 } from 'lucide-react';
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
  issue_date: string;
  due_date: string;
  items: InvoiceItem[];
  notes: string;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  amount: number;
  status: 'draft' | 'sent' | 'paid';
  created_at: string;
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
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async () => {
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
          subject: `Invoice ${invoice.invoice_number}`,
          body: `Dear ${invoice.client_name},\n\nPlease find attached your invoice ${invoice.invoice_number} for the amount of ${invoice.amount.toLocaleString('ru-RU')} ₽.\n\nDue date: ${new Date(invoice.due_date).toLocaleDateString('ru-RU')}\n\nThank you for your business!`
        })
      });

      setInvoice(prev => prev ? { ...prev, status: 'sent' } : null);
      alert('Invoice sent successfully!');
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Error sending invoice. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!invoice) return;

    const sections = [
      {
        heading: 'Invoice Details',
        content: `Invoice Number: ${invoice.invoice_number}\nIssue Date: ${new Date(invoice.issue_date).toLocaleDateString('ru-RU')}\nDue Date: ${new Date(invoice.due_date).toLocaleDateString('ru-RU')}`
      },
      {
        heading: 'Bill To',
        content: `${invoice.client_name}\n${invoice.client_email}\n${invoice.client_address}`
      },
      {
        heading: 'Items',
        table: {
          headers: ['Description', 'Qty', 'Rate', 'Amount'],
          rows: invoice.items.map(item => [
            item.description,
            item.quantity.toString(),
            `${item.rate.toLocaleString('ru-RU')} ₽`,
            `${item.amount.toLocaleString('ru-RU')} ₽`
          ]),
          alignRight: [2, 3]
        }
      }
    ];

    if (invoice.notes) {
      sections.push({
        heading: 'Notes',
        content: invoice.notes
      });
    }

    generatePDF({
      title: `Invoice ${invoice.invoice_number}`,
      sections,
      subtitle: `Total: ${invoice.amount.toLocaleString('ru-RU')} ₽`,
      brandColor: '#5a67d8'
    }, `invoice-${invoice.invoice_number}.pdf`);
  };

  const handleDelete = async () => {
    if (!invoice || !confirm('Are you sure you want to delete this invoice?')) return;

    setActionLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id);

      if (error) throw error;
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Error deleting invoice. Please try again.');
    } finally {
      setActionLoading(false);
    }
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
          <p className="text-gray-400 mb-4">Invoice not found</p>
          <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white font-['Montserrat']">
                Счет {invoice.invoice_number}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                  {getStatusText(invoice.status)}
                </span>
                <span className="text-gray-400">
                  Создан {new Date(invoice.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            
            {invoice.status === 'draft' && (
              <>
                <Link
                  href={`/dashboard/invoice/${invoice.id}/edit`}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Редактировать
                </Link>
                <button
                  onClick={handleSendInvoice}
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
                  Отправить
                </button>
              </>
            )}
            
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Удалить
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="bg-white text-gray-900 rounded-lg p-8 shadow-lg">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-['Montserrat']">
                СЧЕТ
              </h2>
              <p className="text-gray-600 mt-1">#{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Дата выставления</p>
              <p className="font-semibold">{new Date(invoice.issue_date).toLocaleDateString('ru-RU')}</p>
              <p className="text-sm text-gray-600 mt-2">Срок оплаты</p>
              <p className="font-semibold">{new Date(invoice.due_date).toLocaleDateString('ru-RU')}</p>
            </div>
          </div>

          {/* Client Info */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Плательщик:</h3>
            <div className="text-gray-700">
              <p className="font-semibold">{invoice.client_name}</p>
              <p>{invoice.client_email}</p>
              {invoice.client_address && (
                <p className="whitespace-pre-line">{invoice.client_address}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 font-semibold text-gray-900">Описание</th>
                  <th className="text-right py-3 font-semibold text-gray-900">Кол-во</th>
                  <th className="text-right py-3 font-semibold text-gray-900">Цена</th>
                  <th className="text-right py-3 font-semibold text-gray-900">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-3 text-gray-700">{item.description}</td>
                    <td className="py-3 text-right text-gray-700">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-700">{item.rate.toLocaleString('ru-RU')} ₽</td>
                    <td className="py-3 text-right text-gray-700">{item.amount.toLocaleString('ru-RU')} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span className="text-gray-700">Подытог:</span>
                <span className="text-gray-900">{invoice.subtotal.toLocaleString('ru-RU')} ₽</span>
              </div>
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-700">Налог ({invoice.tax_rate}%):</span>
                  <span className="text-gray-900">{invoice.tax_amount.toLocaleString('ru-RU')} ₽</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-gray-300 font-bold text-lg">
                <span className="text-gray-900">Итого:</span>
                <span className="text-gray-900">{invoice.amount.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Примечания:</h3>
              <p className="text-gray-700 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}