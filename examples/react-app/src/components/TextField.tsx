import { useId, type InputHTMLAttributes } from 'react';
import './TextField.css';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({
  label,
  hint,
  error,
  id,
  className,
  type = 'text',
  'aria-describedby': extraDescribedBy,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId, extraDescribedBy].filter(Boolean).join(' ') || undefined;

  return (
    <div className={['text-field', error && 'text-field--invalid', className].filter(Boolean).join(' ')}>
      <label className="text-field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        {...inputProps}
        id={inputId}
        type={type}
        className="text-field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint && (
        <p id={hintId} className="text-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-field__error">
          {error}
        </p>
      )}
    </div>
  );
}
