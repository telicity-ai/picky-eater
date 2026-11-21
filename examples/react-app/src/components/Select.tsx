import { useId, type SelectHTMLAttributes } from 'react';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  hint?: string;
}

export function Select({
  label,
  options,
  hint,
  id,
  className,
  'aria-describedby': extraDescribedBy,
  ...selectProps
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const describedBy = [hintId, extraDescribedBy].filter(Boolean).join(' ') || undefined;

  return (
    <div className={['select-field', className].filter(Boolean).join(' ')}>
      <label className="select-field__label" htmlFor={selectId}>
        {label}
      </label>
      <select
        {...selectProps}
        id={selectId}
        className="select-field__control"
        aria-describedby={describedBy}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={hintId} className="select-field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}
