/** Phones draw glass natively (see Glass.tsx); nothing to set up here. */

export function installLiquidGlass(): void {}

export function sizeRefraction(_width: number, _height: number): void {}

/** Marks a view for the web's glass styles; nothing on phones. */
export function glassMark(_kind: 'bar' | 'shine' | 'lens' | 'lift'): object {
  return {};
}

/** A refraction sized to one glass control, for the web; phones draw their own glass. */
export function refractionFor(_width: number, _height: number): object {
  return {};
}
