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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: invoice.client_email,
          subject: `Invoice ${invoice.invoice_number}`,
          body: `Dear ${invoice.client_name},\n\nPlease find your invoice ${invoice.invoice_number} attached.\n\nTotal Amount: ${formatCurrency(invoice.amount)}\nDue Date: ${formatDate(invoice.due_date)}\n\nThank you for your business!`
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

    const tableRows = invoice.items.map(item => [
      item.description,
      item.quantity.toString(),
      formatCurrency(item.rate),
      formatCurrency(item.amount)
    ]);

    generatePDF({
      title: `Invoice ${invoice.invoice_number}`,
      subtitle: `Client: ${invoice.client_name}`,
      sections: [
        {
          heading: 'Invoice Details',
          content: `Invoice Number: ${invoice.invoice_number}\nDate: ${formatDate(invoice.created_at)}\nDue Date: ${formatDate(invoice.due_date)}\n\nBill To:\n${invoice.client_name}\n${invoice.client_email}\n${invoice.client_address}`
        },
        {
          heading: 'Items',
          table: {
            headers: ['Description', 'Qty', 'Rate', 'Amount'],
            rows: tableRows,
            alignRight: [2, 3]
          }
        },
        {
          content: `Total Amount: ${formatCurrency(invoice.amount)}\n\n${invoice.notes ? `Notes: ${invoice.notes}` : ''}`
        }
      ]
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
      <div className="flex justify-center items-center min-h-96">
        <Spinner />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white mb-2">Invoice not found</h2>
        <Link href="/dashboard" className="text-[#5a67d8] hover:text-[#4c51bf]">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                {getStatusText(invoice.status)}
              </span>
              <span className="text-gray-400">
                Создан {formatDate(invoice.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="p-2 text-gray-400 hover:text-white border border-gray-600 rounded-lg transition-colors"
            title="Download PDF"
          >
            <Download className="w-5 h-5" />
          </button>
          
          {invoice.status === 'draft' && (
            <>
              <button
                onClick={handleSendInvoice}
                disabled={actionLoading}
                className="px-4 py-2 bg-[#5a67d8] hover:bg-[#4c51bf] text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {actionLoading ? <Spinner /> : <Send className="w-4 h-4" />}
                Отправить
              </button>
              <Link
                href={`/dashboard/invoices/${invoice.id}/edit`}
                className="p-2 text-gray-400 hover:text-white border border-gray-600 rounded-lg transition-colors"
              >
                <Edit className="w-5 h-5" />
              </Link>
            </>
          )}
          
          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="p-2 text-red-400 hover:text-red-300 border border-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-[#2d3748] rounded-lg border border-gray-700 p-8">
        {/* Client Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Счет для:</h3>
            <div className="text-gray-300 space-y-1">
              <p className="font-medium">{invoice.client_name}</p>
              <p>{invoice.client_email}</p>
              {invoice.client_address && (
                <p className="whitespace-pre-line">{invoice.client_address}</p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="space-y-2 text-gray-300">
              <div>
                <span className="text-gray-400">Номер счета: </span>
                <span className="font-medium">{invoice.invoice_number}</span>
              </div>
              <div>
                <span className="text-gray-400">Дата создания: </span>
                <span>{formatDate(invoice.created_at)}</span>
              </div>
              <div>
                <span className="text-gray-400">Срок оплаты: </span>
                <span>{formatDate(invoice.due_date)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Позиции:</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 text-gray-400 font-medium">Описание</th>
                  <th className="text-right py-3 text-gray-400 font-medium">Кол-во</th>
                  <th className="text-right py-3 text-gray-400 font-medium">Цена</th>
                  <th className="text-right py-3 text-gray-400 font-medium">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-700">
                    <td className="py-3 text-gray-300">{item.description}</td>
                    <td className="py-3 text-right text-gray-300">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-300">{formatCurrency(item.rate)}</td>
                    <td className="py-3 text-right text-gray-300">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-end mb-8">
          <div className="text-right">
            <div className="text-gray-400 mb-2">Общая сумма:</div>
            <div className="text-3xl font-bold text-white">
              {formatCurrency(invoice.amount)}
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Примечания:</h3>
            <p className="text-gray-300 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}