import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { toApiError } from '../../api/httpClient';
import {
  vouchersApi,
  type CreateVoucherPayload,
  type VoucherUserItem,
} from '../../api/vouchersApi';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { usePermissionCheck } from '../../hooks/usePermissionCheck';

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

export function SendVoucherPage() {
  const { ensure } = usePermissionCheck();
  const navigate = useNavigate();

  const [sendForm, setSendForm] = useState<CreateVoucherPayload>(emptyForm);
  const [isSending, setIsSending] = useState(false);
  const [allUsers, setAllUsers] = useState<VoucherUserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Filtering & Pagination
  const [userSearch, setUserSearch] = useState('');
  const [userGroupFilter, setUserGroupFilter] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 4;
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  useEffect(() => {
    if (!ensure('MANAGE_VOUCHERS', 'send voucher to users')) {
      navigate('/admin/vouchers');
      return;
    }

    const loadUsers = async () => {
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
    void loadUsers();
  }, [ensure, navigate]);

  const membershipTiers = useMemo(() => {
    const tiers = new Set<string>();
    allUsers.forEach(u => {
        if (u.membershipName && u.membershipName !== 'None') {
            tiers.add(u.membershipName);
        }
    });
    return Array.from(tiers).sort();
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    return allUsers.filter(u => {
      const matchSearch = (u.fullName ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q);
      let matchGroup = true;
      if (userGroupFilter === 'staff') {
         matchGroup = u.roleName !== 'Guest' && u.roleName !== 'None' && !!u.roleName;
      } else if (userGroupFilter !== 'all') {
         matchGroup = u.membershipName === userGroupFilter;
      }
      return matchSearch && matchGroup;
    });
  }, [allUsers, userSearch, userGroupFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, userPage]);

  const toggleUser = (id: number) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAllMatching = () => {
    const matchingIds = filteredUsers.map(u => u.id);
    const allSelected = matchingIds.every(id => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(id => !matchingIds.includes(id)));
    } else {
      setSelectedUserIds(prev => [...new Set([...prev, ...matchingIds])]);
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
    if (sendForm.discountValue <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }
    if (sendForm.discountType === 'Percentage' && sendForm.discountValue > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }
    if (sendForm.minBookingValue < 0) {
      toast.error('Minimum booking value cannot be negative');
      return;
    }
    if (sendForm.maxDiscountValue < 0) {
      toast.error('Max discount cap cannot be negative');
      return;
    }
    if (sendForm.usageLimit <= 0) {
      toast.error('Usage limit must be greater than 0');
      return;
    }
    setIsSending(true);
    try {
      await vouchersApi.sendToUsers({ userIds: selectedUserIds, voucherData: sendForm });
      toast.success(`Voucher created and sent to ${selectedUserIds.length} user(s)!`);
      navigate('/admin/vouchers');
    } catch (error) {
      toast.error(toApiError(error).message || 'Failed to send vouchers');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/vouchers')}
          className="p-2 text-slate-500 hover:text-cyan-600 transition bg-white border border-slate-200 rounded-xl shadow-sm"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Send Voucher to Users</h2>
          <p className="text-sm text-slate-500">Create a new voucher and send it directly to selected users.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-stretch md:h-[520px]">
        {/* Left Column: Voucher Details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 flex flex-col overflow-y-auto">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Voucher Details</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Voucher Code</label>
              <Input
                placeholder="PROMO2024"
                value={sendForm.code}
                onChange={e => setSendForm({ ...sendForm, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Discount Type</label>
              <Select value={sendForm.discountType} onChange={e => setSendForm({ ...sendForm, discountType: e.target.value as 'Percentage' | 'Fixed' })}>
                <option value="Percentage">Percentage (%)</option>
                <option value="Fixed">Fixed Amount ($)</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Discount Value</label>
              <Input type="number" value={sendForm.discountValue}
                onChange={e => setSendForm({ ...sendForm, discountValue: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Usage Limit</label>
              <Input type="number" value={sendForm.usageLimit}
                onChange={e => setSendForm({ ...sendForm, usageLimit: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Min Booking Value ($)</label>
              <Input type="number" value={sendForm.minBookingValue}
                onChange={e => setSendForm({ ...sendForm, minBookingValue: Number(e.target.value) })} />
            </div>
            {sendForm.discountType === 'Percentage' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Max Discount Cap ($)</label>
                <Input type="number" placeholder="0 = no limit" value={sendForm.maxDiscountValue}
                  onChange={e => setSendForm({ ...sendForm, maxDiscountValue: Number(e.target.value) })} />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Valid From</label>
              <Input type="date" value={sendForm.validFrom}
                onChange={e => setSendForm({ ...sendForm, validFrom: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Valid To</label>
              <Input type="date" value={sendForm.validTo}
                onChange={e => setSendForm({ ...sendForm, validTo: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Right Column: User Selection */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4 flex-shrink-0">
            <h3 className="text-lg font-bold text-slate-800">Select Recipients</h3>
            {selectedUserIds.length > 0 && (
              <button
                className="text-xs text-red-500 hover:text-red-600 font-medium transition"
                onClick={() => setSelectedUserIds([])}
              >
                Clear all ({selectedUserIds.length})
              </button>
            )}
          </div>

          {/* Selected users pills */}
          {selectedUserIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4 p-2 bg-emerald-50 rounded-lg border border-emerald-100 max-h-24 overflow-y-auto flex-shrink-0">
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

          {/* Search & Filter */}
          <div className="flex flex-col gap-2 mb-3 flex-shrink-0">
            <div className="relative w-full">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <Select 
              value={userGroupFilter} 
              onChange={e => { setUserGroupFilter(e.target.value); setUserPage(1); }} 
              className="w-full py-2 text-sm"
            >
              <option value="all">All Users</option>
              <option value="staff">All Staff</option>
              {membershipTiers.map(tier => (
                  <option key={tier} value={tier}>{tier} Members</option>
              ))}
            </Select>
          </div>

          {/* User list */}
          <div className="border border-slate-200 rounded-lg flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Select all header */}
            {filteredUsers.length > 0 && (
              <div
                className="flex items-center gap-3 px-3 py-2 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition"
                onClick={toggleAllMatching}
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
                  Select all matching ({filteredUsers.length})
                </span>
              </div>
            )}

            {/* User rows */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingUsers ? (
                <div className="text-center py-10 text-sm text-slate-400">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-400">No users found</div>
              ) : (
                paginatedUsers.map(u => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition border-b border-slate-100 last:border-0 ${
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
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(u.fullName || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {u.fullName || u.email}
                          {u.roleName && u.roleName !== 'Guest' && u.roleName !== 'None' && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
                              {u.roleName}
                            </span>
                          )}
                          {u.membershipName && u.membershipName !== 'None' && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                              {u.membershipName}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Pagination */}
            <div className="flex justify-between items-center px-3 py-2 border-t border-slate-200 bg-slate-50 mt-auto">
                <span className="text-xs text-slate-500">
                    Showing {filteredUsers.length === 0 ? 0 : (userPage - 1) * usersPerPage + 1} to {Math.min(userPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length}
                </span>
                <div className="flex gap-1">
                    <button 
                       disabled={userPage === 1} 
                       onClick={() => setUserPage(p => p - 1)}
                       className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                    >Prev</button>
                    <button 
                       disabled={userPage * usersPerPage >= filteredUsers.length} 
                       onClick={() => setUserPage(p => p + 1)}
                       className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                    >Next</button>
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
        <button
          type="button"
          className="rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          onClick={() => navigate('/admin/vouchers')}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isSending || selectedUserIds.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
          onClick={handleSend}
        >
          <EnvelopeIcon className="h-5 w-5" />
          {isSending
            ? 'Sending...'
            : `Send to ${selectedUserIds.length} User${selectedUserIds.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
