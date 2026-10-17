import React, { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  {
    label,
    id,
    type = 'text',
    error,
    helperText,
    required = false,
    className = '',
    icon: Icon,
    endAdornment,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`form-field ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {Icon && (
          <span className="input-prefix-icon">
            <Icon size={16} />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`form-input ${Icon ? 'has-prefix' : ''} ${endAdornment ? 'has-suffix' : ''} ${error ? 'is-invalid' : ''}`}
          {...props}
        />
        {endAdornment && <div className="input-suffix-adornment">{endAdornment}</div>}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="form-error-msg" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && <p className="form-helper-msg">{helperText}</p>}
    </div>
  );
});

export const Select = forwardRef(function Select(
  {
    label,
    id,
    options = [],
    error,
    helperText,
    required = false,
    className = '',
    placeholder,
    children,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`form-field ${className}`.trim()}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={!!error}
        className={`form-select ${error ? 'is-invalid' : ''}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
      {error && (
        <p className="form-error-msg" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && <p className="form-helper-msg">{helperText}</p>}
    </div>
  );
});
