import type { ReactNode } from 'react';

/** Short alphanumeric-ish units glue tight (e.g. 5Gb); longer labels get a space. */
function useTightUnitGlue(unit: string): boolean {
  return unit.length <= 4 && !/\s/.test(unit);
}

/**
 * Renders included limit: amount (emphasis) + unit + suffix, unit and suffix muted.
 */
export function formatIncludedLimitFragment(
  amount: number,
  unit: string | undefined | null,
  suffix: 'incl.' | 'included',
): ReactNode {
  const n = amount.toLocaleString();
  const u = unit?.trim();
  if (!u) {
    return (
      <>
        {n}{' '}
        <span className="text-zinc-500">{suffix}</span>
      </>
    );
  }
  const tight = useTightUnitGlue(u);
  return (
    <>
      {n}
      {tight ? (
        <span className="text-zinc-500">{u}</span>
      ) : (
        <>
          {' '}
          <span className="text-zinc-500">{u}</span>
        </>
      )}{' '}
      <span className="text-zinc-500">{suffix}</span>
    </>
  );
}
