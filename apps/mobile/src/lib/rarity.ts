/**
 * Card rarity in the gym collection. The rules live in @gymgo/domain
 * (cards.ts), shared with the server, which shows friends' cards exactly as
 * their own phones draw them.
 */

export {
  FOIL_ONE_IN,
  GEMS,
  PRISM,
  RARITIES,
  cardFor,
  cardName,
  dice,
  gemInfo,
  hash32,
  newSeed,
  oddsLine,
  rarityForRoll,
  rarityLabel,
  rarityRank,
  rollFor,
  type CardLook,
  type Gem,
  type Rarity,
} from '@gymgo/domain';
