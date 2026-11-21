import { useId, type InputHTMLAttributes } from 'react';
import './Checkbox.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
}

export function Checkbox({
  label,
  hint,
  id,
  className,
  'aria-describedby': extraDescribedBy,
  ...inputProps
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [hintId, extraDescribedBy].filter(Boolean).join(' ') || undefined;

  return (
    <div className={['checkbox', className].filter(Boolean).join(' ')}>
      <input
        {...inputProps}
        id={inputId}
        type="checkbox"
        className="checkbox__input"
        aria-describedby={describedBy}
      />
      <div className="checkbox__text">
        <label className="checkbox__label" htmlFor={inputId}>
          {label}
        </label>
        {hint && (
          <p id={hintId} className="checkbox__hint">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
