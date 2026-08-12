import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Mail, Phone, MapPin, User, X } from 'lucide-react';
import { procurementApi, Vendor } from './procurement.api';
import { LoadingSkeletonTable } from '../../components/LoadingSkeletonTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { toast } from 'sonner';

export const VendorsPage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['vendors', search],
    queryFn: () => procurementApi.listVendors({ q: search || undefined }),
  });

  const vendors: Vendor[] = data?.data ?? [];

  const openCreateModal = () => {
    setEditingVendor(null);
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setGstNumber('');
    setAddress('');
    setIsModalOpen(true);
  };

  const openEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setName(vendor.name);
    setContactPerson(vendor.contactPerson || '');
    setPhone(vendor.phone);
    setEmail(vendor.email || '');
    setGstNumber(vendor.gstNumber || '');
    setAddress(vendor.address || '');
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (body: any) => {
      if (editingVendor) {
        return procurementApi.updateVendor(editingVendor.id, body);
      }
      return procurementApi.createVendor(body);
    },
    onSuccess: () => {
      toast.success(editingVendor ? 'Vendor details updated' : 'New vendor registered successfully');
      qc.invalidateQueries({ queryKey: ['vendors'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Operation failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    if (!phone.trim()) return toast.error('Phone is required');

    saveMutation.mutate({
      name: name.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      gstNumber: gstNumber.trim() || undefined,
      address: address.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors & Suppliers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage procurement suppliers, contracts, and billing information
          </p>
        </div>
        <button
          id="add-vendor-btn"
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm"
        >
          <Plus size={16} />
          Add Vendor
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id="vendor-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor name, contact person..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </div>

      {/* Grid List */}
      {isLoading ? (
        <LoadingSkeletonTable />
      ) : isError ? (
        <ErrorBanner message="Failed to load vendors list" />
      ) : vendors.length === 0 ? (
        <EmptyState title="No Vendors Found" description="Get started by registering your first vendor." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-card border border-border hover:border-brand-500/40 rounded-xl p-5 transition-all hover:shadow-lg relative overflow-hidden group"
            >
              {/* Card Title */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-foreground group-hover:text-brand-500 transition-colors">
                    {vendor.name}
                  </h3>
                  {vendor.gstNumber && (
                    <span className="inline-block text-[10px] font-mono bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded">
                      GST: {vendor.gstNumber}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => openEditModal(vendor)}
                  className="text-xs text-brand-500 hover:underline font-semibold"
                >
                  Edit
                </button>
              </div>

              {/* Card details */}
              <div className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                {vendor.contactPerson && (
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-muted-foreground/70" />
                    <span>{vendor.contactPerson} (Contact)</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-muted-foreground/70" />
                  <span>{vendor.phone}</span>
                </div>
                {vendor.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-muted-foreground/70" />
                    <span>{vendor.email}</span>
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-muted-foreground/70 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{vendor.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <h2 className="text-lg font-bold text-foreground">
                {editingVendor ? 'Edit Vendor Details' : 'Register New Vendor'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Vendor / Business Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Fasteners Corp"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Contact Person</label>
                  <input
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Phone Number *</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. vendor@acme.com"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">GSTIN (GST ID)</label>
                  <input
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Office Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street details, City, State, ZIP code"
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : editingVendor ? 'Update Details' : 'Register Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
