'use client';

import { useState } from 'react';

export default function ResponsiveTable({ 
  data = [], 
  columns = [], 
  loading = false,
  emptyMessage = "No data available",
  onRowClick = null,
  className = "",
  mobileCardView = true 
}) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) {
    return <TableSkeleton columns={columns} />;
  }

  if (!data.length) {
    return (
      <div className="text-center py-8 sm:py-12">
        <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-responsive text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <svg 
                        className={`w-4 h-4 ${
                          sortColumn === column.key 
                            ? 'text-gray-900' 
                            : 'text-gray-400'
                        } ${
                          sortColumn === column.key && sortDirection === 'desc' 
                            ? 'transform rotate-180' 
                            : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row, index) => (
              <tr 
                key={index}
                className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      {mobileCardView && (
        <div className="md:hidden space-y-3">
          {sortedData.map((row, index) => (
            <div 
              key={index}
              className={`bg-white rounded-lg shadow-sm border p-4 ${
                onRowClick ? 'cursor-pointer hover:shadow-md' : ''
              }`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <div key={column.key} className="flex justify-between items-start py-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {column.label}
                  </span>
                  <span className="text-sm text-gray-900 text-right ml-2">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Mobile List View (Alternative) */}
      {!mobileCardView && (
        <div className="md:hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase">
                {data.length} {data.length === 1 ? 'item' : 'items'}
              </span>
              {/* Sort dropdown for mobile */}
              <select 
                className="text-xs border-gray-300 rounded-md"
                onChange={(e) => {
                  const [column, direction] = e.target.value.split('-');
                  setSortColumn(column);
                  setSortDirection(direction);
                }}
              >
                <option value="">Sort by...</option>
                {columns.filter(col => col.sortable).map(column => (
                  <option key={`${column.key}-asc`} value={`${column.key}-asc`}>
                    {column.label} (A-Z)
                  </option>
                ))}
                {columns.filter(col => col.sortable).map(column => (
                  <option key={`${column.key}-desc`} value={`${column.key}-desc`}>
                    {column.label} (Z-A)
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {sortedData.map((row, index) => (
              <div 
                key={index}
                className={`px-4 py-3 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.slice(0, 2).map((column) => (
                  <div key={column.key} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </span>
                  </div>
                ))}
                {columns.length > 2 && (
                  <div className="mt-1 text-xs text-gray-500">
                    {columns.slice(2).map((column, idx) => (
                      <span key={column.key}>
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                        {idx < columns.length - 3 && ' • '}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TableSkeleton({ columns }) {
  return (
    <div className="animate-pulse">
      {/* Desktop skeleton */}
      <div className="hidden md:block">
        <div className="bg-gray-200 h-10 rounded mb-2"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex space-x-4 mb-2">
            {columns.map((_, j) => (
              <div key={j} className="bg-gray-200 h-8 rounded flex-1"></div>
            ))}
          </div>
        ))}
      </div>
      
      {/* Mobile skeleton */}
      <div className="md:hidden space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="space-y-2">
              <div className="bg-gray-200 h-4 rounded w-3/4"></div>
              <div className="bg-gray-200 h-4 rounded w-1/2"></div>
              <div className="bg-gray-200 h-4 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Utility functions for common column types
export const ColumnTypes = {
  text: (key, label, options = {}) => ({
    key,
    label,
    sortable: options.sortable !== false,
    render: options.render
  }),
  
  date: (key, label, options = {}) => ({
    key,
    label,
    sortable: options.sortable !== false,
    render: (value) => {
      if (!value) return '-';
      const date = new Date(value);
      return options.format === 'short' 
        ? date.toLocaleDateString()
        : date.toLocaleString();
    }
  }),
  
  status: (key, label, statusConfig = {}) => ({
    key,
    label,
    sortable: true,
    render: (value) => {
      const config = statusConfig[value] || { color: 'gray', label: value };
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
          {config.label}
        </span>
      );
    }
  }),
  
  actions: (label, actions) => ({
    key: 'actions',
    label,
    sortable: false,
    render: (_, row) => (
      <div className="flex space-x-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick(row);
            }}
            className={`text-xs px-2 py-1 rounded ${action.className || 'text-blue-600 hover:text-blue-800'}`}
            title={action.label}
          >
            {action.icon || action.label}
          </button>
        ))}
      </div>
    )
  })
};