import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFeatures, useUpdateFeature } from '../hooks/use-admin';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { Input, Textarea } from './ui/input';
import { Select } from './ui/select';
import { useToast } from './ui/toast';
import type { Feature } from '../lib/types';

/** Opens "Edit feature" from overview URL params without switching tabs. */
export function OverviewFeatureEditFromUrl({ tenantId }: { tenantId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const editFeatureId = searchParams.get('overviewEditFeature');
  const featureFamily = searchParams.get('overviewFeatureFamily');
  const families = useFeatures(tenantId, featureFamily ?? undefined, {
    enabledWhenFamilyMissing: false,
  });
  const updateFeature = useUpdateFeature(tenantId);

  const [editFeature, setEditFeature] = useState<Feature | null>(null);
  const [eName, setEName] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eActive, setEActive] = useState(true);
  const [eType, setEType] = useState<'BOOLEAN' | 'LIMIT' | 'CONFIG'>('BOOLEAN');
  const [eUnitLabel, setEUnitLabel] = useState('');
  const [eConfigType, setEConfigType] = useState<'INTEGER' | 'ENUM' | 'MONEY'>('INTEGER');
  const [eConfigOptions, setEConfigOptions] = useState('');

  const consumedRef = useRef(false);

  useEffect(() => {
    consumedRef.current = false;
  }, [tenantId, editFeatureId]);

  useEffect(() => {
    if (!editFeatureId || !featureFamily || consumedRef.current || families.isLoading) return;
    const f = families.data?.find((x) => x.id === editFeatureId);
    if (!f) return;
    consumedRef.current = true;
    setEditFeature(f);
    setEName(f.name);
    setEDesc(f.description ?? '');
    setEActive(f.active);
    setEType(f.type ?? 'BOOLEAN');
    setEUnitLabel(f.unitLabel ?? '');
    setEConfigType(f.configType ?? 'INTEGER');
    setEConfigOptions(Array.isArray(f.configOptions) ? f.configOptions.join(', ') : '');
    const next = new URLSearchParams(searchParams);
    next.delete('overviewEditFeature');
    next.delete('overviewFeatureFamily');
    setSearchParams(next, { replace: true });
  }, [editFeatureId, featureFamily, families.data, families.isLoading, searchParams, setSearchParams]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFeature) return;
    try {
      await updateFeature.mutateAsync({
        id: editFeature.id,
        name: eName,
        description: eDesc || undefined,
        active: eActive,
        type: eType,
        unitLabel: eType === 'LIMIT' || (eType === 'CONFIG' && (eConfigType === 'INTEGER' || eConfigType === 'MONEY'))
          ? eUnitLabel || undefined
          : undefined,
        configType: eType === 'CONFIG' ? eConfigType : undefined,
        configOptions: eType === 'CONFIG' && eConfigType === 'ENUM'
          ? eConfigOptions.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      toast('Feature updated');
      setEditFeature(null);
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  if (!editFeature) return null;

  return (
    <Dialog open onClose={() => setEditFeature(null)} title="Edit Feature">
      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="space-y-1 rounded-md bg-zinc-900 px-3 py-2">
          <div>
            <span className="text-xs text-zinc-500">Family: </span>
            <span className="text-xs text-zinc-300">{editFeature.productFamily?.name ?? '—'}</span>
          </div>
          <div>
            <span className="text-xs text-zinc-500">Key: </span>
            <code className="text-xs text-zinc-300">{editFeature.key}</code>
          </div>
        </div>
        <Input label="Name" value={eName} onChange={(e) => setEName(e.currentTarget.value)} required autoFocus />
        <Select
          label="Type"
          value={eType}
          onChange={(e) => setEType(e.currentTarget.value as 'BOOLEAN' | 'LIMIT' | 'CONFIG')}
          options={[
            { value: 'BOOLEAN', label: 'Boolean (on/off)' },
            { value: 'LIMIT', label: 'Limit (quantified)' },
            { value: 'CONFIG', label: 'Configuration (value per plan)' },
          ]}
        />
        {eType === 'LIMIT' && (
          <Input label="Unit Label" value={eUnitLabel} onChange={(e) => setEUnitLabel(e.currentTarget.value)} placeholder="API calls, profiles, GB" />
        )}
        {eType === 'CONFIG' && (
          <>
            <Select
              label="Config Type"
              value={eConfigType}
              onChange={(e) => setEConfigType(e.currentTarget.value as 'INTEGER' | 'ENUM' | 'MONEY')}
              options={[
                { value: 'INTEGER', label: 'Integer' },
                { value: 'MONEY', label: 'Money (amount in a currency)' },
                { value: 'ENUM', label: 'Enum (list of options)' },
              ]}
            />
            {(eConfigType === 'INTEGER' || eConfigType === 'MONEY') && (
              <Input
                label="Unit Label (optional)"
                value={eUnitLabel}
                onChange={(e) => setEUnitLabel(e.currentTarget.value)}
                placeholder={eConfigType === 'MONEY' ? 'e.g. AI credits' : 'e.g. GB — shown after the number'}
              />
            )}
            {eConfigType === 'ENUM' && (
              <Input label="Options (comma-separated)" value={eConfigOptions} onChange={(e) => setEConfigOptions(e.currentTarget.value)} placeholder="email, chat, phone" />
            )}
          </>
        )}
        <Textarea label="Description" value={eDesc} onChange={(e) => setEDesc(e.currentTarget.value)} />
        <Select
          label="Status"
          value={eActive ? 'active' : 'inactive'}
          onChange={(e) => setEActive(e.currentTarget.value === 'active')}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive (Retired)' },
          ]}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditFeature(null)}>Cancel</Button>
          <Button type="submit" size="sm" disabled={updateFeature.isPending}>{updateFeature.isPending ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Dialog>
  );
}
