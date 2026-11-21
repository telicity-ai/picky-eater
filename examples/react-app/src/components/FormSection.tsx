import { useId, type ReactNode } from 'react';
import './FormSection.css';

export interface FormSectionProps {
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

export function FormSection({ title, description, className, children }: FormSectionProps) {
  const headingId = useId();

  return (
    <section
      className={['form-section', className].filter(Boolean).join(' ')}
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="form-section__title">
        {title}
      </h2>
      {description && <p className="form-section__description">{description}</p>}
      <div className="form-section__body">{children}</div>
    </section>
  );
}
