'use client';

import { useState } from 'react';
import ErrorMessage from './ErrorMessage';

export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  placeholder,
  options = [], // for select fields
  className = '',
  helpText,
  validate,
  children
}) {
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleBlur = (e) => {
    setTouched(true);
    
    // Run validation if provided
    if (validate && value) {
      const validationError = validate(value);
      setLocalError(validationError || '');
    }
    
    if (onBlur) {
      onBlur(e);
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    
    // Clear local error when user starts typing
    if (localError) {
      setLocalError('');
    }
    
    // Run validation if field has been touched
    if (touched && validate) {
      const validationError = validate(newValue);
      setLocalError(validationError || '');
    }
    
    if (onChange) {
      onChange(e);
    }
  };

  const displayError = error || (touched && localError);
  const fieldId = `field-${name}`;

  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    ${displayError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    ${className}
  `.trim();

  const renderInput = () => {
    if (type === 'select') {
      return (
        <select
          id={fieldId}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          className={baseInputClasses}
          aria-describedby={displayError ? `${fieldId}-error` : undefined}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          id={fieldId}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={`${baseInputClasses} min-h-[100px] resize-vertical`}
          aria-describedby={displayError ? `${fieldId}-error` : undefined}
        />
      );
    }

    if (type === 'checkbox') {
      return (
        <div className="flex items-center">
          <input
            id={fieldId}
            name={name}
            type="checkbox"
            checked={value}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            required={required}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            aria-describedby={displayError ? `${fieldId}-error` : undefined}
          />
          <label htmlFor={fieldId} className="ml-2 block text-sm text-gray-900">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        </div>
      );
    }

    return (
      <input
        id={fieldId}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className={baseInputClasses}
        aria-describedby={displayError ? `${fieldId}-error` : undefined}
      />
    );
  };

  if (type === 'checkbox') {
    return (
      <div className="mb-4">
        {renderInput()}
        {helpText && (
          <p className="mt-1 text-sm text-gray-500">{helpText}</p>
        )}
        {displayError && (
          <div id={`${fieldId}-error`} className="mt-1">
            <ErrorMessage message={displayError} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {children || renderInput()}
      
      {helpText && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
      
      {displayError && (
        <div id={`${fieldId}-error`} className="mt-1">
          <ErrorMessage message={displayError} />
        </div>
      )}
    </div>
  );
}