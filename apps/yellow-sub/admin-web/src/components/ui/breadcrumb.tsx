import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type Crumb = { label: string; to?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={14} className="text-zinc-600" />}
          {item.to ? (
            <Link to={item.to} className="text-zinc-400 hover:text-white">
              {item.label}
            </Link>
          ) : (
            <span className="text-zinc-200">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
