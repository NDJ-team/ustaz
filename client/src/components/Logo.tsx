import { Link } from 'react-router-dom';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5" aria-label="USTAZ — на главную">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-teal-500 text-lg font-bold text-white shadow-sm">
        U
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-lg font-bold tracking-tight text-slate-900">USTAZ</span>
          <span className="text-[11px] font-medium text-slate-500">наставничество</span>
        </span>
      )}
    </Link>
  );
}
