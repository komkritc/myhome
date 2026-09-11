interface InputProps {
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: string | number;
  inputMode?: 'text' | 'decimal' | 'numeric' | 'none';
  className?: string;
  label?: string;
  disabled?: boolean;
}

export default function Input({
  type = 'text', value, onChange, placeholder, required, min, max, step, inputMode, label, disabled,
}: InputProps) {
  const inputEl = (
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} required={required} min={min} max={max} step={step}
      inputMode={inputMode} aria-label={placeholder} disabled={disabled}
      className="input"
    />
  );

  if (label) {
    return (
      <div>
        <label className="input-label">{label}</label>
        {inputEl}
      </div>
    );
  }

  return inputEl;
}
