import { FormEvent, useMemo, useState } from 'react';

export type FieldType = 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'url' | 'file' | 'date' | 'time';

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
}

export interface FormSectionConfig {
  title: string;
  fields: FieldConfig[];
}

interface RegisterFormProps {
  title: string;
  subtitle: string;
  sections: FormSectionConfig[];
  onSubmit: (values: Record<string, string | string[]>) => void;
}

function getDefaultValue(field: FieldConfig) {
  if (field.type === 'multiselect') return [] as string[];
  if (field.type === 'select' && field.options?.length) return field.options[0];
  return '';
}

export function RegisterForm({ title, subtitle, sections, onSubmit }: RegisterFormProps) {
  const initialState = useMemo(() => {
    return sections.reduce<Record<string, string | string[]>>((acc, section) => {
      section.fields.forEach((field) => {
        acc[field.name] = getDefaultValue(field);
      });
      return acc;
    }, {});
  }, [sections]);

  const [values, setValues] = useState<Record<string, string | string[]>>(initialState);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(values);
    setSubmitted(true);
  };

  const updateValue = (name: string, value: string | string[]) => setValues((prev) => ({ ...prev, [name]: value }));

  return (
    <form className="page-shell" onSubmit={handleSubmit}>
      <section className="hero-panel compact-hero">
        <div>
          <span className="eyebrow">Registration Form</span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {submitted && (
          <div className="status-card soft-green">
            <strong>フロント内ダミー登録を保存しました</strong>
            <p>一覧・地図・おすすめに反映されます。ログインやDB接続はまだ不要です。</p>
          </div>
        )}
      </section>

      {sections.map((section) => (
        <section className="panel form-panel" key={section.title}>
          <h3>{section.title}</h3>
          <div className="field-grid two-column">
            {section.fields.map((field) => (
              <FieldRenderer key={field.name} field={field} value={values[field.name]} onChange={(value) => updateValue(field.name, value)} />
            ))}
          </div>
        </section>
      ))}

      <div className="cta-bar">
        <button type="submit" className="primary-button">登録内容を反映する</button>
      </div>
    </form>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}) {
  if (field.type === 'textarea') {
    return (
      <label className="field full-width">
        <span>{field.label}</span>
        <textarea rows={4} value={String(value)} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className="field">
        <span>{field.label}</span>
        <select value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
    );
  }

  if (field.type === 'multiselect') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="field full-width">
        <span>{field.label}</span>
        <div className="chip-grid compact">
          {field.options?.map((option) => {
            const active = selected.includes(option);
            return (
              <button
                type="button"
                key={option}
                className={active ? 'select-chip active' : 'select-chip'}
                onClick={() => onChange(active ? selected.filter((item) => item !== option) : [...selected, option])}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === 'file') {
    return (
      <label className="field">
        <span>{field.label}</span>
        <input type="file" onChange={(e) => onChange(e.target.files?.[0]?.name || '')} />
      </label>
    );
  }

  return (
    <label className="field">
      <span>{field.label}</span>
      <input
        type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}
        value={String(value)}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
