import { useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { slugifyFromTitle } from '../lib/slug';

type Props = {
  label: string;
  title: string;
  value: string;
  onChange: (slug: string) => void;
  placeholder?: string;
  /** Other slugs/keys in the same scope (e.g. same tenant) — highlights if current value collides */
  takenValues?: readonly string[];
};

/**
 * Auto-fills from `title` until the user edits this field; later title changes do not overwrite the slug.
 */
export function SlugField({ label, title, value, onChange, placeholder, takenValues }: Props) {
  const userEditedSlug = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (title === '' && value === '') userEditedSlug.current = false;
  }, [title, value]);

  useEffect(() => {
    if (userEditedSlug.current) return;
    onChangeRef.current(slugifyFromTitle(title));
  }, [title]);

  const handleSlugInput = (next: string) => {
    userEditedSlug.current = true;
    onChange(next);
  };

  const taken = takenValues?.includes(value) ?? false;

  return (
    <div>
      <Input
        label={label}
        value={value}
        onChange={(e) => handleSlugInput(e.currentTarget.value)}
        required
        pattern="[a-z0-9-]+"
        title="Lowercase letters, numbers, and hyphens only"
        placeholder={placeholder ?? 'auto-from-title'}
        className={taken ? 'border-amber-600/80' : undefined}
      />
      {taken && (
        <p className="mt-1 text-xs text-amber-500">This value is already in use. Choose another.</p>
      )}
    </div>
  );
}
