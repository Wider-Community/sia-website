/**
 * Dynamic Component Engine — Built-in Renderers
 *
 * Thin wrappers around shadcn/ui components that conform to DynamicComponentProps.
 * Each renderer handles value binding, labels, help text, errors, and disabled state.
 */

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DynamicComponentProps } from '../types';

// ---------------------------------------------------------------------------
// Shared field wrapper
// ---------------------------------------------------------------------------

function FieldWrapper({
  i18n,
  errors,
  children,
}: {
  i18n: DynamicComponentProps['i18n'];
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {i18n.label && (
        <Label className="text-sm font-medium">{i18n.label}</Label>
      )}
      {children}
      {i18n.helpText && (
        <p className="text-xs text-muted-foreground">{i18n.helpText}</p>
      )}
      {errors?.map((err, i) => (
        <p key={i} className="text-sm text-destructive">
          {err}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TextFieldRenderer
// ---------------------------------------------------------------------------

export function TextFieldRenderer({
  value,
  onChange,
  i18n,
  errors,
  disabled,
}: DynamicComponentProps) {
  return (
    <FieldWrapper i18n={i18n} errors={errors}>
      <Input
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={i18n.placeholder}
        disabled={disabled}
      />
    </FieldWrapper>
  );
}

// ---------------------------------------------------------------------------
// NumberFieldRenderer
// ---------------------------------------------------------------------------

export function NumberFieldRenderer({
  value,
  onChange,
  i18n,
  errors,
  disabled,
}: DynamicComponentProps) {
  return (
    <FieldWrapper i18n={i18n} errors={errors}>
      <Input
        type="number"
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(e) => {
          const num = e.target.value === '' ? null : Number(e.target.value);
          onChange(num);
        }}
        placeholder={i18n.placeholder}
        disabled={disabled}
      />
    </FieldWrapper>
  );
}

// ---------------------------------------------------------------------------
// TextAreaRenderer
// ---------------------------------------------------------------------------

export function TextAreaRenderer({
  value,
  onChange,
  i18n,
  errors,
  disabled,
}: DynamicComponentProps) {
  return (
    <FieldWrapper i18n={i18n} errors={errors}>
      <Textarea
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={i18n.placeholder}
        disabled={disabled}
      />
    </FieldWrapper>
  );
}

// ---------------------------------------------------------------------------
// SelectRenderer
// ---------------------------------------------------------------------------

interface SelectOption {
  value: string;
  label: string;
}

export function SelectRenderer({
  value,
  onChange,
  i18n,
  config,
  errors,
  disabled,
}: DynamicComponentProps) {
  const options = (config.options as SelectOption[] | undefined) ?? [];
  return (
    <FieldWrapper i18n={i18n} errors={errors}>
      <Select
        value={String(value ?? '')}
        onValueChange={(v) => onChange(v)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={i18n.placeholder ?? 'Select...'} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  );
}

// ---------------------------------------------------------------------------
// ToggleRenderer
// ---------------------------------------------------------------------------

export function ToggleRenderer({
  value,
  onChange,
  i18n,
  errors,
  disabled,
}: DynamicComponentProps) {
  return (
    <FieldWrapper i18n={i18n} errors={errors}>
      <Switch
        checked={Boolean(value)}
        onCheckedChange={(checked) => onChange(checked)}
        disabled={disabled}
      />
    </FieldWrapper>
  );
}

// ---------------------------------------------------------------------------
// DatePickerRenderer
// ---------------------------------------------------------------------------

export function DatePickerRenderer({
  value,
  onChange,
  i18n,
  errors,
  disabled,
}: DynamicComponentProps) {
  return (
    <FieldWrapper i18n={i18n} errors={errors}>
      <Input
        type="date"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </FieldWrapper>
  );
}

// ---------------------------------------------------------------------------
// MultiSelectRenderer
// ---------------------------------------------------------------------------

export function MultiSelectRenderer({
  value,
  onChange,
  i18n,
  config,
  errors,
  disabled,
}: DynamicComponentProps) {
  const options = (config.options as SelectOption[] | undefined) ?? [];
  const selected = Array.isArray(value) ? (value as string[]) : [];

  const toggle = (optValue: string) => {
    const next = selected.includes(optValue)
      ? selected.filter((v) => v !== optValue)
      : [...selected, optValue];
    onChange(next);
  };

  return (
    <FieldWrapper i18n={i18n} errors={errors}>
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-2 text-sm"
          >
            <Checkbox
              checked={selected.includes(opt.value)}
              onCheckedChange={() => toggle(opt.value)}
              disabled={disabled}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </FieldWrapper>
  );
}

// ---------------------------------------------------------------------------
// FallbackRenderer
// ---------------------------------------------------------------------------

export function FallbackRenderer({
  value,
  onChange,
  i18n,
  errors,
  disabled,
}: DynamicComponentProps) {
  return (
    <FieldWrapper i18n={i18n} errors={errors}>
      <Textarea
        value={
          typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2)
        }
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            onChange(e.target.value);
          }
        }}
        placeholder="JSON value..."
        className="font-mono text-xs"
        disabled={disabled}
        rows={4}
      />
    </FieldWrapper>
  );
}

// ---------------------------------------------------------------------------
// Registry Export
// ---------------------------------------------------------------------------

export const BUILT_IN_RENDERERS: Record<
  string,
  React.ComponentType<DynamicComponentProps>
> = {
  // Canonical names
  TextFieldRenderer,
  NumberFieldRenderer,
  TextAreaRenderer,
  SelectRenderer,
  ToggleRenderer,
  DatePickerRenderer,
  MultiSelectRenderer,
  FallbackRenderer,

  // Aliases (used by experience templates and manual definitions)
  'text-input': TextFieldRenderer,
  'text': TextFieldRenderer,
  'textarea': TextAreaRenderer,
  'select': SelectRenderer,
  'multi-select': MultiSelectRenderer,
  'number': NumberFieldRenderer,
  'number-input': NumberFieldRenderer,
  'toggle': ToggleRenderer,
  'switch': ToggleRenderer,
  'date': DatePickerRenderer,
  'date-picker': DatePickerRenderer,
  'phone-input': TextFieldRenderer,
  'email-input': TextFieldRenderer,
  'url-input': TextFieldRenderer,
  'file-upload': FallbackRenderer,
  'range-input': NumberFieldRenderer,
  'review-panel': FallbackRenderer,
};
