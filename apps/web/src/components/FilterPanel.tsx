'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { AMENITIES, EQUIPMENT_TYPES, SORT_DESCRIPTIONS, type SortKey } from '@gymgo/domain';

/**
 * The filter panel.
 *
 * Every control writes straight to the URL, so the URL is the only source of
 * truth for a search. That gives shareable links and working back navigation
 * for free, and means the list, the map and the comparison tray can never
 * disagree about what was asked for.
 *
 * It is a real `<form method="get">`, so with JavaScript unavailable the
 * "Update results" button still performs the same search.
 */
export function FilterPanel({
  budget,
  visitDate,
  visitTime,
  requiredEquipment,
  dumbbellMin,
  requiredAmenities,
  sort,
  radiusKm,
  text,
  isLocalResident,
}: {
  budget: string;
  visitDate: string;
  visitTime: string;
  requiredEquipment: string[];
  dumbbellMin: string;
  requiredAmenities: string[];
  sort: SortKey;
  radiusKm: number;
  text: string;
  isLocalResident: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      // Moving the map is a separate action; changing a filter should search
      // the whole area again rather than silently keep an old viewport.
      params.delete('bbox');
      startTransition(() => {
        router.push(`/search?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams],
  );

  const setValue = (key: string, value: string) =>
    update((params) => {
      if (value === '') params.delete(key);
      else params.set(key, value);
    });

  const toggleMulti = (key: string, value: string, checked: boolean) =>
    update((params) => {
      const current = params.getAll(key).flatMap((item) => item.split(',')).filter(Boolean);
      const next = checked
        ? [...new Set([...current, value])]
        : current.filter((item) => item !== value);
      params.delete(key);
      for (const item of next) params.append(key, item);
    });

  const dumbbellsSelected = requiredEquipment.includes('dumbbells');

  /*
   * These inputs are uncontrolled so typing stays responsive, which means
   * React will not update their DOM value when the URL changes underneath
   * them — including on back navigation. Keying each one to its value from the
   * URL remounts it, so the controls always show the search that is actually
   * running.
   */

  return (
    <form
      className="search-filters"
      action="/search"
      method="get"
      aria-busy={isPending}
      aria-label="Filter results"
    >
      <input type="hidden" name="view" value={searchParams.get('view') ?? 'list'} />

      <div className="field">
        <label className="field__label" htmlFor="filter-q">
          Suburb or postcode
        </label>
        <input
          key={`q-${text}`}
          id="filter-q"
          name="q"
          type="search"
          defaultValue={text}
          onBlur={(event) => setValue('q', event.currentTarget.value)}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="filter-r">
          Within {radiusKm} km
        </label>
        <input
          key={`r-${radiusKm}`}
          id="filter-r"
          name="r"
          type="range"
          min="1"
          max="15"
          step="1"
          defaultValue={String(radiusKm)}
          onChange={(event) => setValue('r', event.currentTarget.value)}
          style={{ width: '100%', minHeight: 'auto' }}
        />
        <span className="field__hint">Straight-line distance. We do not estimate travel time.</span>
      </div>

      <fieldset>
        <legend>When you want to train</legend>
        <div className="row" style={{ flexWrap: 'nowrap', gap: 8 }}>
          <input
            key={`date-${visitDate}`}
            name="date"
            type="date"
            aria-label="Visit date"
            defaultValue={visitDate}
            onChange={(event) => setValue('date', event.currentTarget.value)}
          />
          <input
            key={`time-${visitTime}`}
            name="time"
            type="time"
            aria-label="Visit time"
            defaultValue={visitTime}
            onChange={(event) => setValue('time', event.currentTarget.value)}
          />
        </div>
        <span className="field__hint">
          Times are local to the gym (Australia/Sydney in this pilot). We check visitor entry, not
          member access.
        </span>
      </fieldset>

      <div className="field">
        <label className="field__label" htmlFor="filter-budget">
          Visit budget (A$)
        </label>
        <input
          key={`budget-${budget}`}
          id="filter-budget"
          name="budget"
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          placeholder="No limit"
          defaultValue={budget}
          onChange={(event) => setValue('budget', event.currentTarget.value)}
        />
        <span className="field__hint">
          Compared against the total you do not get back: price, applicable tax and any mandatory
          fee. Refundable deposits are shown separately and never counted here.
        </span>
      </div>

      <fieldset>
        <legend>Equipment you must have</legend>
        <div className="chips">
          {EQUIPMENT_TYPES.map((type) => (
            <label className="chip" key={type.id}>
              <input
                type="checkbox"
                name="eq"
                value={type.id}
                checked={requiredEquipment.includes(type.id)}
                onChange={(event) => toggleMulti('eq', type.id, event.currentTarget.checked)}
              />
              <span>{type.label}</span>
            </label>
          ))}
        </div>
        <span className="field__hint">
          All of these must be present. An item we have not established never counts as a match.
        </span>
      </fieldset>

      {dumbbellsSelected && (
        <div className="field">
          <label className="field__label" htmlFor="filter-db">
            Heaviest dumbbell pair, at least (kg)
          </label>
          <input
            key={`db-${dumbbellMin}`}
            id="filter-db"
            name="db"
            type="number"
            min="1"
            max="100"
            step="1"
            placeholder="Any"
            defaultValue={dumbbellMin}
            onChange={(event) => setValue('db', event.currentTarget.value)}
          />
          <span className="field__hint">
            A gym whose maximum has not been recorded cannot satisfy this.
          </span>
        </div>
      )}

      <fieldset>
        <legend>Facilities you need</legend>
        <div className="chips">
          {AMENITIES.map((amenity) => (
            <label className="chip" key={amenity.id}>
              <input
                type="checkbox"
                name="am"
                value={amenity.id}
                checked={requiredAmenities.includes(amenity.id)}
                onChange={(event) => toggleMulti('am', amenity.id, event.currentTarget.checked)}
              />
              <span>{amenity.label}</span>
            </label>
          ))}
        </div>
        <span className="field__hint">
          Accessibility facts are recorded one by one. A step-free entrance never implies an
          accessible bathroom.
        </span>
      </fieldset>

      <div className="field">
        <label className="field__label" htmlFor="filter-resident">
          Do you live or work locally?
        </label>
        <select
          key={`resident-${isLocalResident}`}
          id="filter-resident"
          name="resident"
          defaultValue={isLocalResident}
          onChange={(event) => setValue('resident', event.currentTarget.value)}
        >
          <option value="unknown">Prefer not to say</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
        <span className="field__hint">
          Some trials are limited to local residents. Telling us lets those be ruled in or out
          instead of left open.
        </span>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="filter-sort">
          Sort by
        </label>
        <select
          key={`sort-${sort}`}
          id="filter-sort"
          name="sort"
          defaultValue={sort}
          onChange={(event) => setValue('sort', event.currentTarget.value)}
        >
          <option value="best_match">Best match</option>
          <option value="distance">Distance</option>
          <option value="visit_cost">Visit cost</option>
          <option value="rating">Rating from our reviews</option>
        </select>
        <span className="field__hint">{SORT_DESCRIPTIONS[sort]}</span>
      </div>

      <div className="row">
        <button className="button button--primary button--small" type="submit">
          Update results
        </button>
        <a className="button button--small" href="/search">
          Clear all
        </a>
      </div>
    </form>
  );
}
