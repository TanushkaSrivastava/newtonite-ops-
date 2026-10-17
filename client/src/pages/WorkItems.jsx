import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  workItemService,
  STATUSES,
  PRIORITIES,
  WORK_ITEM_TYPES,
} from '../services/workItemService';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { SkeletonRows } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { CreateWorkItemModal } from '../components/work-items/CreateWorkItemModal';
import { isDemoMode, MOCK_WORK_ITEMS } from '../services/mockAdapter';

export function WorkItems() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeTeam, teams } = useAuth();

  // State from URL or defaults
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'ALL');
  const [priority, setPriority] = useState(searchParams.get('priority') || 'ALL');
  const [type, setType] = useState(searchParams.get('type') || 'ALL');
  const [assignee, setAssignee] = useState(searchParams.get('assignee') || 'ALL');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'updatedAt');
  const [order, setOrder] = useState(searchParams.get('order') || 'desc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [limit, setLimit] = useState(parseInt(searchParams.get('limit') || '20', 10));

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Sync state to URL search params
  const syncParamsToUrl = useCallback(
    (newParams) => {
      const merged = {
        search: search || undefined,
        status: status !== 'ALL' ? status : undefined,
        priority: priority !== 'ALL' ? priority : undefined,
        type: type !== 'ALL' ? type : undefined,
        assignee: assignee !== 'ALL' ? assignee : undefined,
        sortBy: sortBy !== 'updatedAt' ? sortBy : undefined,
        order: order !== 'desc' ? order : undefined,
        page: page > 1 ? String(page) : undefined,
        limit: limit !== 20 ? String(limit) : undefined,
        ...newParams,
      };

      const clean = {};
      for (const [k, v] of Object.entries(merged)) {
        if (v !== undefined && v !== '') {
          clean[k] = v;
        }
      }
      setSearchParams(clean, { replace: true });
    },
    [search, status, priority, type, assignee, sortBy, order, page, limit, setSearchParams]
  );

  const fetchWorkItems = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const targetTeamId = activeTeam?.id || teams?.[0]?.id;
      if (!targetTeamId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isDemoMode()) {
        let filtered = [...MOCK_WORK_ITEMS];
        if (status !== 'ALL') {
          filtered = filtered.filter((i) => i.status === status);
        }
        if (priority !== 'ALL') {
          filtered = filtered.filter((i) => i.priority === priority);
        }
        if (type !== 'ALL') {
          filtered = filtered.filter((i) => i.type === type);
        }
        if (search.trim()) {
          const q = search.toLowerCase();
          filtered = filtered.filter(
            (i) =>
              i.title.toLowerCase().includes(q) ||
              i.description.toLowerCase().includes(q) ||
              i.id.toLowerCase().includes(q)
          );
        }
        setItems(filtered);
        setPagination({
          page: 1,
          limit: 20,
          total: filtered.length,
          totalPages: 1,
        });
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const res = await workItemService.getWorkItems({
          teamId: targetTeamId,
          status,
          priority,
          assignee,
          search,
          sortBy,
          order,
          page,
          limit,
        });

        // If type filter is selected on client side (or backend), filter items
        let resultItems = res.items || [];
        if (type !== 'ALL') {
          resultItems = resultItems.filter((i) => i.type === type);
        }

        setItems(resultItems);
        setPagination(res.pagination || { page: 1, limit: 20, total: resultItems.length, totalPages: 1 });
      } catch (err) {
        console.error('Failed to fetch work items:', err);
        setError(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTeam, teams, status, priority, type, assignee, search, sortBy, order, page, limit]
  );

  useEffect(() => {
    fetchWorkItems();
  }, [fetchWorkItems]);

  const handleClearFilters = () => {
    setSearch('');
    setStatus('ALL');
    setPriority('ALL');
    setType('ALL');
    setAssignee('ALL');
    setPage(1);
    syncParamsToUrl({
      search: undefined,
      status: undefined,
      priority: undefined,
      type: undefined,
      assignee: undefined,
      page: undefined,
    });
  };

  const handleSort = (field) => {
    let nextOrder = 'desc';
    if (sortBy === field) {
      nextOrder = order === 'desc' ? 'asc' : 'desc';
    }
    setSortBy(field);
    setOrder(nextOrder);
    setPage(1);
    syncParamsToUrl({ sortBy: field, order: nextOrder, page: undefined });
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    status !== 'ALL' ||
    priority !== 'ALL' ||
    type !== 'ALL' ||
    assignee !== 'ALL';

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Build team member options for assignee filter
  const memberList = [];
  if (activeTeam?.owner) {
    const o = activeTeam.owner;
    memberList.push({ id: o._id || o.id, name: `${o.name} (Owner)` });
  }
  if (activeTeam?.members) {
    activeTeam.members.forEach((m) => {
      const u = m.user;
      if (u && (u._id || u.id)) {
        const uid = u._id || u.id;
        if (!memberList.some((existing) => existing.id === uid)) {
          memberList.push({ id: uid, name: u.name });
        }
      }
    });
  }

  return (
    <div className="page-container work-items-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-context-pill">
            <Building2 size={13} />
            <span>{activeTeam?.name || 'Workspace'}</span>
          </div>
          <h1 className="page-title">Work Items</h1>
          <p className="page-description text-secondary">
            Manage operational incidents, compliance tasks, and engineering workflows.
          </p>
        </div>

        <div className="page-actions">
          <Button
            variant="outline"
            size="md"
            icon={RefreshCw}
            loading={refreshing}
            onClick={() => fetchWorkItems(true)}
            title="Refresh list"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setCreateModalOpen(true)}
          >
            Create Work Item
          </Button>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={() => fetchWorkItems()} />}

      {/* Filtering Toolbar */}
      <div className="filters-toolbar">
        <div className="filters-search-box">
          <Search size={15} className="filter-search-icon" />
          <input
            type="search"
            placeholder="Filter by title, description, or ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                syncParamsToUrl({ search: e.target.value, page: 1 });
              }
            }}
            className="filter-search-input"
          />
        </div>

        <div className="filters-select-group">
          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
              syncParamsToUrl({ status: e.target.value, page: 1 });
            }}
            className="filter-select"
            aria-label="Filter by Status"
          >
            <option value="ALL">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
              syncParamsToUrl({ priority: e.target.value, page: 1 });
            }}
            className="filter-select"
            aria-label="Filter by Priority"
          >
            <option value="ALL">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
              syncParamsToUrl({ type: e.target.value, page: 1 });
            }}
            className="filter-select"
            aria-label="Filter by Type"
          >
            <option value="ALL">All Types</option>
            {WORK_ITEM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Assignee Filter */}
          <select
            value={assignee}
            onChange={(e) => {
              setAssignee(e.target.value);
              setPage(1);
              syncParamsToUrl({ assignee: e.target.value, page: 1 });
            }}
            className="filter-select"
            aria-label="Filter by Assignee"
          >
            <option value="ALL">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {memberList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Clear Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              className="btn-clear-filters"
              onClick={handleClearFilters}
              title="Reset all filters"
            >
              <X size={13} />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="data-table-container">
        {loading ? (
          <SkeletonRows rows={8} columns={7} />
        ) : items.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? 'No work items match current filters' : 'No work items in this workspace'}
            description={
              hasActiveFilters
                ? 'Try adjusting your search query, status, or assignee filters.'
                : 'Get started by creating your first incident or operational ticket.'
            }
            actionLabel={hasActiveFilters ? 'Clear all filters' : 'Create Work Item'}
            onAction={hasActiveFilters ? handleClearFilters : () => setCreateModalOpen(true)}
          />
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>ID</th>
                  <th
                    className="th-sortable"
                    onClick={() => handleSort('title')}
                    title="Sort by Title"
                  >
                    <span>Title & Details</span>
                    <ArrowUpDown size={12} className="th-sort-icon" />
                  </th>
                  <th style={{ width: '120px' }}>Type</th>
                  <th
                    style={{ width: '135px' }}
                    className="th-sortable"
                    onClick={() => handleSort('status')}
                    title="Sort by Status"
                  >
                    <span>Status</span>
                    <ArrowUpDown size={12} className="th-sort-icon" />
                  </th>
                  <th
                    style={{ width: '110px' }}
                    className="th-sortable"
                    onClick={() => handleSort('priority')}
                    title="Sort by Priority"
                  >
                    <span>Priority</span>
                    <ArrowUpDown size={12} className="th-sort-icon" />
                  </th>
                  <th style={{ width: '150px' }}>Assignee</th>
                  <th
                    style={{ width: '100px' }}
                    className="th-sortable"
                    onClick={() => handleSort('dueDate')}
                    title="Sort by Due Date"
                  >
                    <span>Due Date</span>
                    <ArrowUpDown size={12} className="th-sort-icon" />
                  </th>
                  <th
                    style={{ width: '120px' }}
                    className="th-sortable"
                    onClick={() => handleSort('updatedAt')}
                    title="Sort by Last Updated"
                  >
                    <span>Updated</span>
                    <ArrowUpDown size={12} className="th-sort-icon" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="table-row-clickable"
                    onClick={() => navigate(`/work-items/${item.id}`)}
                  >
                    <td className="font-mono text-xs text-secondary">
                      #{item.id.slice(-6).toUpperCase()}
                    </td>
                    <td>
                      <div className="table-title-group">
                        <span className="item-title-cell" title={item.title}>
                          {item.title}
                        </span>
                        {item.description && (
                          <span className="item-desc-cell">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="type-tag">{item.type || 'OPERATIONAL'}</span>
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td className="text-sm text-secondary">
                      {item.assignee?.name || (
                        <span className="text-tertiary">Unassigned</span>
                      )}
                    </td>
                    <td className="text-xs text-secondary">
                      {formatDate(item.dueDate)}
                    </td>
                    <td className="text-xs text-secondary">
                      {formatDateTime(item.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Toolbar */}
            <div className="pagination-bar">
              <div className="pagination-info text-secondary text-sm">
                Showing{' '}
                <strong>
                  {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
                </strong>{' '}
                to{' '}
                <strong>
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </strong>{' '}
                of <strong>{pagination.total}</strong> results
              </div>

              <div className="pagination-controls">
                <div className="pagination-limit-selector">
                  <span className="text-xs text-tertiary">Per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      const newLimit = parseInt(e.target.value, 10);
                      setLimit(newLimit);
                      setPage(1);
                      syncParamsToUrl({ limit: newLimit, page: 1 });
                    }}
                    className="pagination-limit-select"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="pagination-btn-group">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={ChevronLeft}
                    disabled={pagination.page <= 1}
                    onClick={() => {
                      const prevPage = Math.max(1, page - 1);
                      setPage(prevPage);
                      syncParamsToUrl({ page: prevPage });
                    }}
                  >
                    Previous
                  </Button>
                  <span className="pagination-page-indicator text-sm">
                    Page {pagination.page} of {Math.max(1, pagination.totalPages)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={ChevronRight}
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => {
                      const nextPage = page + 1;
                      setPage(nextPage);
                      syncParamsToUrl({ page: nextPage });
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      <CreateWorkItemModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onItemCreated={() => {
          fetchWorkItems(true);
        }}
      />
    </div>
  );
}
