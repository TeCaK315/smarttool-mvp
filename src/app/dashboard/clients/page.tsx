'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Search, Edit3, Trash2, User, Mail, MapPin,
  Phone, FileText, DollarSign, ChevronRight, X, Save, Loader2,
} from 'lucide-react';

export interface Client {
  id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  company: string;
  notes: string;
  created_at: string;
}

const CLIENTS_KEY = 'SmartTool MVP_clients';
const HISTORY_KEY = 'SmartTool MVP_history';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState<Omit<Client, 'id' | 'created_at'>>({
    name: '', email: '', address: '', phone: '', company: '', notes: '',
  });

  // Load clients
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CLIENTS_KEY);
      if (stored) setClients(JSON.parse(stored));
    } catch {}
  }, []);

  const saveClients = (updated: Client[]) => {
    setClients(updated);
    try { localStorage.setItem(CLIENTS_KEY, JSON.stringify(updated)); } catch {}
  };

  // Get invoice history for a client
  const getClientInvoices = (clientName: string) => {
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return history.filter((h: any) =>
        h.input === clientName ||
        h.data?.recipient?.name === clientName ||
        h.data?.recipient?.email === clientName
      );
    } catch { return []; }
  };

  // Client stats
  const getClientStats = (clientName: string) => {
    const invoices = getClientInvoices(clientName);
    const total = invoices.reduce((sum: number, inv: any) => sum + (inv.data?.total || 0), 0);
    const paid = invoices.filter((inv: any) => inv.payment_status === 'paid' || inv.data?.payment_status === 'paid')
      .reduce((sum: number, inv: any) => sum + (inv.data?.total || 0), 0);
    const outstanding = total - paid;
    return { invoiceCount: invoices.length, total, paid, outstanding, invoices };
  };

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const handleSave = () => {
    if (!form.name.trim()) return;

    if (editingId) {
      const updated = clients.map(c =>
        c.id === editingId ? { ...c, ...form } : c
      );
      saveClients(updated);
    } else {
      const newClient: Client = {
        ...form,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      saveClients([newClient, ...clients]);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    saveClients(clients.filter(c => c.id !== id));
    if (selectedClient?.id === id) setSelectedClient(null);
  };

  const startEdit = (client: Client) => {
    setForm({
      name: client.name, email: client.email, address: client.address,
      phone: client.phone, company: client.company, notes: client.notes,
    });
    setEditingId(client.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ name: '', email: '', address: '', phone: '', company: '', notes: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const createInvoiceForClient = (client: Client) => {
    // Pre-fill recipient data via URL params
    const params = new URLSearchParams();
    params.set('client_id', client.id);
    params.set('client_name', client.name);
    params.set('client_email', client.email);
    params.set('client_address', client.address);
    router.push('/dashboard/create?' + params.toString());
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const inputClasses = "w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all";
  const inputStyle = { background: '#1a202c', borderColor: '#5a67d815', color: '#edf2f7' };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl transition-all hover:bg-white/[0.06]">
            <ArrowLeft className="w-5 h-5" style={{ color: '#edf2f750' }} />
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "'Montserrat', sans-serif", color: '#edf2f7' }}>
              Clients
            </h1>
            <p className="text-xs mt-0.5" style={{ color: '#edf2f740' }}>
              {clients.length} contact{clients.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #5a67d8, #4a5568)' }}
        >
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#edf2f740' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients by name, email, or company..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all"
          style={{ background: '#1a202c', borderColor: '#5a67d815', color: '#edf2f7' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="lg:col-span-2 space-y-2">
          {/* Add/Edit Form */}
          {showForm && (
            <div className="rounded-2xl p-5 mb-4" style={{ background: '#ffffff12', boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)', border: '1px solid #5a67d810' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: '#edf2f7' }}>
                  {editingId ? 'Edit Client' : 'New Client'}
                </h2>
                <button onClick={resetForm} className="p-1 rounded-lg hover:bg-white/[0.06]">
                  <X className="w-4 h-4" style={{ color: '#edf2f750' }} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#edf2f750' }}>Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="John Doe" className={inputClasses} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#edf2f750' }}>Company</label>
                  <input type="text" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                    placeholder="Acme Corp" className={inputClasses} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#edf2f750' }}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="john@acme.com" className={inputClasses} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#edf2f750' }}>Phone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567" className={inputClasses} style={inputStyle} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: '#edf2f750' }}>Address</label>
                  <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="123 Main St, City, State, ZIP" className={inputClasses} style={inputStyle} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: '#edf2f750' }}>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Payment preferences, special terms..." rows={2}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 resize-none transition-all"
                    style={inputStyle} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSave} disabled={!form.name.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #5a67d8, #4a5568)' }}>
                  <Save className="w-4 h-4" /> {editingId ? 'Update' : 'Save'}
                </button>
                <button onClick={resetForm}
                  className="px-4 py-2 rounded-xl text-sm font-medium border"
                  style={{ borderColor: '#5a67d815', color: '#edf2f750' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* List */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center" style={{ borderColor: '#5a67d820' }}>
              <User className="w-12 h-12 mx-auto mb-3" style={{ color: '#edf2f740' }} />
              <p className="text-sm font-medium mb-1" style={{ color: '#edf2f7' }}>
                {search ? 'No clients found' : 'No clients yet'}
              </p>
              <p className="text-xs mb-4" style={{ color: '#edf2f750' }}>
                {search ? 'Try a different search term' : 'Add your first client to get started'}
              </p>
              {!search && (
                <button onClick={() => { resetForm(); setShowForm(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                  style={{ background: '#5a67d8' }}>
                  <Plus className="w-4 h-4" /> Add Client
                </button>
              )}
            </div>
          ) : (
            filtered.map(client => {
              const stats = getClientStats(client.name);
              const isSelected = selectedClient?.id === client.id;
              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className="rounded-xl border p-4 cursor-pointer transition-all duration-150 group"
                  style={{
                    background: isSelected ? '#5a67d808' : '#ffffff08',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)',
                    border: isSelected ? '1px solid #5a67d830' : '1px solid #5a67d808',
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #5a67d8, #4a5568)' }}>
                      {client.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate" style={{ color: '#edf2f7' }}>{client.name}</p>
                        {client.company && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#5a67d810', color: '#5a67d8' }}>
                            {client.company}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {client.email && (
                          <span className="text-xs flex items-center gap-1 truncate" style={{ color: '#edf2f750' }}>
                            <Mail className="w-3 h-3" />{client.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-semibold" style={{ color: '#edf2f7' }}>
                        {stats.invoiceCount > 0 ? formatCurrency(stats.total) : '-'}
                      </p>
                      <p className="text-[11px]" style={{ color: '#edf2f750' }}>
                        {stats.invoiceCount} invoice{stats.invoiceCount !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); createInvoiceForClient(client); }}
                        className="p-2 rounded-lg hover:bg-white/[0.06]" title="New invoice">
                        <FileText className="w-4 h-4" style={{ color: '#5a67d8' }} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); startEdit(client); }}
                        className="p-2 rounded-lg hover:bg-white/[0.06]" title="Edit">
                        <Edit3 className="w-4 h-4" style={{ color: '#edf2f750' }} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                        className="p-2 rounded-lg hover:bg-red-500/10" title="Delete">
                        <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                      </button>
                    </div>

                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#edf2f740' }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Client Detail Panel */}
        <div className="lg:col-span-1">
          {selectedClient ? (
            <div className="sticky top-20 rounded-2xl p-5 space-y-5" style={{ background: '#ffffff12', boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)', border: '1px solid #5a67d810' }}>
              {/* Client header */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-lg font-bold text-white mb-3"
                  style={{ background: 'linear-gradient(135deg, #5a67d8, #4a5568)' }}>
                  {selectedClient.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <h3 className="text-base font-semibold" style={{ color: '#edf2f7' }}>{selectedClient.name}</h3>
                {selectedClient.company && (
                  <p className="text-xs mt-0.5" style={{ color: '#edf2f750' }}>{selectedClient.company}</p>
                )}
              </div>

              {/* Contact info */}
              <div className="space-y-2">
                {selectedClient.email && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#edf2f770' }}>
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#5a67d8' }} />
                    <span className="truncate">{selectedClient.email}</span>
                  </div>
                )}
                {selectedClient.phone && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#edf2f770' }}>
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#5a67d8' }} />
                    {selectedClient.phone}
                  </div>
                )}
                {selectedClient.address && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#edf2f770' }}>
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#5a67d8' }} />
                    <span className="truncate">{selectedClient.address}</span>
                  </div>
                )}
              </div>

              {/* Financial summary */}
              {(() => {
                const stats = getClientStats(selectedClient.name);
                return (
                  <div className="space-y-2 pt-3" style={{ borderTop: '1px solid #5a67d810' }}>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: '#edf2f750' }}>Total billed</span>
                      <span className="font-semibold" style={{ color: '#edf2f7' }}>{formatCurrency(stats.total)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: '#edf2f750' }}>Paid</span>
                      <span className="font-semibold" style={{ color: '#22c55e' }}>{formatCurrency(stats.paid)}</span>
                    </div>
                    {stats.outstanding > 0 && (
                      <div className="flex justify-between text-xs">
                        <span style={{ color: '#edf2f750' }}>Outstanding</span>
                        <span className="font-semibold" style={{ color: '#f59e0b' }}>{formatCurrency(stats.outstanding)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Recent invoices */}
              {(() => {
                const stats = getClientStats(selectedClient.name);
                if (stats.invoices.length === 0) return null;
                return (
                  <div className="pt-3" style={{ borderTop: '1px solid #5a67d810' }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#edf2f740' }}>
                      Recent Invoices
                    </p>
                    <div className="space-y-1.5">
                      {stats.invoices.slice(0, 5).map((inv: any) => (
                        <Link key={inv.id} href={'/dashboard/analysis?id=' + inv.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                          <div>
                            <p className="text-xs font-mono font-medium" style={{ color: '#edf2f7' }}>
                              {inv.doc_number || inv.id?.substring(0, 8)}
                            </p>
                            <p className="text-[10px]" style={{ color: '#edf2f740' }}>
                              {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          <span className="text-xs font-semibold" style={{ color: '#edf2f7' }}>
                            {formatCurrency(inv.data?.total || 0)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Actions */}
              <button onClick={() => createInvoiceForClient(selectedClient)}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #5a67d8, #4a5568)' }}>
                <FileText className="w-4 h-4" /> New Invoice
              </button>

              {selectedClient.notes && (
                <div className="pt-3" style={{ borderTop: '1px solid #5a67d810' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#edf2f740' }}>Notes</p>
                  <p className="text-xs" style={{ color: '#edf2f770' }}>{selectedClient.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="sticky top-20 rounded-2xl p-8 text-center" style={{ background: '#ffffff08', border: '1px solid #5a67d808' }}>
              <User className="w-10 h-10 mx-auto mb-3" style={{ color: '#edf2f740' }} />
              <p className="text-sm" style={{ color: '#edf2f750' }}>Select a client to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
