'use client';

import { useState } from 'react';
import { Plus, Trash2, Send, Save, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { generatePDF } from '@/lib/pdf-generator';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface ClientData {
  name: string;
  email: string;
  address: string;
  phone?: string;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  client: ClientData;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

interface InvoiceFormProps {
  onInvoiceCreated?: (invoice: InvoiceData) => void;
}

export default function InvoiceForm({ onInvoiceCreated }: InvoiceFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [client, setClient] = useState<ClientData>({
    name: '',
    email: '',
    address: '',
    phone: ''
  });
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }
  ]);
  
  const [invoiceDetails, setInvoiceDetails] = useState({
    invoiceNumber: `INV-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tax: 0,
    notes: ''
  });

  const addItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.amount = updated.quantity * updated.rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (invoiceDetails.tax / 100);
  const total = subtotal + taxAmount;

  const saveInvoice = async (shouldSend = false) => {
    if (!client.name || !client.email || items.some(item => !item.description)) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Please log in to create invoices');
        return;
      }

      const invoiceData: InvoiceData = {
        invoiceNumber: invoiceDetails.invoiceNumber,
        date: invoiceDetails.date,
        dueDate: invoiceDetails.dueDate,
        client,
        items,
        subtotal,
        tax: taxAmount,
        total,
        notes: invoiceDetails.notes
      };

      // Save to database
      const { error } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          invoice_number: invoiceData.invoiceNumber,
          client_name: client.name,
          client_email: client.email,
          client_address: client.address,
          client_phone: client.phone,
          items: items,
          subtotal: subtotal,
          tax: taxAmount,
          total: total,
          due_date: invoiceDetails.dueDate,
          notes: invoiceDetails.notes,
          status: shouldSend ? 'sent' : 'draft'
        });

      if (error) throw error;

      // Generate PDF
      const pdfSections = [
        {
          heading: 'Bill To:',
          content: `${client.name}\n${client.email}\n${client.address}${client.phone ? '\n' + client.phone : ''}`
        },
        {
          heading: 'Invoice Details',
          table: {
            headers: ['Description', 'Qty', 'Rate', 'Amount'],
            rows: items.map(item => [
              item.description,
              item.quantity.toString(),
              `$${item.rate.toFixed(2)}`,
              `$${item.amount.toFixed(2)}`
            ]),
            alignRight: [2, 3]
          }
        },
        {
          content: `Subtotal: $${subtotal.toFixed(2)}\nTax: $${taxAmount.toFixed(2)}\nTotal: $${total.toFixed(2)}`
        }
      ];

      if (invoiceDetails.notes) {
        pdfSections.push({
          heading: 'Notes',
          content: invoiceDetails.notes
        });
      }

      generatePDF({
        title: `Invoice ${invoiceDetails.invoiceNumber}`,
        subtitle: `Date: ${invoiceDetails.date} | Due: ${invoiceDetails.dueDate}`,
        sections: pdfSections,
        brandColor: '#5a67d8'
      }, `invoice-${invoiceDetails.invoiceNumber}.pdf`);

      // Send email if requested
      if (shouldSend) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: client.email,
            subject: `Invoice ${invoiceDetails.invoiceNumber}`,
            body: `Dear ${client.name},\n\nPlease find attached your invoice ${invoiceDetails.invoiceNumber} for $${total.toFixed(2)}.\n\nDue date: ${invoiceDetails.dueDate}\n\nThank you for your business!`
          })
        });
      }

      onInvoiceCreated?.(invoiceData);
      
      // Reset form
      setClient({ name: '', email: '', address: '', phone: '' });
      setItems([{ id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }]);
      setInvoiceDetails({
        ...invoiceDetails,
        invoiceNumber: `INV-${Date.now()}`,
        notes: ''
      });

      alert(shouldSend ? 'Invoice created and sent successfully!' : 'Invoice saved successfully!');
      
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Failed to save invoice. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-gray-100">Create Invoice</h2>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Invoice Number
          </label>
          <input
            type="text"
            value={invoiceDetails.invoiceNumber}
            onChange={(e) => setInvoiceDetails({...invoiceDetails, invoiceNumber: e.target.value})}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Date
          </label>
          <input
            type="date"
            value={invoiceDetails.date}
            onChange={(e) => setInvoiceDetails({...invoiceDetails, date: e.target.value})}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Due Date
          </label>
          <input
            type="date"
            value={invoiceDetails.dueDate}
            onChange={(e) => setInvoiceDetails({...invoiceDetails, dueDate: e.target.value})}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Client Information */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Client Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Client Name *
            </label>
            <input
              type="text"
              value={client.name}
              onChange={(e) => setClient({...client, name: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={client.email}
              onChange={(e) => setClient({...client, email: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Address
            </label>
            <textarea
              value={client.address}
              onChange={(e) => setClient({...client, address: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={client.phone}
              onChange={(e) => setClient({...client, phone: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Invoice Items */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-100">Invoice Items</h3>
          <button
            onClick={addItem}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-gray-700 rounded-md">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Description *"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Rate"
                  value={item.rate}
                  onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-100 font-medium">
                  ${item.amount.toFixed(2)}
                </span>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="mb-6">
        <div className="flex justify-end">
          <div className="w-full md:w-1/3 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">Subtotal:</span>
              <span className="text-gray-100 font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-gray-300">Tax:</span>
                <input
                  type="number"
                  value={invoiceDetails.tax}
                  onChange={(e) => setInvoiceDetails({...invoiceDetails, tax: parseFloat(e.target.value) || 0})}
                  className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100 text-sm"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <span className="text-gray-300">%</span>
              </div>
              <span className="text-gray-100 font-medium">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-600 pt-2">
              <span className="text-gray-100">Total:</span>
              <span className="text-orange-400">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Notes
        </label>
        <textarea
          value={invoiceDetails.notes}
          onChange={(e) => setInvoiceDetails({...invoiceDetails, notes: e.target.value})}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Additional notes or payment terms..."
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <button
          onClick={() => saveInvoice(false)}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          Save Draft
        </button>
        <button
          onClick={() => saveInvoice(true)}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          Create & Send
        </button>
      </div>
    </div>
  );
}