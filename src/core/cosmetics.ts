// Cosmetics: purely visual avatar items bought with Stars. They work with every
// Theme, so switching Theme never hides what a Kid has bought.

import { pick, type Rng } from './rng'
import type { ChestReward, CosmeticSlot, KidState } from './types'

export interface Cosmetic {
  id: string
  slot: CosmeticSlot
  emoji: string
  price: number
}

const item = (slot: CosmeticSlot, emoji: string, price: number): Cosmetic => ({ id: `${slot}-${emoji}`, slot, emoji, price })

export const SLOTS: readonly CosmeticSlot[] = ['hat', 'buddy', 'sparkle']

export const COSMETICS: readonly Cosmetic[] = [
  item('hat', '🧢', 5),
  item('hat', '🎀', 5),
  item('hat', '🌸', 8),
  item('hat', '🎓', 12),
  item('hat', '🎩', 15),
  item('hat', '👑', 40),
  item('buddy', '🐣', 5),
  item('buddy', '🐶', 10),
  item('buddy', '🐱', 10),
  item('buddy', '🐰', 10),
  item('buddy', '🦊', 15),
  item('buddy', '🐼', 15),
  item('buddy', '🦉', 20),
  item('buddy', '🐧', 20),
  item('buddy', '🦄', 30),
  item('buddy', '🐉', 35),
  item('sparkle', '✨', 5),
  item('sparkle', '🫧', 8),
  item('sparkle', '🎈', 10),
  item('sparkle', '🌈', 12),
  item('sparkle', '❄️', 15),
  item('sparkle', '💫', 15),
  item('sparkle', '🎆', 25),
  item('sparkle', '🪐', 30),
]

export function cosmetic(id: string): Cosmetic | undefined {
  return COSMETICS.find((c) => c.id === id)
}

/** Buy and wear a Cosmetic; false if it is unknown, already owned or too expensive. */
export function buy(kid: KidState, id: string): boolean {
  const c = cosmetic(id)
  if (!c || kid.owned.includes(id) || kid.stars < c.price) return false
  kid.stars -= c.price
  kid.owned.push(id)
  kid.look[c.slot] = id
  return true
}

/** Wear an owned Cosmetic, or take it off if it is already worn. */
export function toggleWear(kid: KidState, id: string): void {
  const c = cosmetic(id)
  if (!c || !kid.owned.includes(id)) return
  if (kid.look[c.slot] === id) delete kid.look[c.slot]
  else kid.look[c.slot] = id
}

/** Chests only give cheap Cosmetics; the big ones are saved up for. */
const CHEST_MAX_PRICE = 12
const CHEST_COSMETIC_CHANCE = 0.15

/** Roll a Mystery Chest and add its reward to the Kid. */
export function openChest(kid: KidState, rng: Rng): ChestReward {
  const roll = rng()
  if (roll < CHEST_COSMETIC_CHANCE) {
    const cheap = COSMETICS.filter((c) => c.price <= CHEST_MAX_PRICE && !kid.owned.includes(c.id))
    if (cheap.length > 0) {
      const c = pick(cheap, rng)
      kid.owned.push(c.id)
      return { kind: 'cosmetic', id: c.id }
    }
  }
  // 1 star 40 %, 2 stars 40 %, 3 stars 20 %.
  const r = rng()
  const n = r < 0.4 ? 1 : r < 0.8 ? 2 : 3
  kid.stars += n
  return { kind: 'stars', n }
}
