
import React, { useState, useMemo } from 'react';
import { Eye, EyeOff, Copy, Search, Calendar, StickyNote, Download, ArrowUpDown, Folder, List, Grid, ArrowUp, ArrowDown, Filter, X, CalendarDays, Pencil, Check, Save, FolderInput } from 'lucide-react';
import { CredentialRecord } from '../types';
import { api } from '../services/api';

interface HistoryTableProps {
  records: CredentialRecord[];
  isLoading: boolean;
  onRefresh: () => void;
}

type SortKey = 'created_at' | 'username' | 'group' | 'remark';
interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ records, isLoading, onRefresh }) => {
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // View & Sort State
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });

  // Advanced Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterGroup, setFilterGroup] = useState('');

  // Editing State
  const [editingRecord, setEditingRecord] = useState<CredentialRecord | null>(null);
  const [editForm, setEditForm] = useState<{ group: string; remark: string }>({ group: '', remark: '' });
  
  // Bulk Group State
  const [isBulkGrouping, setIsBulkGrouping] = useState(false);
  const [bulkGroupInput, setBulkGroupInput] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const toggleVisibility = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleBulkGroupSave = async () => {
      setIsSaving(true);
      try {
          await api.updateRecords(selectedIds, { group: bulkGroupInput });
          setIsBulkGrouping(false);
          setSelectedIds([]);
          setBulkGroupInput('');
          onRefresh();
      } catch (error) {
          console.error("Failed to update groups", error);
          alert("Failed to update groups for selected records.");
      } finally {
          setIsSaving(false);
      }
  };

  // Edit Handlers
  const handleEditClick = (record: CredentialRecord) => {
    setEditingRecord(record);
    setEditForm({
        group: record.group || '',
        remark: record.remark || ''
    });
  };

  const handleEditSave = async () => {
      if (!editingRecord) return;
      setIsSaving(true);
      try {
          await api.updateRecord(editingRecord.id, editForm);
          setEditingRecord(null);
          onRefresh();
      } catch (error) {
          console.error("Failed to update record", error);
          alert("Failed to update record.");
      } finally {
          setIsSaving(false);
      }
  };

  // Quick Date Selectors
  const applyDatePreset = (type: 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth') => {
      const end = new Date();
      const start = new Date();
      
      switch(type) {
          case 'today':
              // start and end are today
              break;
          case 'yesterday':
              start.setDate(start.getDate() - 1);
              end.setDate(end.getDate() - 1);
              break;
          case 'last7':
              start.setDate(start.getDate() - 7);
              break;
          case 'last30':
              start.setDate(start.getDate() - 30);
              break;
          case 'thisMonth':
              start.setDate(1);
              break;
      }
      
      setFilterDateStart(start.toISOString().split('T')[0]);
      setFilterDateEnd(end.toISOString().split('T')[0]);
  };

  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    records.forEach(r => {
        if (r.group) groups.add(r.group);
    });
    return Array.from(groups).sort();
  }, [records]);

  const processedRecords = useMemo(() => {
    let data = records.filter(r => {
      // 1. Text Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        searchTerm === '' ||
        r.username.toLowerCase().includes(searchLower) ||
        r.id.toLowerCase().includes(searchLower) ||
        (r.remark && r.remark.toLowerCase().includes(searchLower)) ||
        (r.group && r.group.toLowerCase().includes(searchLower));

      // 2. Group Filter (Strict)
      const matchesGroup = filterGroup === '' || r.group === filterGroup;

      // 3. Date Filter
      let matchesDate = true;
      if (filterDateStart || filterDateEnd) {
        // Normalize record date to YYYY-MM-DD for comparison
        const recordDateStr = new Date(r.created_at).toISOString().split('T')[0];
        
        if (filterDateStart) {
          matchesDate = matchesDate && recordDateStr >= filterDateStart;
        }
        if (filterDateEnd) {
          matchesDate = matchesDate && recordDateStr <= filterDateEnd;
        }
      }

      return matchesSearch && matchesGroup && matchesDate;
    });

    if (sortConfig) {
      data.sort((a, b) => {
        let aVal = a[sortConfig.key] || '';
        let bVal = b[sortConfig.key] || '';
        
        if (sortConfig.key === 'created_at') {
             return sortConfig.direction === 'asc' 
                ? new Date(aVal).getTime() - new Date(bVal).getTime()
                : new Date(bVal).getTime() - new Date(aVal).getTime();
        }

        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }
    return data;
  }, [records, searchTerm, sortConfig, filterGroup, filterDateStart, filterDateEnd]);

  const groupedRecords = useMemo(() => {
    const groups: Record<string, CredentialRecord[]> = {};
    processedRecords.forEach(record => {
      const groupName = record.group || 'Uncategorized';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(record);
    });
    return groups;
  }, [processedRecords]);

  const handleExportCSV = () => {
    const headers = ['Username', 'Group', 'Remark', 'Created At'];
    const csvContent = [
        headers.join(','),
        ...processedRecords.map(r => {
            const escape = (field: string) => {
                const str = String(field || '');
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };
            return [
                escape(r.username),
                escape(r.group || ''),
                escape(r.remark || ''),
                escape(new Date(r.created_at).toLocaleString())
            ].join(',');
        })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `securegen_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Selection Logic
  const toggleSelectAll = () => {
      const visibleIds = processedRecords.map(r => r.id);
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
      
      if (allVisibleSelected) {
          setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
      } else {
          const newSet = new Set([...selectedIds, ...visibleIds]);
          setSelectedIds(Array.from(newSet));
      }
  };

  const toggleSelectOne = (id: string) => {
      if (selectedIds.includes(id)) {
          setSelectedIds(prev => prev.filter(sid => sid !== id));
      } else {
          setSelectedIds(prev => [...prev, id]);
      }
  };

  const allFilteredSelected = processedRecords.length > 0 && processedRecords.every(r => selectedIds.includes(r.id));

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 text-gray-300 ml-1 inline" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-indigo-600 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 text-indigo-600 ml-1 inline" />;
  };

  const ActiveFilters = () => {
    const hasFilters = searchTerm || filterGroup || filterDateStart || filterDateEnd;
    if (!hasFilters) return null;

    return (
      <div className="flex flex-wrap gap-2 px-6 pb-4 animate-in fade-in slide-in-from-top-1">
        <span className="text-xs font-medium text-gray-500 self-center mr-2">Active Filters:</span>
        
        {searchTerm && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
            Search: "{searchTerm}"
            <button onClick={() => setSearchTerm('')} className="hover:text-indigo-900"><X className="w-3 h-3" /></button>
          </span>
        )}

        {filterGroup && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
            Group: {filterGroup}
            <button onClick={() => setFilterGroup('')} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
          </span>
        )}

        {(filterDateStart || filterDateEnd) && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
            <CalendarDays className="w-3 h-3" />
            {filterDateStart || '...'} to {filterDateEnd || '...'}
            <button onClick={() => { setFilterDateStart(''); setFilterDateEnd(''); }} className="hover:text-emerald-900"><X className="w-3 h-3" /></button>
          </span>
        )}

        <button 
            onClick={() => { setSearchTerm(''); setFilterGroup(''); setFilterDateStart(''); setFilterDateEnd(''); }}
            className="text-xs text-gray-400 hover:text-red-600 underline ml-auto"
        >
            Clear All
        </button>
      </div>
    );
  };

  const TableHeader = () => (
    <thead>
      <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 font-medium border-b border-gray-100">
        <th className="px-6 py-4 w-12 text-center">
            <input 
                type="checkbox" 
                checked={allFilteredSelected} 
                onChange={toggleSelectAll}
                disabled={processedRecords.length === 0}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
            />
        </th>
        <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 select-none" onClick={() => handleSort('created_at')}>
          Created At <SortIcon column="created_at" />
        </th>
        <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 select-none" onClick={() => handleSort('username')}>
          Username <SortIcon column="username" />
        </th>
        <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 select-none" onClick={() => handleSort('group')}>
          Group <SortIcon column="group" />
        </th>
        <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 select-none" onClick={() => handleSort('remark')}>
          Remark <SortIcon column="remark" />
        </th>
        <th className="px-6 py-4">Password</th>
        <th className="px-6 py-4 text-right">Actions</th>
      </tr>
    </thead>
  );

  const RecordRow = ({ record }: { record: CredentialRecord }) => (
    <tr className={`hover:bg-gray-50/50 transition-colors group ${selectedIds.includes(record.id) ? 'bg-indigo-50/30' : ''}`}>
      <td className="px-6 py-4 text-center">
          <input 
              type="checkbox" 
              checked={selectedIds.includes(record.id)} 
              onChange={() => toggleSelectOne(record.id)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
          />
      </td>
      <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(record.created_at).toLocaleString()}
        </div>
      </td>
      <td className="px-6 py-4 text-gray-900 font-medium text-sm">
        {record.username}
      </td>
      <td className="px-6 py-4 text-gray-600 text-sm">
        {record.group ? (
          <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-600">
             <Folder className="w-3 h-3" /> {record.group}
          </span>
        ) : (
          <span className="text-gray-300 italic">-</span>
        )}
      </td>
      <td className="px-6 py-4 text-gray-600 text-sm">
        {record.remark ? (
          <span className="flex items-center gap-1">
              <StickyNote className="w-3 h-3 text-gray-400" /> {record.remark}
          </span>
        ) : (
          <span className="text-gray-300 italic">-</span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 max-w-[200px]">
          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-700 truncate">
            {visiblePasswords[record.id] ? record.password_plain : '••••••••••••••••'}
          </code>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex justify-end items-center gap-2">
           <button
            onClick={() => handleCopy(record.password_plain)}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
            title="Copy Password"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleVisibility(record.id)}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
            title={visiblePasswords[record.id] ? "Hide Password" : "Show Password"}
          >
            {visiblePasswords[record.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={() => handleEditClick(record)}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
            title="Edit Record"
          >
             <Pencil className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="w-full max-w-6xl mx-auto mt-12 relative">
      
      {/* Edit Modal Overlay */}
      {editingRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4 animate-in zoom-in-95 duration-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Pencil className="w-5 h-5 text-indigo-600" /> Edit Record
                  </h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                          <div className="px-3 py-2 bg-gray-100 rounded text-gray-600 text-sm font-mono">
                              {editingRecord.username}
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Group</label>
                          <input 
                              type="text"
                              value={editForm.group}
                              onChange={(e) => setEditForm({...editForm, group: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                              placeholder="e.g. Work"
                              list="groups-list-edit"
                          />
                          <datalist id="groups-list-edit">
                              {uniqueGroups.map(g => <option key={g} value={g} />)}
                          </datalist>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Remark</label>
                          <textarea 
                              value={editForm.remark}
                              onChange={(e) => setEditForm({...editForm, remark: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[80px]"
                              placeholder="Add notes here..."
                          />
                      </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                      <button 
                          onClick={() => setEditingRecord(null)}
                          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={handleEditSave}
                          disabled={isSaving}
                          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                      >
                          {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Bulk Group Modal */}
      {isBulkGrouping && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4 animate-in zoom-in-95 duration-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FolderInput className="w-5 h-5 text-indigo-600" /> Bulk Set Group
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-4">
                      You are setting the group for <span className="font-bold text-indigo-600">{selectedIds.length}</span> selected record(s).
                  </p>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">New Group Name</label>
                          <input 
                              type="text"
                              value={bulkGroupInput}
                              onChange={(e) => setBulkGroupInput(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                              placeholder="e.g. Work, Archive, Personal"
                              autoFocus
                              list="groups-list-bulk"
                          />
                           <datalist id="groups-list-bulk">
                              {uniqueGroups.map(g => <option key={g} value={g} />)}
                          </datalist>
                      </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                      <button 
                          onClick={() => { setIsBulkGrouping(false); setBulkGroupInput(''); }}
                          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={handleBulkGroupSave}
                          disabled={isSaving}
                          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                      >
                          {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Apply Group</>}
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b border-gray-100 flex flex-col gap-4">
          
          {/* Title & View Toggles */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">Generation History</h3>
                  <div className="flex bg-gray-100 p-0.5 rounded-lg ml-2">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1 rounded ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      title="List View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('grouped')}
                      className={`p-1 rounded ${viewMode === 'grouped' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      title="Grouped View"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">View and manage your secure credentials.</p>
            </div>

             {/* Bulk Action Header Mode */}
            {selectedIds.length > 0 && (
                <div className="bg-indigo-50 rounded-xl px-4 py-2 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm border border-indigo-100">
                    <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {selectedIds.length}
                        </span>
                        <span className="text-indigo-900 font-medium text-sm">Selected</span>
                    </div>
                    <div className="h-4 w-px bg-indigo-200"></div>
                    <button 
                        onClick={() => setSelectedIds([])}
                        className="text-indigo-600 text-xs font-medium hover:underline"
                    >
                        Cancel
                    </button>
                    
                    <div className="flex items-center gap-2 ml-2">
                        <button 
                            onClick={() => setIsBulkGrouping(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white text-indigo-600 text-xs font-bold rounded border border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm"
                        >
                            <FolderInput className="w-3 h-3" /> Set Group
                        </button>
                    </div>
                </div>
            )}
          </div>

          {/* Search & Toolbar Row */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
             {/* Search Bar */}
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search username, remark..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm"
                />
              </div>
              
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>

              {/* Actions */}
              <div className="flex gap-2">
                {records.length > 0 && (
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                        title="Export to CSV"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden lg:inline">Export</span>
                    </button>
                )}
              </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-xl border border-gray-200 shadow-lg shadow-indigo-500/5 animate-in fade-in slide-in-from-top-2 mt-2">
                <div className="col-span-1 md:col-span-2 flex flex-col gap-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <CalendarDays className="w-4 h-4 text-indigo-600" />
                        Filter by Date Range
                    </label>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                            <span className="text-xs font-bold text-gray-400 uppercase mr-2">From</span>
                            <input 
                                type="date" 
                                value={filterDateStart}
                                onChange={(e) => setFilterDateStart(e.target.value)}
                                className="flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none cursor-pointer"
                            />
                        </div>
                        <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                            <span className="text-xs font-bold text-gray-400 uppercase mr-2">To</span>
                            <input 
                                type="date" 
                                value={filterDateEnd}
                                onChange={(e) => setFilterDateEnd(e.target.value)}
                                className="flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap mt-1">
                         {[
                            { label: 'Today', val: 'today' },
                            { label: 'Yesterday', val: 'yesterday' },
                            { label: 'Last 7 Days', val: 'last7' },
                            { label: 'This Month', val: 'thisMonth' },
                        ].map((preset) => (
                            <button 
                                key={preset.val}
                                onClick={() => applyDatePreset(preset.val as any)} 
                                className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-600 font-medium rounded-full hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all active:scale-95 shadow-sm"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                         <Folder className="w-4 h-4 text-indigo-600" />
                         Filter by Group
                    </label>
                    <div className="relative">
                        <select 
                            value={filterGroup}
                            onChange={(e) => setFilterGroup(e.target.value)}
                            className="w-full appearance-none px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                            <option value="">All Groups</option>
                            {uniqueGroups.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                             <ArrowDown className="w-4 h-4" />
                        </div>
                    </div>
                </div>
              </div>
          )}
        </div>

        {/* Active Filters Bar */}
        <ActiveFilters />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {viewMode === 'list' ? (
              <>
                <TableHeader />
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading records...</td>
                    </tr>
                  ) : processedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                              <Search className="w-8 h-8 text-gray-200" />
                              <p>No records found matching your filters.</p>
                          </div>
                      </td>
                    </tr>
                  ) : (
                    processedRecords.map((record) => <RecordRow key={record.id} record={record} />)
                  )}
                </tbody>
              </>
            ) : (
              // GROUPED VIEW
              <>
                 {isLoading ? (
                    <tbody className="divide-y divide-gray-100">
                        <tr><td className="px-6 py-12 text-center text-gray-500">Loading records...</td></tr>
                    </tbody>
                 ) : processedRecords.length === 0 ? (
                    <tbody className="divide-y divide-gray-100">
                        <tr><td className="px-6 py-12 text-center text-gray-400">No records found matching your filters.</td></tr>
                    </tbody>
                 ) : (
                    Object.entries(groupedRecords).map(([groupName, groupRecords]) => (
                        <React.Fragment key={groupName}>
                            <thead>
                                <tr className="bg-gray-100/80">
                                    <th colSpan={7} className="px-6 py-3 text-sm font-bold text-indigo-900 flex items-center gap-2 border-y border-gray-200">
                                        <Folder className="w-4 h-4 text-indigo-500" />
                                        {groupName} 
                                        <span className="text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full ml-2 border border-gray-200">
                                            {groupRecords.length}
                                        </span>
                                    </th>
                                </tr>
                                <tr className="bg-gray-50/30 text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                                    {/* Simplified header for subgroups */}
                                    <th className="px-6 py-2 w-12"></th>
                                    <th className="px-6 py-2">Created At</th>
                                    <th className="px-6 py-2">Username</th>
                                    <th className="px-6 py-2">Group</th>
                                    <th className="px-6 py-2">Remark</th>
                                    <th className="px-6 py-2">Password</th>
                                    <th className="px-6 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 border-b border-gray-200 mb-4">
                                {groupRecords.map(record => <RecordRow key={record.id} record={record} />)}
                            </tbody>
                        </React.Fragment>
                    ))
                 )}
              </>
            )}
          </table>
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 flex justify-between items-center">
            <span>Showing {processedRecords.length} records</span>
            <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Database Connected (Mock/Real)
            </span>
        </div>
      </div>
    </div>
  );
};
