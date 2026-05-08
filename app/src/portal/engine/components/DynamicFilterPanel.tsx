/**
 * DynamicFilterPanel — auto-generated filter UI from component schema
 * dimensions. Each dimension becomes a filter row with an operator
 * selector and the appropriate value input.
 */

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { FilterDimension, FilterOperator, FilterState } from '../types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DynamicFilterPanelProps {
  dimensions: FilterDimension[];
  values: FilterState[];
  onChange: (filters: FilterState[]) => void;
  locale: 'en' | 'ar';
}

// ---------------------------------------------------------------------------
// Operator display labels
// ---------------------------------------------------------------------------

const OPERATOR_DISPLAY: Record<FilterOperator, { en: string; ar: string }> = {
  eq: { en: '=', ar: '=' },
  neq: { en: '\u2260', ar: '\u2260' },
  in: { en: 'in', ar: '\u0636\u0645\u0646' },
  gt: { en: '>', ar: '>' },
  lt: { en: '<', ar: '<' },
  gte: { en: '\u2265', ar: '\u2265' },
  lte: { en: '\u2264', ar: '\u2264' },
  between: { en: 'between', ar: '\u0628\u064A\u0646' },
  contains: { en: 'contains', ar: '\u064A\u062D\u062A\u0648\u064A' },
  overlaps: { en: 'overlaps', ar: '\u064A\u062A\u062F\u0627\u062E\u0644' },
  all_of: { en: 'all of', ar: '\u0643\u0644' },
  matches: { en: 'matches', ar: '\u064A\u0637\u0627\u0628\u0642' },
  exists: { en: 'exists', ar: '\u0645\u0648\u062C\u0648\u062F' },
};

// ---------------------------------------------------------------------------
// Single filter row
// ---------------------------------------------------------------------------

interface FilterRowProps {
  dimensions: FilterDimension[];
  filter: FilterState;
  index: number;
  locale: 'en' | 'ar';
  onUpdate: (index: number, updated: FilterState) => void;
  onRemove: (index: number) => void;
}

function FilterRow({ dimensions, filter, index, locale, onUpdate, onRemove }: FilterRowProps) {
  const dimension = dimensions.find((d) => d.field === filter.field);
  const availableOperators = dimension?.operators ?? ['eq'];

  const handleFieldChange = (field: string) => {
    const dim = dimensions.find((d) => d.field === field);
    const defaultOp = dim?.operators[0] ?? 'eq';
    onUpdate(index, { field, operator: defaultOp, value: '' });
  };

  const handleOperatorChange = (operator: string) => {
    onUpdate(index, { ...filter, operator: operator as FilterOperator });
  };

  const handleValueChange = (value: unknown) => {
    onUpdate(index, { ...filter, value });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Field selector */}
      <Select value={filter.field} onValueChange={handleFieldChange}>
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder={locale === 'ar' ? '\u0627\u062E\u062A\u0631 \u062D\u0642\u0644' : 'Select field'} />
        </SelectTrigger>
        <SelectContent>
          {dimensions.map((dim) => (
            <SelectItem key={dim.field} value={dim.field}>
              {locale === 'ar' ? dim.label_ar : dim.label_en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select value={filter.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="w-[100px] h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableOperators.map((op) => (
            <SelectItem key={op} value={op}>
              {OPERATOR_DISPLAY[op]?.[locale] ?? op}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input — rendered based on dimension inputType */}
      <ValueInput
        dimension={dimension}
        value={filter.value}
        operator={filter.operator}
        locale={locale}
        onChange={handleValueChange}
      />

      {/* Remove */}
      <Button
        variant="ghost"
        size="sm"
        className="h-9 px-2 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(index)}
        aria-label={locale === 'ar' ? '\u062D\u0630\u0641 \u0627\u0644\u0641\u0644\u062A\u0631' : 'Remove filter'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Value input by type
// ---------------------------------------------------------------------------

interface ValueInputProps {
  dimension: FilterDimension | undefined;
  value: unknown;
  operator: FilterOperator;
  locale: 'en' | 'ar';
  onChange: (value: unknown) => void;
}

function ValueInput({ dimension, value, operator, locale, onChange }: ValueInputProps) {
  const inputType = dimension?.inputType ?? 'text';

  // "exists" operator needs no value
  if (operator === 'exists') {
    return null;
  }

  // Range / between — two inputs
  if (inputType === 'range' || operator === 'between') {
    const rangeVal = Array.isArray(value) ? value : ['', ''];
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          className="w-[80px] h-9 text-sm"
          placeholder={locale === 'ar' ? '\u0645\u0646' : 'From'}
          value={String(rangeVal[0] ?? '')}
          onChange={(e) => onChange([e.target.value, rangeVal[1]])}
        />
        <span className="text-xs text-muted-foreground">-</span>
        <Input
          type="number"
          className="w-[80px] h-9 text-sm"
          placeholder={locale === 'ar' ? '\u0625\u0644\u0649' : 'To'}
          value={String(rangeVal[1] ?? '')}
          onChange={(e) => onChange([rangeVal[0], e.target.value])}
        />
      </div>
    );
  }

  // Toggle / boolean
  if (inputType === 'toggle') {
    return (
      <div className="flex items-center gap-2">
        <Switch
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked)}
        />
        <Label className="text-xs text-muted-foreground">
          {value === true
            ? (locale === 'ar' ? '\u0646\u0639\u0645' : 'Yes')
            : (locale === 'ar' ? '\u0644\u0627' : 'No')}
        </Label>
      </div>
    );
  }

  // Select (single)
  if (inputType === 'select' && dimension?.options) {
    return (
      <Select value={String(value ?? '')} onValueChange={onChange}>
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder={locale === 'ar' ? '\u0627\u062E\u062A\u0631' : 'Select'} />
        </SelectTrigger>
        <SelectContent>
          {dimension.options.map((opt) => (
            <SelectItem key={String(opt.value)} value={String(opt.value)}>
              {locale === 'ar' ? opt.label_ar : opt.label_en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Multi-select
  if (inputType === 'multi-select' && dimension?.options) {
    const selected = Array.isArray(value) ? (value as unknown[]) : [];
    return (
      <div className="flex flex-wrap gap-1">
        {dimension.options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <Button
              key={String(opt.value)}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const next = isSelected
                  ? selected.filter((v) => v !== opt.value)
                  : [...selected, opt.value];
                onChange(next);
              }}
            >
              {locale === 'ar' ? opt.label_ar : opt.label_en}
            </Button>
          );
        })}
      </div>
    );
  }

  // Date
  if (inputType === 'date') {
    return (
      <Input
        type="date"
        className="w-[160px] h-9 text-sm"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  // Number
  if (inputType === 'number') {
    return (
      <Input
        type="number"
        className="w-[120px] h-9 text-sm"
        placeholder={locale === 'ar' ? '\u0642\u064A\u0645\u0629' : 'Value'}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
    );
  }

  // Default: text
  return (
    <Input
      type="text"
      className="w-[160px] h-9 text-sm"
      placeholder={locale === 'ar' ? '\u0642\u064A\u0645\u0629' : 'Value'}
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DynamicFilterPanel({
  dimensions,
  values,
  onChange,
  locale,
}: DynamicFilterPanelProps) {
  const isRtl = locale === 'ar';

  const handleUpdate = useCallback(
    (index: number, updated: FilterState) => {
      const next = [...values];
      next[index] = updated;
      onChange(next);
    },
    [values, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(values.filter((_, i) => i !== index));
    },
    [values, onChange],
  );

  const handleAdd = useCallback(() => {
    if (dimensions.length === 0) return;
    const firstDim = dimensions[0];
    onChange([
      ...values,
      {
        field: firstDim.field,
        operator: firstDim.operators[0] ?? 'eq',
        value: '',
      },
    ]);
  }, [dimensions, values, onChange]);

  const handleClear = useCallback(() => {
    onChange([]);
  }, [onChange]);

  return (
    <div className="w-full space-y-3" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
          {isRtl ? '\u0627\u0644\u0641\u0644\u0627\u062A\u0631' : 'Filters'}
        </h3>
        {values.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClear}>
            {isRtl ? '\u0645\u0633\u062D \u0627\u0644\u0643\u0644' : 'Clear all'}
          </Button>
        )}
      </div>

      {/* Filter rows */}
      <div className="space-y-2">
        {values.map((filter, idx) => (
          <FilterRow
            key={idx}
            dimensions={dimensions}
            filter={filter}
            index={idx}
            locale={locale}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
          />
        ))}
      </div>

      {/* Add filter */}
      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleAdd}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        {isRtl ? '\u0625\u0636\u0627\u0641\u0629 \u0641\u0644\u062A\u0631' : 'Add filter'}
      </Button>
    </div>
  );
}
