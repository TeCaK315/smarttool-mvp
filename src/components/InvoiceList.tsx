'use client';

import { useState, useEffect } from 'react';
import { FileText, Eye, Send, Download, Trash2, Edit, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Spinner } from '@/components/LoadingStates';
import { createClient } from '@/lib/supabase/client';
import { generatePDF } from '@/lib/pdf-generator';

interface Invoice {
  id: string;
  invoice_number: string;
  client_data: {
    name: string;
    email: string;
    company: string;
    address: string;
  };
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
  notes: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  created_at: string;
}

interface InvoiceListProps {
  refreshTrigger?: number;
}

export default function InvoiceList({ refreshTrigger }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<string | null>(null);

  const loadInvoices = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Ошибка загрузки счетов:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [refreshTrigger]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'sent':
        return <Send className="w-4 h-4 text-blue-400" />;
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'overdue':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Черновик';
      case 'sent':
        return 'Отправлен';
      case 'paid':
        return 'Оплачен';
      case 'overdue':
        return 'Просрочен';
      default:
        return 'Неизвестно';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-600 text-gray-300';
      case 'sent':
        return 'bg-blue-600 text-blue-100';
      case 'paid':
        return 'bg-green-600 text-green-100';
      case 'overdue':
        return 'bg-red-600 text-red-100';
      default:
        return 'bg-gray-600 text-gray-300';
    }
  };

  const downloadInvoicePDF = (invoice: Invoice) => {
    generatePDF({
      title: `Счет ${invoice.invoice_number}`,
      subtitle: `Дата: ${new Date(invoice.created_at).toLocaleDateString('ru-RU')}`,
      sections: [
        {
          heading: 'Информация о клиенте',
          content: `${invoice.client_data.name}\n${invoice.client_data.company}\n${invoice.client_data.address}`
        },
        {
          heading: 'Позиции',
          table: {
            headers: ['Описание', 'Кол-во', 'Цена', 'Сумма'],
            rows: invoice.items.map(item => [
              item.description,
              item.quantity.toString(),
              `${item.rate.toFixed(2)} ₽`,
              `${item.amount.toFixed(2)} ₽`
            ]),
            alignRight: [2, 3]
          }
        },
        {
          content: `Подытог: ${invoice.subtotal.toFixed(2)} ₽\nНалог: ${invoice.tax.toFixed(2)} ₽\nИтого: ${invoice.total.toFixed(2)} ₽`
        }
      ],
      brandColor: '#5a67d8'
    }, `invoice-${invoice.invoice_number}.pdf`);
  };

  const sendInvoice = async (invoice: Invoice) => {
    if (!invoice.client_data.email) {
      alert('У клиента не указан email');
      return;
    }

    setIsSending(invoice.id);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: invoice.client_data.email,
          subject: `Счет ${invoice.invoice_number}`,
          body: `Здравствуйте, ${invoice.client_data.name}!\n\nВо вложении счет ${invoice.invoice_number} на сумму ${invoice.total.toFixed(2)} ₽.\n\nСрок оплаты: ${new Date(invoice.due_date).toLocaleDateString('ru-RU')}\n\nС уважением`
        })
      });

      if (!response.ok) throw new Error('Ошибка отправки');

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
      setIsSending(null);
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот счет?')) return;

    setIsDeleting(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      alert('Счет удален');
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка при удалении счета');
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">Нет счетов</h3>
        <p className="text-gray-400">Создайте свой первый счет, чтобы начать работу</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-gray-100">Мои счета</h2>
        <span className="bg-blue-600 text-blue-100 px-2 py-1 rounded-full text-sm">
          {invoices.length}
        </span>
      </div>

      <div className="grid gap-4">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-100">
                    {invoice.invoice_number}
                  </h3>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(invoice.status)}`}>
                    {getStatusIcon(invoice.status)}
                    {getStatusText(invoice.status)}
                  </div>
                </div>
                <div className="text-sm text-gray-400 space-y-1">
                  <p><span className="font-medium">Клиент:</span> {invoice.client_data.name}</p>
                  <p><span className="font-medium">Компания:</span> {invoice.client_data.company}</p>
                  <p><span className="font-medium">Сумма:</span> <span className="text-blue-400 font-semibold">{invoice.total.toFixed(2)} ₽</span></p>
                  <p><span className="font-medium">Срок оплаты:</span> {new Date(invoice.due_date).toLocaleDateString('ru-RU')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedInvoice(selectedInvoice?.id === invoice.id ? null : invoice)}
                  className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                  title="Просмотр"
                >
                  <Eye className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => downloadInvoicePDF(invoice)}
                  className="p-2 text-gray-400 hover:text-orange-400 transition-colors"
                  title="Скачать PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => sendInvoice(invoice)}
                  disabled={isSending === invoice.id || !invoice.client_data.email}
                  className="p-2 text-gray-400 hover:text-green-400 transition-colors disabled:opacity-50"
                  title="Отправить клиенту"
                >
                  {isSending === invoice.id ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
                </button>
                
                <button
                  onClick={() => deleteInvoice(invoice.id)}
                  disabled={isDeleting === invoice.id}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                  title="Удалить"
                >
                  {isDeleting === invoice.id ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Детальный вид */}
            {selectedInvoice?.id === invoice.id && (
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-200 mb-2">Информация о клиенте</h4>
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>{invoice.client_data.name}</p>
                      <p>{invoice.client_data.email}</p>
                      <p>{invoice.client_data.company}</p>
                      <p>{invoice.client_data.address}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-200 mb-2">Позиции</h4>
                    <div className="space-y-2">
                      {invoice.items.map((item, index) => (
                        <div key={index} className="text-sm text-gray-400 flex justify-between">
                          <span>{item.description} ({item.quantity} × {item.rate.toFixed(2)} ₽)</span>
                          <span>{item.amount.toFixed(2)} ₽</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-600 pt-2 mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Подытог:</span>
                          <span className="text-gray-300">{invoice.subtotal.toFixed(2)} ₽</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Налог:</span>
                          <span className="text-gray-300">{invoice.tax.toFixed(2)} ₽</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-200">Итого:</span>
                          <span className="text-blue-400">{invoice.total.toFixed(2)} ₽</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {invoice.notes && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-200 mb-2">Примечания</h4>
                    <p className="text-sm text-gray-400">{invoice.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}