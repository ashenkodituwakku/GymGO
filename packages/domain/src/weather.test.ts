import { describe, expect, it } from 'vitest';
import { fromMetForecast, hoursFrom, tempLabel, tempUnitFor, weatherKind, weatherPoint, weatherWords, WEATHER_HOURS } from './weather';

const entry = (time: string, temp: number | null, next1?: string, next6?: string) => ({
  time,
  data: {
    instant: { details: temp === null ? {} : { air_temperature: temp } },
    ...(next1 ? { next_1_hours: { summary: { symbol_code: next1 } } } : {}),
    ...(next6 ? { next_6_hours: { summary: { symbol_code: next6 } } } : {}),
  },
});

describe('weather', () => {
  it('reads MET Norway symbols, day and night', () => {
    expect(weatherKind('clearsky_day')).toEqual({ kind: 'clear', night: false });
    expect(weatherKind('clearsky_night')).toEqual({ kind: 'clear', night: true });
    expect(weatherKind('fair_polartwilight')).toEqual({ kind: 'fair', night: true });
    expect(weatherKind('partlycloudy_day')?.kind).toBe('partly');
    expect(weatherKind('cloudy')?.kind).toBe('cloudy');
    expect(weatherKind('fog')?.kind).toBe('fog');
    expect(weatherKind('lightrainshowers_day')?.kind).toBe('drizzle');
    expect(weatherKind('rain')?.kind).toBe('rain');
    expect(weatherKind('heavyrainshowers_night')?.kind).toBe('heavyRain');
    expect(weatherKind('lightsleetshowers_day')?.kind).toBe('sleet');
    expect(weatherKind('heavysnow')?.kind).toBe('snow');
    expect(weatherKind('rainandthunder')?.kind).toBe('thunder');
    expect(weatherKind('lightssnowshowersandthunder_day')?.kind).toBe('thunder');
    expect(weatherKind('volcano')).toBeNull();
    expect(weatherKind(null)).toBeNull();
  });

  it('says it in words: Sunny by day, Clear by night', () => {
    expect(weatherWords('clearsky_day')).toBe('Sunny');
    expect(weatherWords('clearsky_night')).toBe('Clear');
    expect(weatherWords('partlycloudy_night')).toBe('Partly cloudy');
    expect(weatherWords('lightrain')).toBe('Light rain');
    expect(weatherWords('nonsense')).toBeNull();
  });

  it('shows °C, or °F in the United States, rounded', () => {
    expect(tempUnitFor('AU')).toBe('C');
    expect(tempUnitFor('us')).toBe('F');
    expect(tempUnitFor(null)).toBe('C');
    expect(tempLabel(14.4, 'C')).toBe('14°');
    expect(tempLabel(14.5, 'C')).toBe('15°');
    expect(tempLabel(-0.3, 'C')).toBe('0°');
    expect(tempLabel(20, 'F')).toBe('68°');
    expect(tempLabel(-40, 'F')).toBe('-40°');
  });

  it('is for the middle of your own square in the block', () => {
    // The block around a spot in the square -37.9..-37.8, 144.9..145.0 starts one square south and west.
    expect(weatherPoint(-38, 144.8)).toEqual({ lat: -37.85, lng: 144.95 });
    expect(weatherPoint(51.4, -0.2)).toEqual({ lat: 51.55, lng: -0.05 });
  });

  it('reads the forecast: hours with a temperature, the next hour’s symbol, or the next six’s', () => {
    const json = {
      properties: {
        meta: { updated_at: '2026-11-04T09:17:28Z' },
        timeseries: [
          entry('2026-11-04T09:00:00Z', 14.44, 'clearsky_night', 'fair_night'),
          entry('2026-11-04T10:00:00Z', null, 'cloudy'),
          entry('2026-11-04T11:00:00Z', 13.2, undefined, 'lightrainshowers_day'),
          entry('2026-11-04T12:00:00Z', 12.9),
        ],
      },
    };
    const read = fromMetForecast(json, { lat: -37.85, lng: 144.95 });
    expect(read).toMatchObject({ area: { lat: -37.85, lng: 144.95 }, updatedAt: '2026-11-04T09:17:28.000Z', source: { name: 'MET Norway' } });
    expect(read?.hours).toEqual([
      { at: '2026-11-04T09:00:00.000Z', tempC: 14.4, symbol: 'clearsky_night' },
      { at: '2026-11-04T11:00:00.000Z', tempC: 13.2, symbol: 'lightrainshowers_day' },
      { at: '2026-11-04T12:00:00.000Z', tempC: 12.9, symbol: null },
    ]);
  });

  it('keeps 13 hours at most, and refuses what isn’t a forecast', () => {
    const many = { properties: { meta: { updated_at: '2026-11-04T09:00:00Z' }, timeseries: Array.from({ length: 40 }, (_, i) => entry(new Date(Date.UTC(2026, 10, 4, 9 + i)).toISOString(), 10, 'cloudy')) } };
    expect(fromMetForecast(many, { lat: 0, lng: 0 })?.hours).toHaveLength(WEATHER_HOURS + 1);
    expect(fromMetForecast(null, { lat: 0, lng: 0 })).toBeNull();
    expect(fromMetForecast({ properties: { meta: {}, timeseries: [] } }, { lat: 0, lng: 0 })).toBeNull();
    expect(fromMetForecast({ properties: { meta: { updated_at: '2026-11-04T09:00:00Z' }, timeseries: [entry('2026-11-04T09:00:00Z', null)] } }, { lat: 0, lng: 0 })).toBeNull();
  });

  it('drops the hours already gone', () => {
    const hours = [
      { at: '2026-11-04T08:00:00.000Z', tempC: 15, symbol: null },
      { at: '2026-11-04T09:00:00.000Z', tempC: 14, symbol: null },
      { at: '2026-11-04T10:00:00.000Z', tempC: 13, symbol: null },
    ];
    expect(hoursFrom({ hours }, new Date('2026-11-04T09:40:00Z')).map((hour) => hour.tempC)).toEqual([14, 13]);
    expect(hoursFrom({ hours }, new Date('2026-11-05T09:40:00Z'))).toEqual([]);
  });
});
