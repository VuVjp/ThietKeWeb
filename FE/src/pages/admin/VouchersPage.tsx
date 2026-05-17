import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import type { Voucher } from '../../types/models';
import { toApiError } from '../../api/httpClient';
import {
  vouchersApi,
} from '../../api/vouchersApi';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Table } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { Badge } from '../../components/Badge';
import { paginate, queryIncludes, sortBy } from '../../utils/table';
import { usePermissionCheck } from '../../hooks/usePermissionCheck';

type SortConfig = {
  key: keyof Voucher;
  direction: 'asc' | 'desc';
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

  const navigate = useNavigate();

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
    navigate('/admin/vouchers/new');
  };

  const handleOpenEdit = (voucher: Voucher) => {
    if (!ensure('MANAGE_VOUCHERS', 'edit voucher')) return;
    navigate(`/admin/vouchers/${voucher.id}/edit`);
  };

  // ---- Send to Users ----
  const handleNavigateSend = () => {
    if (!ensure('MANAGE_VOUCHERS', 'send voucher to users')) return;
    navigate('/admin/vouchers/send');
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Voucher Management</h2>
          <p className="text-sm text-slate-500">Create and manage discount codes for bookings.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadVouchers}
            className="p-2 text-slate-500 hover:text-cyan-600 transition bg-white border border-slate-200 rounded-xl"
          >
            <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleNavigateSend}
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

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm font-bold text-slate-600 animate-pulse">Loading vouchers...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
            <PlusIcon className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No vouchers found</h3>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
          <Table columns={columns} rows={paged} />
          <div className="p-4 border-t border-slate-100 bg-slate-50/30">
            <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
          </div>
        </div>
      )}

    </div>
  );
}
