'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface Field {
  name: string;
  label: string;
  hint?: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'url' | 'date' | 'rating';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  defaultValue?: string;
}

/**
 * A contribution form.
 *
 * Posts to the documented API. The form element has a real `action` and
 * `method`, so it submits and redirects without JavaScript; with JavaScript it
 * posts the same body and reports the server's answer in place.
 *
 * Everything it submits is validated again on the server. This form is a
 * convenience, never the check.
 */
export function ContributionForm({
  action,
  fields,
  submitLabel,
  hiddenValues = {},
  successMessage,
  intro,
}: {
  action: string;
  fields: Field[];
  submitLabel: string;
  hiddenValues?: Record<string, string>;
  successMessage: string;
  intro?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    setError(null);

    const form = event.currentTarget;
    const response = await fetch(action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      setState('sent');
      form.reset();
      router.refresh();
      return;
    }

    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setState('idle');
    setError(body?.error ?? `The server rejected this (${response.status}).`);
  }

  if (state === 'sent') {
    return (
      <p className="notice notice--success" role="status">
        {successMessage}
      </p>
    );
  }

  return (
    <form action={action} method="post" onSubmit={onSubmit} className="stack stack--tight">
      {intro && <p className="small muted">{intro}</p>}
      {Object.entries(hiddenValues).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {fields.map((field) => {
        const id = `${action}-${field.name}`.replace(/[^a-zA-Z0-9-]/g, '-');
        return (
          <div className="field" key={field.name}>
            <label className="field__label" htmlFor={id}>
              {field.label}
              {field.required ? '' : ' (optional)'}
            </label>
            {field.type === 'textarea' ? (
              <textarea id={id} name={field.name} required={field.required} maxLength={2000} />
            ) : field.type === 'select' ? (
              <select id={id} name={field.name} required={field.required} defaultValue={field.defaultValue}>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'rating' ? (
              <select id={id} name={field.name} required={field.required} defaultValue={field.defaultValue ?? ''}>
                <option value="">Not rated</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value} out of 5
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                name={field.name}
                type={field.type}
                required={field.required}
                min={field.min}
                max={field.max}
                defaultValue={field.defaultValue}
              />
            )}
            {field.hint && <span className="field__hint">{field.hint}</span>}
          </div>
        );
      })}

      {error && (
        <p className="notice notice--error small" role="alert">
          {error}
        </p>
      )}

      <div>
        <button className="button button--primary button--small" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
