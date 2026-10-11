interface FieldProps {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
  multiline?: boolean;
  type?: "text" | "email" | "password" | "url";
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export default function Field({ label, name, defaultValue = "", hint, multiline = false, type = "text", required = false, placeholder, className = "" }: FieldProps) {
  const rows = Math.min(8, Math.max(2, Math.ceil(defaultValue.length / 60)));
  return (
    <label className={`field ${className}`}>
      <span className="field__label">{label}</span>
      {multiline ? (
        <textarea className="field__input" name={name} defaultValue={defaultValue} rows={rows} placeholder={placeholder} />
      ) : (
        <input className="field__input" name={name} type={type} defaultValue={defaultValue} required={required} placeholder={placeholder} autoComplete={type === "password" ? "current-password" : type === "email" ? "email" : "off"} />
      )}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}
