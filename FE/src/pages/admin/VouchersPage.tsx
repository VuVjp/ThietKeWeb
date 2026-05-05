import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import type { Voucher } from '../../types/models';
import { toApiError } from '../../api/httpClient';
import {
  vouchersApi,
  type CreateVoucherPayload,
  type VoucherUserItem,
} from '../../api/vouchersApi';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Table } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { paginate, queryIncludes, sortBy } from '../../utils/table';
import { usePermissionCheck } from '../../hooks/usePermissionCheck';

type SortConfig = {
  key: keyof Voucher;
  direction: 'asc' | 'desc';
};

const emptyForm: CreateVoucherPayload = {
  code: '',
  discountType: 'Percentage',
  discountValue: 0,
  minBookingValue: 0,
  maxDiscountValue: 0,
  usageLimit: 1,
  validFrom: '',
  validTo: '',
};

export function VouchersPage() {
  const { ensure } = usePermissionCheck();

  // --- Voucher list state ---
  const [rows, setRows] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortConfig>({ key: 'code', direction: 'asc' });

  // --- Create / Edit modal ---
  const [openModal, setOpenModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Voucher | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateVoucherPayload>(emptyForm);

  // --- Send to Users modal ---
  const [openSendModal, setOpenSendModal] = useState(false);
  const [sendForm, setSendForm] = useState<CreateVoucherPayload>(emptyForm);
  const [isSending, setIsSending] = useState(false);
  const [allUsers, setAllUsers] = useState<VoucherUserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  // ---- Load vouchers ----
  const loadVouchers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await vouchersApi.getAll();
      setRows(data || []);
    } catch (error) {
      toast.error(toApiError(error).message || 'Failed to load vouchers');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadVouchers(); }, [loadVouchers]);

  // ---- Sort / filter ----
  const handleSort = (key: keyof Voucher) => {
    setSort(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const filtered = useMemo(() => {
    const next = rows.filter(item => {
      const matchQuery = queryIncludes(item.code, query);
      const matchType = typeFilter === 'all' || item.discountType === typeFilter;
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? item.isActive : !item.isActive);
      return matchQuery && matchType && matchStatus;
    });
    return sortBy(next, item => item[sort.key] as string | number, sort.direction);
  }, [rows, query, typeFilter, statusFilter, sort]);

  const pageSize = 8;
  const paged = paginate(filtered, page, pageSize);

  // ---- Toggle active ----
  const handleToggleActive = async (id: number) => {
    if (!ensure('MANAGE_VOUCHERS', 'toggle voucher status')) return;
    try {
      await vouchersApi.toggleActive(id);
      setRows(prev => prev.map(v => v.id === id ? { ...v, isActive: !v.isActive } : v));
      toast.success('Voucher status updated');
    } catch (error) {
      toast.error(toApiError(error).message || 'Failed to toggle status');
    }
  };

  // ---- Create / Edit ----
  const handleOpenCreate = () => {
    if (!ensure('MANAGE_VOUCHERS', 'create voucher')) return;
    setEditTarget(null);
    setForm(emptyForm);
    setOpenModal(true);
  };

  const handleOpenEdit = (voucher: Voucher) => {
    if (!ensure('MANAGE_VOUCHERS', 'edit voucher')) return;
    setEditTarget(voucher);
    setForm({
      code: voucher.code,
      discountType: (voucher.discountType as 'Percentage' | 'Fixed') || 'Percentage',
      discountValue: voucher.discountValue,
      minBookingValue: voucher.minBookingValue ?? 0,
      maxDiscountValue: voucher.maxDiscountValue ?? 0,
      usageLimit: voucher.usageLimit ?? 1,
      validFrom: voucher.validFrom ? voucher.validFrom.split('T')[0] : '',
      validTo: voucher.validTo ? voucher.validTo.split('T')[0] : '',
    });
    setOpenModal(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (editTarget) {
        await vouchersApi.update(+editTarget.id, form);
        toast.success('Voucher updated successfully');
      } else {
        await vouchersApi.create(form);
        toast.success('Voucher created successfully');
      }
      setOpenModal(false);
      await loadVouchers();
    } catch (error) {
      toast.error(toApiError(error).message || 'Failed to save voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Send to Users ----
  const handleOpenSendModal = async () => {
    if (!ensure('MANAGE_VOUCHERS', 'send voucher to users')) return;
    setSendForm(emptyForm);
    setSelectedUserIds([]);
    setUserSearch('');
    setOpenSendModal(true);
    setIsLoadingUsers(true);
    try {
      const users = await vouchersApi.getUsers();
      setAllUsers(users);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    return allUsers.filter(u =>
      (u.fullName ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [allUsers, userSearch]);

  const toggleUser = (id: number) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredUsers.map(u => u.id);
    const allSelected = visibleIds.every(id => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedUserIds(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const handleSend = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one user');
      return;
    }
    if (!sendForm.code.trim()) {
      toast.error('Voucher code is required');
      return;
    }
    setIsSending(true);
    try {
      await vouchersApi.sendToUsers({ userIds: selectedUserIds, voucherData: sendForm });
      toast.success(`Voucher created and sent to ${selectedUserIds.length} user(s)!`);
      setOpenSendModal(false);
      await loadVouchers();
    } catch (error) {
      toast.error(toApiError(error).message || 'Failed to send vouchers');
    } finally {
      setIsSending(false);
    }
  };

  // ---- Shared form fields renderer ----
  const renderVoucherFormFields = (
    data: CreateVoucherPayload,
    onChange: (updated: CreateVoucherPayload) => void
  ) => (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Voucher Code</label>
          <Input
            placeholder="PROMO2024"
            value={data.code}
            onChange={e => onChange({ ...data, code: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Discount Type</label>
          <Select value={data.discountType} onChange={e => onChange({ ...data, discountType: e.target.value as 'Percentage' | 'Fixed' })}>
            <option value="Percentage">Percentage (%)</option>
            <option value="Fixed">Fixed Amount ($)</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Discount Value</label>
          <Input type="number" value={data.discountValue}
            onChange={e => onChange({ ...data, discountValue: Number(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Usage Limit</label>
          <Input type="number" value={data.usageLimit}
            onChange={e => onChange({ ...data, usageLimit: Number(e.target.value) })} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Min Booking Value ($)</label>
          <Input type="number" value={data.minBookingValue}
            onChange={e => onChange({ ...data, minBookingValue: Number(e.target.value) })} />
        </div>
        {data.discountType === 'Percentage' && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Max Discount Cap ($)</label>
            <Input type="number" placeholder="0 = no limit" value={data.maxDiscountValue}
              onChange={e => onChange({ ...data, maxDiscountValue: Number(e.target.value) })} />
            <p className="text-xs text-slate-400">Set 0 to disable the cap.</p>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Valid From</label>
          <Input type="date" value={data.validFrom}
            onChange={e => onChange({ ...data, validFrom: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Valid To</label>
          <Input type="date" value={data.validTo}
            onChange={e => onChange({ ...data, validTo: e.target.value })} />
        </div>
      </div>
    </div>
  );

  // ---- Table columns ----
  const columns = [
    {
      key: 'code', label: 'Code', sortable: true,
      render: (row: Voucher) => (
        <span className="font-mono font-bold text-slate-700">{row.code}</span>
      ),
    },
    {
      key: 'discount', label: 'Discount',
      render: (row: Voucher) => (
        <div>
          <span className="font-semibold text-cyan-700">
            {row.discountType === 'Percentage' ? `${row.discountValue}%` : `$${row.discountValue}`}
          </span>
          {row.discountType === 'Percentage' && (row.maxDiscountValue ?? 0) > 0 && (
            <p className="text-xs text-amber-500 font-medium">Cap: ${(row.maxDiscountValue ?? 0).toLocaleString()}</p>
          )}
          <p className="text-xs text-slate-400">Min: ${row.minBookingValue ?? 0}</p>
        </div>
      ),
    },
    {
      key: 'validity', label: 'Validity', sortable: true,
      render: (row: Voucher) => (
        <div className="text-xs">
          <p><span className="text-slate-400">From:</span> {row.validFrom ? new Date(row.validFrom).toLocaleDateString() : '—'}</p>
          <p><span className="text-slate-400">To:</span> {row.validTo ? new Date(row.validTo).toLocaleDateString() : '—'}</p>
        </div>
      ),
    },
    {
      key: 'usage', label: 'Usage',
      render: (row: Voucher) => (
        <div className="text-xs">
          <div className="flex justify-between mb-1">
            <span>{row.usageCount ?? 0} / {row.usageLimit ?? '∞'}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div
              className="bg-cyan-600 h-1.5 rounded-full"
              style={{ width: `${Math.min(((row.usageCount ?? 0) / (row.usageLimit ?? 1)) * 100, 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (row: Voucher) => (
        <button style={{ cursor: 'pointer' }} onClick={() => handleToggleActive(+row.id)}>
          <Badge value={row.isActive ? 'Active' : 'Inactive'} />
        </button>
      ),
    },
    {
      key: 'actions', label: 'Actions',
      render: (row: Voucher) => (
        <div className="flex gap-2">
          <button
            className="p-1 text-slate-400 hover:text-cyan-600 transition"
            onClick={() => handleOpenEdit(row)}
            title="Edit voucher"
          >
            <PencilSquareIcon className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Voucher Management</h2>
          <p className="text-sm text-slate-500">Create and manage discount codes for bookings.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadVouchers}
            className="p-2 text-slate-500 hover:text-cyan-600 transition bg-white border border-slate-200 rounded-xl"
          >
            <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenSendModal}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <EnvelopeIcon className="h-4 w-4" /> Send to Users
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-800 transition"
          >
            <PlusIcon className="h-4 w-4" /> Create Voucher
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <Input placeholder="Search voucher code..." value={query} onChange={e => setQuery(e.target.value)} />
        <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="Percentage">Percentage</option>
          <option value="Fixed">Fixed Amount</option>
        </Select>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </Select>
        <div className="flex items-center gap-2 px-2 text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
          <span>Sort by:</span>
          <button onClick={() => handleSort('code')}
            className={`px-2 py-1 rounded transition ${sort.key === 'code' ? 'bg-cyan-100 text-cyan-700' : ''}`}>Code</button>
          <button onClick={() => handleSort('validFrom')}
            className={`px-2 py-1 rounded transition ${sort.key === 'validFrom' ? 'bg-cyan-100 text-cyan-700' : ''}`}>Date</button>
        </div>
      </div>

      <Table columns={columns} rows={isLoading ? [] : paged} />
      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />

      {/* ===== Create / Edit Modal ===== */}
      <Modal open={openModal} title={editTarget ? 'Edit Voucher' : 'Create New Voucher'} onClose={() => setOpenModal(false)}>
        <div className="space-y-4">
          {renderVoucherFormFields(form, setForm)}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              onClick={() => setOpenModal(false)}>
              Cancel
            </button>
            <button type="button" disabled={isSubmitting}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-800 disabled:opacity-50 transition"
              onClick={handleSubmit}>
              {isSubmitting ? 'Saving...' : (editTarget ? 'Update Voucher' : 'Create Voucher')}
            </button>
          </div>
        </div>
      </Modal>

      {/* ===== Send to Users Modal ===== */}
      <Modal
        open={openSendModal}
        title="Create & Send Voucher to Users"
        onClose={() => setOpenSendModal(false)}
      >
        <div className="space-y-5">
          {/* Voucher fields */}
          {renderVoucherFormFields(sendForm, setSendForm)}

          {/* Divider */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-700">Select Recipients</h4>
                <p className="text-xs text-slate-400">
                  {selectedUserIds.length > 0
                    ? `${selectedUserIds.length} user(s) selected`
                    : 'No users selected'}
                </p>
              </div>
              {selectedUserIds.length > 0 && (
                <button
                  className="text-xs text-red-500 hover:text-red-600 transition"
                  onClick={() => setSelectedUserIds([])}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Selected users pills */}
            {selectedUserIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                {allUsers.filter(u => selectedUserIds.includes(u.id)).map(u => (
                  <span key={u.id}
                    className="inline-flex items-center gap-1 bg-white border border-emerald-200 text-emerald-700 text-xs px-2 py-0.5 rounded-full"
                  >
                    {u.fullName || u.email}
                    <button onClick={() => toggleUser(u.id)} className="hover:text-red-500 transition">
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-2">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* User list */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {/* Select all header */}
              {filteredUsers.length > 0 && (
                <div
                  className="flex items-center gap-3 px-3 py-2 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition"
                  onClick={toggleAllVisible}
                >
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition ${
                    filteredUsers.every(u => selectedUserIds.includes(u.id))
                      ? 'bg-cyan-600 border-cyan-600'
                      : 'border-slate-300'
                  }`}>
                    {filteredUsers.every(u => selectedUserIds.includes(u.id)) && (
                      <CheckIcon className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    Select all visible ({filteredUsers.length})
                  </span>
                </div>
              )}

              {/* User rows */}
              <div className="max-h-48 overflow-y-auto">
                {isLoadingUsers ? (
                  <div className="text-center py-6 text-sm text-slate-400">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400">No users found</div>
                ) : (
                  filteredUsers.map(u => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition border-b border-slate-100 last:border-0 ${
                          isSelected ? 'bg-cyan-50' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => toggleUser(u.id)}
                      >
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                          isSelected ? 'bg-cyan-600 border-cyan-600' : 'border-slate-300'
                        }`}>
                          {isSelected && <CheckIcon className="h-2.5 w-2.5 text-white" />}
                        </div>
                        {/* Avatar */}
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(u.fullName || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{u.fullName || u.email}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              onClick={() => setOpenSendModal(false)}>
              Cancel
            </button>
            <button
              type="button"
              disabled={isSending || selectedUserIds.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
              onClick={handleSend}
            >
              <EnvelopeIcon className="h-4 w-4" />
              {isSending
                ? 'Sending...'
                : `Send to ${selectedUserIds.length} User${selectedUserIds.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
