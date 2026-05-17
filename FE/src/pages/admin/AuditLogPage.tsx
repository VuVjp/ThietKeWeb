import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
    ArrowPathIcon,
    ArrowDownTrayIcon,
    MagnifyingGlassIcon,
    ClipboardDocumentListIcon,
    FunnelIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { Table } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { toApiError } from '../../api/httpClient';
import { auditLogApi } from '../../api/auditLogApi';
import type { AuditLogDailyGroup, AuditLogEvent } from '../../api/auditLogApi';
import { useAppAuth } from '../../auth/useAppAuth';
import { paginate, queryIncludes } from '../../utils/table';

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
    CREATE: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    UPDATE: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
    DELETE: { bg: 'bg-red-100', text: 'text-red-800' },
    // LOGIN: { bg: 'bg-blue-100', text: 'text-blue-800' },
    // LOGOUT: { bg: 'bg-slate-100', text: 'text-slate-600' },
    // STATUS_CHANGE: { bg: 'bg-amber-100', text: 'text-amber-800' },
    OTHER: { bg: 'bg-violet-100', text: 'text-violet-800' },
};

function ActionBadge({ action }: { action: string }) {
    const normalized = action.toUpperCase();
    const style = ACTION_COLORS[normalized] ?? ACTION_COLORS['OTHER'];
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
            {normalized}
        </span>
    );
}

function formatDateTime(iso: string) {
    try {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

function formatJson(value: unknown) {
    if (value === null || value === undefined) {
        return 'null';
    }

    if (typeof value === 'string') {
        return value;
    }

    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function getContextValue(context: Record<string, unknown>, key: string) {
    const value = context[key];
    return value === undefined || value === null ? '' : String(value);
}

function buildAuditExportRows(events: AuditLogEvent[]) {
    return events.map((event) => ({
        Timestamp: formatDateTime(event.timestamp),
        Action: String(event.actionType ?? ''),
        Entity: event.entityType || '',
        Message: event.message || '',
        UserId: getContextValue(event.context, 'userId'),
        UserName: getContextValue(event.context, 'userName'),
        UserEmail: getContextValue(event.context, 'userEmail'),
        IpAddress: getContextValue(event.context, 'ipAddress'),
        OldData: formatJson(event.changes?.oldData),
        NewData: formatJson(event.changes?.newData),
    }));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildDiff(oldValue: unknown, newValue: unknown): { oldData: unknown; newData: unknown; hasChanges: boolean } {
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
        return { oldData: null, newData: null, hasChanges: false };
    }

    if (isPlainObject(oldValue) && isPlainObject(newValue)) {
        const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
        const oldResult: Record<string, unknown> = {};
        const newResult: Record<string, unknown> = {};
        let changed = false;

        for (const key of keys) {
            const nested = buildDiff(oldValue[key], newValue[key]);
            if (!nested.hasChanges) {
                continue;
            }

            oldResult[key] = nested.oldData;
            newResult[key] = nested.newData;
            changed = true;
        }

        return {
            oldData: changed ? oldResult : null,
            newData: changed ? newResult : null,
            hasChanges: changed,
        };
    }

    return { oldData: oldValue ?? null, newData: newValue ?? null, hasChanges: true };
}

const DEFAULT_PAGE_SIZE = 15;
const PAGE_SIZE_OPTIONS = [10, 15, 30, 50];
const ACTION_OPTIONS = ['All', 'CREATE', 'UPDATE', 'DELETE', 'OTHER'];
// const ACTION_OPTIONS = ['All', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'STATUS_CHANGE', 'OTHER'];

export function AuditLogPage() {
    const [groups, setGroups] = useState<AuditLogDailyGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { hasPermission } = useAppAuth();
    const canViewFullLogs = hasPermission('VIEW_FULL_AUDIT_LOGS');

    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('All');
    const [entityFilter, setEntityFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = canViewFullLogs
                ? await auditLogApi.getAll()
                : await auditLogApi.getMine();
            setGroups(data || []);
        } catch (error) {
            const apiError = toApiError(error);
            toast.error(apiError.message || 'Failed to load audit logs');
        } finally {
            setIsLoading(false);
        }
    }, [canViewFullLogs]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    // Reset page whenever filters change
    useEffect(() => {
        setPage(1);
    }, [searchQuery, actionFilter, entityFilter, dateFrom, dateTo]);

    const logs = useMemo(() => {
        return groups.flatMap((group) => group.events ?? []);
    }, [groups]);

    const entityTypes = useMemo(() => {
        const unique = new Set(logs.map((item) => item.entityType).filter(Boolean));
        return ['All', ...Array.from(unique).sort()];
    }, [logs]);

    const filtered = useMemo(() => {
        return logs.filter((log) => {
            const matchSearch = !searchQuery.trim() || queryIncludes(log.message ?? '', searchQuery);
            const matchAction = actionFilter === 'All' || log.actionType === actionFilter;
            const matchEntity = !canViewFullLogs || entityFilter === 'All' || !entityFilter || log.entityType === entityFilter;

            const logDate = new Date(log.timestamp);
            const matchFrom = !dateFrom || logDate >= new Date(dateFrom);
            const matchTo = !dateTo || logDate <= new Date(dateTo + 'T23:59:59');

            return matchSearch && matchAction && matchEntity && matchFrom && matchTo;
        });
    }, [logs, searchQuery, actionFilter, entityFilter, dateFrom, dateTo, canViewFullLogs]);

    const paged = paginate(filtered, page, pageSize);

    const exportToExcel = () => {
        const rows = buildAuditExportRows(filtered);

        if (rows.length === 0) {
            toast.error('No audit logs to export');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');
        XLSX.writeFile(workbook, `audit-logs-${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success('Audit log exported to Excel');
    };

    const clearFilters = () => {
        setSearchQuery('');
        setActionFilter('All');
        setEntityFilter('');
        setDateFrom('');
        setDateTo('');
    };

    const hasActiveFilter = canViewFullLogs
        ? searchQuery || actionFilter !== 'All' || entityFilter || dateFrom || dateTo
        : searchQuery || actionFilter !== 'All' || dateFrom || dateTo;
    const startItem = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, filtered.length);

    const columns = [
        {
            key: 'createdAt',
            label: 'Time',
            render: (row: AuditLogEvent) => (
                <span className="whitespace-nowrap text-xs text-slate-500">
                    {formatDateTime(row.timestamp)}
                </span>
            ),
        },
        {
            key: 'user',
            label: 'Actor',
            render: (row: AuditLogEvent) => (
                <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="text-sm font-semibold text-slate-800">{String(row.context?.['userName'] ?? 'Unknown')}</p>
                    <p className="text-xs text-slate-500">{String(row.context?.['userEmail'] ?? 'No email')}</p>
                    <div className="flex flex-wrap gap-1 text-[11px] text-slate-500">
                        <span className="rounded bg-white px-1.5 py-0.5">ID: {String(row.context?.['userId'] ?? 'N/A')}</span>
                        <span className="rounded bg-white px-1.5 py-0.5">IP: {String(row.context?.['ipAddress'] ?? 'N/A')}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'action',
            label: 'Action',
            render: (row: AuditLogEvent) => <ActionBadge action={row.actionType} />,
        },
        {
            key: 'entityType',
            label: 'Entity',
            render: (row: AuditLogEvent) => (
                <div className="text-xs">
                    <span className="font-semibold text-slate-700">{row.entityType || '—'}</span>
                </div>
            ),
        },
        {
            key: 'message',
            label: 'Message',
            render: (row: AuditLogEvent) => (
                <p className="max-w-xs whitespace-pre-wrap wrap-break-word text-sm text-slate-600" title={row.message}>
                    {row.message || '—'}
                </p>
            ),
        },
        {
            key: 'changesSummary',
            label: 'Changes',
            render: (row: AuditLogEvent) => {
                const diff = buildDiff(row.changes?.oldData, row.changes?.newData);

                // if (!diff.hasChanges) {
                //     return <span className="text-xs text-slate-400">No changes</span>;
                // }

                return (
                    <details className="w-100 rounded-lg border border-slate-200 bg-white">
                        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-50">
                            View changes
                        </summary>
                        <div className="grid gap-2 border-t border-slate-200 p-2 md:grid-cols-2">
                            <div className="overflow-hidden rounded-lg border border-rose-200 bg-rose-50 p-2">
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">Old Data</p>
                                <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all text-[11px] text-rose-900">
                                    {formatJson(diff.oldData)}
                                </pre>
                            </div>
                            <div className="overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">New Data</p>
                                <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all text-[11px] text-emerald-900">
                                    {formatJson(diff.newData)}
                                </pre>
                            </div>
                        </div>
                    </details>
                );
            },
        },
    ];

    const visibleColumns = canViewFullLogs
        ? columns
        : columns.filter((column) => column.key === 'createdAt' || column.key === 'action' || column.key === 'message' || column.key === 'changesSummary');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Audit Log</h2>
                    <p className="text-sm text-slate-500">Track protected write operations and entity changes.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportToExcel}
                        disabled={filtered.length === 0}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Export Excel"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Export Excel
                    </button>
                    <button
                        onClick={() => void loadLogs()}
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-cyan-600"
                        title="Refresh"
                    >
                        <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {canViewFullLogs && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: 'Daily Buckets', value: groups.length, color: 'text-slate-800' },
                        { label: 'Filtered Events', value: filtered.length, color: 'text-cyan-700' },
                        { label: 'Actions Today', value: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length, color: 'text-emerald-700' },
                        { label: 'Unique Users', value: new Set(groups.map(g => g.userId)).size, color: 'text-amber-700' },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-400">{stat.label}</p>
                            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                    <FunnelIcon className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filters</span>
                    {hasActiveFilter && (
                        <button
                            onClick={clearFilters}
                            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 transition"
                        >
                            <XMarkIcon className="h-3 w-3" /> Clear all
                        </button>
                    )}
                </div>
                <div className={canViewFullLogs ? 'grid gap-3 md:grid-cols-2 xl:grid-cols-5' : 'grid gap-3 md:grid-cols-2 xl:grid-cols-4'}>
                    <div className={canViewFullLogs ? 'relative xl:col-span-2' : 'relative md:col-span-2 xl:col-span-4'}>
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                            placeholder={canViewFullLogs ? 'Search by user, email or message...' : 'Search by message...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {canViewFullLogs && (
                        <>
                            <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                                {ACTION_OPTIONS.map((a) => (
                                    <option key={a} value={a}>{a === 'All' ? 'All Actions' : a}</option>
                                ))}
                            </Select>
                            <Select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
                                {entityTypes.map((t) => (
                                    <option key={t} value={t === 'All' ? '' : t}>{t === 'All' ? 'All Entities' : t}</option>
                                ))}
                            </Select>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    placeholder="From"
                                />
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    placeholder="To"
                                />
                            </div>
                        </>
                    )}
                    {!canViewFullLogs && (
                        <div className="grid gap-3 md:grid-cols-3 xl:col-span-4">
                            <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                                {ACTION_OPTIONS.map((a) => (
                                    <option key={a} value={a}>{a === 'All' ? 'All Actions' : a}</option>
                                ))}
                            </Select>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                placeholder="From"
                            />
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                placeholder="To"
                            />
                        </div>
                    )}
                </div>
                <p className="mt-3 text-xs text-slate-400">
                    Showing <span className="font-semibold text-slate-600">{filtered.length}</span> / {logs.length} events
                </p>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-sm font-bold text-slate-600 animate-pulse">Loading audit logs...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                        <ClipboardDocumentListIcon className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No audit logs found</h3>
                    <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or search terms.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-500">
                            Showing <span className="font-semibold text-slate-700">{startItem}-{endItem}</span> of{' '}
                            <span className="font-semibold text-slate-700">{filtered.length}</span> events
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Rows per page</span>
                            <Select
                                value={String(pageSize)}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                            >
                                {PAGE_SIZE_OPTIONS.map((size) => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </Select>
                        </div>
                    </div>
                    <Table columns={visibleColumns} rows={paged} />
                    <div className="pt-4">
                        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
                    </div>
                </div>
            )}
        </div>
    );
}
