'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, Clock, CheckCircle, AlertCircle, TrendingUp, Users, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/LoadingStates';

interface Invoice {
  id: string;
  invoice_number: string;
  client_data: {
    name: string;
    email: string;
  };
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  due_date: string;
  created_at: string;
}

interface DashboardStats {
  totalInvoices: number;
  totalRevenue: number;
  pendingAmount: number;
  overdueCount: number;
}

export default function InvoiceDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    overdueCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const supabase = createClient();
      
      // Загружаем последние счета
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (invoicesError) throw invoicesError;

      // Загружаем статистику
      const { data: allInvoices, error: statsError } = await supabase
        .from('invoices')
        .select('total, status, due_date');

      if (statsError) throw statsError;

      const now = new Date();
      const calculatedStats = allInvoices.reduce((acc, invoice) => {
        acc.totalInvoices++;
        
        if (invoice.status === 'paid') {
          acc.totalRevenue += invoice.total;
        } else {
          acc.pendingAmount += invoice.total;
          
          if (new Date(invoice.due_date) < now && invoice.status !== 'paid') {
            acc.overdueCount++;
          }
        }
        
        return acc;
      }, {
        totalInvoices: 0,
        totalRevenue: 0,
        pendingAmount: 0,
        overdueCount: 0
      });

      setInvoices(invoicesData || []);
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'sent':
        return <AlertCircle className="w-4 h-4 text-blue-400" />;
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
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
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-900 text-yellow-300';
      case 'sent':
        return 'bg-blue-900 text-blue-300';
      case 'paid':
        return 'bg-green-900 text-green-300';
      case 'overdue':
        return 'bg-red-900 text-red-300';
      default:
        return 'bg-gray-900 text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Панель управления</h1>
          <p className="text-gray-300 mt-2">Управление счетами и отслеживание платежей</p>
        </div>
        <Link
          href="/dashboard/create"
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Создать счет
        </Link>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Всего счетов</p>
              <p className="text-2xl font-bold text-white">{stats.totalInvoices}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Общая выручка</p>
              <p className="text-2xl font-bold text-white">₽{stats.totalRevenue.toLocaleString()}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">К получению</p>
              <p className="text-2xl font-bold text-white">₽{stats.pendingAmount.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Просрочено</p>
              <p className="text-2xl font-bold text-white">{stats.overdueCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Быстрые действия</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/create"
            className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Plus className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-white font-medium">Новый счет</p>
              <p className="text-gray-400 text-sm">Создать и отправить счет</p>
            </div>
          </Link>

          <Link
            href="/dashboard/history"
            className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <FileText className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-white font-medium">История счетов</p>
              <p className="text-gray-400 text-sm">Просмотр всех счетов</p>
            </div>
          </Link>

          <Link
            href="/dashboard/analysis"
            className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <TrendingUp className="w-6 h-6 text-orange-400" />
            <div>
              <p className="text-white font-medium">Аналитика</p>
              <p className="text-gray-400 text-sm">Отчеты и статистика</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Последние счета */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Последние счета</h2>
          <Link
            href="/dashboard/history"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Показать все
          </Link>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">У вас пока нет счетов</p>
            <Link
              href="/dashboard/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Создать первый счет
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Номер</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Клиент</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Сумма</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Статус</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Срок оплаты</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="py-3 px-4 text-white font-medium">
                      {invoice.invoice_number}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white">{invoice.client_data.name}</p>
                        <p className="text-gray-400 text-sm">{invoice.client_data.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white font-medium">
                      ₽{invoice.total.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {getStatusIcon(invoice.status)}
                        {getStatusText(invoice.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {new Date(invoice.due_date).toLocaleDateString('ru-RU')}
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