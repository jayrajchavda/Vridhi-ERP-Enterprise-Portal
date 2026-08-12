import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { customersApi, Customer } from './customers.api';
import { cn } from '../../lib/utils';

const schema = z.object({
  name:         z.string().min(2, 'Name must be at least 2 characters').trim(),
  mobile:       z.string().regex(/^\d{10}$/, 'Mobile must be exactly 10 digits'),
  email:        z.string().email('Invalid email').optional().or(z.literal('')),
  businessName: z.string().trim().optional().or(z.literal('')),
  gstNumber:    z.string().regex(/^[0-9A-Z]{15}$/, 'GST must be 15 alphanumeric characters').optional().or(z.literal('')),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
  status:       z.enum(['LEAD', 'ACTIVE', 'INACTIVE']),
  followUpDate: z.string().optional().or(z.literal('')),
  notes:        z.string().optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  existing?: Customer;
}

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode; required?: boolean; className?: string }> = ({
  label, error, children, required
}) => (
  <div>
    <label className="block text-xs font-medium text-foreground mb-1.5">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-destructive mt-1">{error}</p>}
  </div>
);

const inputCls = (hasError?: boolean) => cn(
  'w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground',
  'outline-none transition-all duration-150',
  'focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
  hasError ? 'border-destructive' : 'border-border hover:border-brand-400'
);

const selectCls = (hasError?: boolean) => cn(inputCls(hasError), 'cursor-pointer');

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ open, onClose, existing }) => {
  const qc = useQueryClient();
  const isEdit = Boolean(existing);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:         existing?.name ?? '',
      mobile:       existing?.mobile ?? '',
      email:        existing?.email ?? '',
      businessName: existing?.businessName ?? '',
      gstNumber:    existing?.gstNumber ?? '',
      customerType: existing?.customerType ?? 'RETAIL',
      status:       existing?.status ?? 'LEAD',
      followUpDate: existing?.followUpDate ? existing.followUpDate.slice(0, 10) : '',
      notes:        existing?.notes ?? '',
    },
  });

  const onSuccess = () => {
    toast.success(isEdit ? 'Customer updated' : 'Customer created');
    qc.invalidateQueries({ queryKey: ['customers'] });
    if (existing) qc.invalidateQueries({ queryKey: ['customer', existing.id] });
    handleClose();
  };

  const createMutation = useMutation({ mutationFn: customersApi.create, onSuccess });
  const updateMutation = useMutation({
    mutationFn: (data: any) => customersApi.update(existing!.id, data),
    onSuccess,
  });

  const handleClose = () => { reset(); onClose(); };

  const onSubmit = async (data: FormData) => {
    const clean = {
      ...data,
      email:        data.email || undefined,
      businessName: data.businessName || undefined,
      gstNumber:    data.gstNumber?.toUpperCase() || undefined,
      followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : undefined,
      notes:        data.notes || undefined,
    };
    try {
      if (isEdit) await updateMutation.mutateAsync(clean);
      else await createMutation.mutateAsync(clean as any);
    } catch (err: any) {
      if (err.code === 'DUPLICATE_MOBILE') {
        toast.error('Duplicate mobile number', { description: 'This mobile number is already registered.' });
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {isEdit ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? 'Update customer information' : 'Fill in details to add a customer'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" error={errors.name?.message} required className="col-span-2">
                <input id="customer-name" {...register('name')} placeholder="e.g. Rajesh Kumar" className={inputCls(!!errors.name)} />
              </Field>

              <Field label="Mobile Number" error={errors.mobile?.message} required>
                <input id="customer-mobile" {...register('mobile')} placeholder="10 digit mobile" className={inputCls(!!errors.mobile)} />
              </Field>

              <Field label="Email" error={errors.email?.message}>
                <input id="customer-email" {...register('email')} type="email" placeholder="optional" className={inputCls(!!errors.email)} />
              </Field>

              <Field label="Business Name" error={errors.businessName?.message} className="col-span-2">
                <input id="customer-business" {...register('businessName')} placeholder="optional" className={inputCls(!!errors.businessName)} />
              </Field>

              <Field label="GST Number" error={errors.gstNumber?.message}>
                <input id="customer-gst" {...register('gstNumber')} placeholder="15 chars, optional" className={inputCls(!!errors.gstNumber)} style={{ textTransform: 'uppercase' }} />
              </Field>

              <Field label="Follow-up Date" error={errors.followUpDate?.message}>
                <input id="customer-followup" {...register('followUpDate')} type="date" className={inputCls(!!errors.followUpDate)} />
              </Field>

              <Field label="Customer Type" error={errors.customerType?.message} required>
                <select id="customer-type" {...register('customerType')} className={selectCls(!!errors.customerType)}>
                  <option value="RETAIL">Retail</option>
                  <option value="WHOLESALE">Wholesale</option>
                  <option value="DISTRIBUTOR">Distributor</option>
                </select>
              </Field>

              <Field label="Status" error={errors.status?.message} required>
                <select id="customer-status" {...register('status')} className={selectCls(!!errors.status)}>
                  <option value="LEAD">Lead</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </Field>

              <Field label="Notes" error={errors.notes?.message} className="col-span-2">
                <textarea
                  id="customer-notes"
                  {...register('notes')}
                  rows={3}
                  placeholder="Any additional notes..."
                  className={cn(inputCls(!!errors.notes), 'resize-none')}
                />
              </Field>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30 shrink-0 rounded-b-2xl">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              id="customer-form-submit"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-60"
            >
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Quick type assertion for Field with className support
declare module 'react' {
  interface HTMLAttributes<T> { className?: string; }
}
