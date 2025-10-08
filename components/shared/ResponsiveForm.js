'use client';

import { useState } from 'react';

export default function ResponsiveForm({ 
  title,
  subtitle,
  fields = [],
  onSubmit,
  onCancel,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  loading = false,
  className = "",
  layout = "vertical" // vertical, horizontal, grid
}) {
  const [formData, setFormData] = useState(() => {
    const initial = {};
    fields.forEach(field => {
      initial[field.name] = field.defaultValue || '';
    });
    return initial;
  });

  const [errors, setErrors] = useState({});

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
      
      if (field.validation && formData[field.name]) {
        const validationResult = field.validation(formData[field.name]);
        if (validationResult !== true) {
          newErrors[field.name] = validationResult;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const getLayoutClasses = () => {
    switch (layout) {
      case 'horizontal':
        return 'space-y-4 sm:space-y-6';
      case 'grid':
        return 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6';
      default:
        return 'space-y-4 sm:space-y-6';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md card-responsive ${className}`}>
      {(title || subtitle) && (
        <div className="mb-6 sm:mb-8">
          {title && (
            <h2 className="heading-responsive font-bold text-gray-900 mb-2">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-responsive text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={getLayoutClasses()}>
          {fields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={formData[field.name]}
              error={errors[field.name]}
              onChange={handleChange}
              disabled={loading}
            />
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto button-responsive bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-md transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : (
              submitLabel
            )}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full sm:w-auto button-responsive border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 font-medium rounded-md transition-colors"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function FormField({ field, value, error, onChange, disabled }) {
  const baseInputClasses = `
    w-full px-3 py-2 sm:px-4 sm:py-3 border rounded-md text-sm sm:text-base
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
  `;

  const renderInput = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={field.name}
            name={field.name}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            rows={field.rows || 3}
            className={`${baseInputClasses} resize-none`}
          />
        );
      
      case 'select':
        return (
          <select
            id={field.name}
            name={field.name}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={disabled}
            className={baseInputClasses}
          >
            {field.placeholder && (
              <option value="">{field.placeholder}</option>
            )}
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              id={field.name}
              name={field.name}
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(field.name, e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
            />
            <label htmlFor={field.name} className="ml-2 text-sm sm:text-base text-gray-700">
              {field.label}
            </label>
          </div>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options.map((option) => (
              <div key={option.value} className="flex items-center">
                <input
                  id={`${field.name}-${option.value}`}
                  name={field.name}
                  type="radio"
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  disabled={disabled}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:cursor-not-allowed"
                />
                <label htmlFor={`${field.name}-${option.value}`} className="ml-2 text-sm sm:text-base text-gray-700">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );
      
      default:
        return (
          <input
            id={field.name}
            name={field.name}
            type={field.type || 'text'}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={baseInputClasses}
          />
        );
    }
  };

  if (field.type === 'checkbox') {
    return (
      <div className="space-y-1">
        {renderInput()}
        {error && (
          <p className="text-xs sm:text-sm text-red-600">{error}</p>
        )}
        {field.help && (
          <p className="text-xs sm:text-sm text-gray-500">{field.help}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1 sm:space-y-2">
      <label htmlFor={field.name} className="block text-xs sm:text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
      {error && (
        <p className="text-xs sm:text-sm text-red-600">{error}</p>
      )}
      {field.help && !error && (
        <p className="text-xs sm:text-sm text-gray-500">{field.help}</p>
      )}
    </div>
  );
}

// Utility functions for common field types
export const FieldTypes = {
  text: (name, label, options = {}) => ({
    name,
    label,
    type: 'text',
    required: options.required || false,
    placeholder: options.placeholder,
    help: options.help,
    validation: options.validation,
    defaultValue: options.defaultValue || ''
  }),
  
  email: (name, label, options = {}) => ({
    name,
    label,
    type: 'email',
    required: options.required || false,
    placeholder: options.placeholder || 'Enter email address',
    help: options.help,
    validation: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) || 'Please enter a valid email address';
    },
    defaultValue: options.defaultValue || ''
  }),
  
  password: (name, label, options = {}) => ({
    name,
    label,
    type: 'password',
    required: options.required || false,
    placeholder: options.placeholder || 'Enter password',
    help: options.help,
    validation: options.validation || ((value) => {
      return value.length >= 6 || 'Password must be at least 6 characters';
    }),
    defaultValue: options.defaultValue || ''
  }),
  
  select: (name, label, options, fieldOptions = {}) => ({
    name,
    label,
    type: 'select',
    options,
    required: fieldOptions.required || false,
    placeholder: fieldOptions.placeholder || 'Select an option',
    help: fieldOptions.help,
    defaultValue: fieldOptions.defaultValue || ''
  }),
  
  textarea: (name, label, options = {}) => ({
    name,
    label,
    type: 'textarea',
    required: options.required || false,
    placeholder: options.placeholder,
    help: options.help,
    rows: options.rows || 3,
    validation: options.validation,
    defaultValue: options.defaultValue || ''
  }),
  
  checkbox: (name, label, options = {}) => ({
    name,
    label,
    type: 'checkbox',
    help: options.help,
    defaultValue: options.defaultValue || false
  })
};