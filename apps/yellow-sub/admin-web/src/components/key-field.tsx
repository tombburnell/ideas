import { useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { keyifyFromTitle } from '../lib/slug';

type Props = {
  label: string;
  title: string;
  value: string;
  onChange: (key: string) => void;
  placeholder?: string;
  takenValues?: readonly string[];
};

/** Auto-fills a plan/product-family style key from `title` until the user edits; title edits later do not overwrite. */
export function KeyField({ label, title, value, onChange, placeholder, takenValues }: Props) {
  const userEdited = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (title === '' && value === '') userEdited.current = false;
  }, [title, value]);

  useEffect(() => {
    if (userEdited.current) return;
    onChangeRef.current(keyifyFromTitle(title));
  }, [title]);

  const handleInput = (next: string) => {
    userEdited.current = true;
    onChange(next);
  };

  const taken = takenValues?.includes(value) ?? false;

  return (
    <div>
      <Input
        label={label}
        value={value}
        onChange={(e) => handleInput(e.currentTarget.value)}
        required
        pattern="[a-z0-9_-]+"
        title="Lowercase letters, numbers, hyphens, and underscores"
        placeholder={placeholder ?? 'auto-from-name'}
        className={taken ? 'border-amber-600/80' : undefined}
      />
      {taken && (
        <p className="mt-1 text-xs text-amber-500">This key is already in use for this tenant.</p>
      )}
    </div>
  );
}
