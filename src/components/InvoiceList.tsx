'use client';

import { useState, useEffect } from 'react';
import { FileText, Eye, Send, Download, Edit, Trash2, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { generatePDF } from '@/lib/pdf-generator';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_address: string;
  client_phone?: string;
  items: Array<{
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

interface InvoiceListProps {
  onCreateNew?: () => void;
}

export default function InvoiceList({ onCreateNew }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setInvoices(invoices.filter(inv => inv.id !== id));
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice');
    }
  };

  const sendInvoice = async (invoice: Invoice) => {
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: invoice.client_email,
          subject: `Invoice ${invoice.invoice_number}`,
          body: `Dear ${invoice.client_name},\n\nPlease find attached your invoice ${invoice.invoice_number} for $${invoice.total.toFixed(2)}.\n\nDue date: ${invoice.due_date}\n\nThank you for your business!`
        })
      });

      // Update status to sent
      const supabase = createClient();
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id);

      setInvoices(invoices.map(inv => 
        inv.id === invoice.id ? { ...inv, status: 'sent' as const } : inv
      ));

      alert('Invoice sent successfully!');
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Failed to send invoice');
    }
  };

  const downloadInvoice = (invoice: Invoice) => {
    const pdfSections = [
      {
        heading: 'Bill To:',
        content: `${invoice.client_name}\n${invoice.client_email}\n${invoice.client_address}${invoice.client_phone ? '\n' + invoice.client_phone : ''}`
      },
      {
        heading: 'Invoice Details',
        table: {
          headers: ['Description', 'Qty', 'Rate', 'Amount'],
          rows: invoice.items.map(item => [
            item.description,
            item.quantity.toString(),
            `$${item.rate.toFixed(2)}`,
            `$${item.amount.toFixed(2)}`
          ]),
          alignRight: [2, 3]
        }
      },
      {
        content: `Subtotal: $${invoice.subtotal.toFixed(2)}\nTax: $${invoice.tax.toFixed(2)}\nTotal: $${invoice.total.toFixed(2)}`
      }
    ];

    if (invoice.notes) {
      pdfSections.push({
        heading: 'Notes',
        content: invoice.notes
      });
    }

    generatePDF({
      title: `Invoice ${invoice.invoice_number}`,
      subtitle: `Date: ${new Date(invoice.created_at).toLocaleDateString()} | Due: ${invoice.due_date}`,
      sections: pdfSections,
      brandColor: '#5a67d8'
    }, `invoice-${invoice.invoice_number}.pdf`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-600 text-gray-200';
      case 'sent': return 'bg-blue-600 text-blue-100';
      case 'paid': return 'bg-green-600 text-green-100';
      case 'overdue': return 'bg-red-600 text-red-100';
      default: return 'bg-gray-600 text-gray-200';
    }
  };

  const filteredInvoices = filter === 'all' 
    ? invoices 
    : invoices.filter(inv => inv.status === filter);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-100">Invoices</h2>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-1 text-xs">
                ({invoices.filter(inv => inv.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            {filter === 'all' ? 'No invoices yet' : `No ${filter} invoices`}
          </h3>
          <p className="text-gray-500 mb-4">
            {filter === 'all' 
              ? 'Create your first invoice to get started'
              : `You don't have any ${filter} invoices`
            }
          </p>
          {filter === 'all' && (
            <button
              onClick={onCreateNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Your First Invoice
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-100">
                      {invoice.invoice_number}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {invoice.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-300">
                    <div>
                      <span className="font-medium">Client:</span> {invoice.client_name}
                    </div>
                    <div>
                      <span className="font-medium">Amount:</span> 
                      <span className="text-orange-400 font-semibold ml-1">
                        ${invoice.total.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Due:</span> {invoice.due_date}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {new Date(invoice.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadInvoice(invoice)}
                    className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  
                  {invoice.status === 'draft' && (
                    <button
                      onClick={() => sendInvoice(invoice)}
                      className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                      title="Send Invoice"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => deleteInvoice(invoice.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete Invoice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Invoice Items Preview */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Items:</div>
                <div className="space-y-1">
                  {invoice.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between text-sm text-gray-300">
                      <span>{item.description}</span>
                      <span>{item.quantity} × ${item.rate.toFixed(2)} = ${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  {invoice.items.length > 3 && (
                    <div className="text-sm text-gray-500">
                      +{invoice.items.length - 3} more items
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}