import type { Lang, ThemeId } from '../core/types'

type Text = Record<Lang, string>

export interface World {
  name: Text
  emoji: string
}

/** A World Badge looks like a World entry: an emoji and a name. */
export type Badge = World

/** A visual skin: names and draws Worlds and the avatar, never changes rules. */
export interface Theme {
  id: ThemeId
  name: Text
  avatar: string
  /** Shown on filled Journey Grid cells. */
  stamp: string
  colors: {
    bg1: string
    bg2: string
    card: string
    accent: string
    accentText: string
    text: string
    muted: string
  }
  /** 7 Challenge Worlds then 3 Legend Worlds (rings to 8 × 8, 9 × 9, 10 × 10). */
  worlds: World[]
  /** World Badge for completing each World, in the same order; a mystery until earned. */
  badges: Badge[]
  cheers: Record<Lang, string[]>
}

const w = (emoji: string, en: string, lt: string): World => ({ emoji, name: { en, lt } })

export const THEMES: Record<ThemeId, Theme> = {
  space: {
    id: 'space',
    name: { en: 'Space voyage', lt: 'Kelionė į kosmosą' },
    avatar: '🚀',
    stamp: '🌕',
    colors: {
      bg1: '#120f3a',
      bg2: '#2b1f6b',
      card: 'rgba(255,255,255,0.08)',
      accent: '#ffcc33',
      accentText: '#1a1240',
      text: '#f4f2ff',
      muted: '#b9b3e6',
    },
    worlds: [
      w('🌙', 'The Moon', 'Mėnulis'),
      w('🔴', 'Mars', 'Marsas'),
      w('🪐', 'Saturn', 'Saturnas'),
      w('☄️', 'Comet Trail', 'Kometos takas'),
      w('🌀', 'Nebula', 'Ūkas'),
      w('🛰️', 'Space Station', 'Kosminė stotis'),
      w('🕳️', 'Black Hole', 'Juodoji skylė'),
      w('🌌', 'Milky Way', 'Paukščių Takas'),
      w('💥', 'Supernova', 'Supernova'),
      w('✨', 'The Universe', 'Visata'),
    ],
    badges: [
      w('🪨', 'Moon Rock', 'Mėnulio akmuo'),
      w('🛸', 'Flying Saucer', 'Skraidanti lėkštė'),
      w('💍', "Saturn's Ring", 'Saturno žiedas'),
      w('🌠', 'Shooting Star', 'Krintanti žvaigždė'),
      w('🔭', 'Golden Telescope', 'Auksinis teleskopas'),
      w('👽', 'Friendly Alien', 'Draugiškas ateivis'),
      w('🗝️', 'Black Hole Key', 'Juodosios skylės raktas'),
      w('🗺️', 'Galaxy Map', 'Galaktikos žemėlapis'),
      w('☀️', 'Star Heart', 'Žvaigždės širdis'),
      w('👑', 'Crown of the Universe', 'Visatos karūna'),
    ],
    cheers: {
      en: ['Lift-off!', 'Stellar!', 'Warp speed!', 'Out of this world!'],
      lt: ['Kylam!', 'Kosmiška!', 'Šviesos greičiu!', 'Nežemiška!'],
    },
  },
  pirates: {
    id: 'pirates',
    name: { en: 'Pirate islands', lt: 'Piratų salos' },
    avatar: '🏴‍☠️',
    stamp: '🪙',
    colors: {
      bg1: '#062a3a',
      bg2: '#0d5466',
      card: 'rgba(255,255,255,0.09)',
      accent: '#f4b942',
      accentText: '#2a1a05',
      text: '#fdf6e3',
      muted: '#a9d3d6',
    },
    worlds: [
      w('🦜', 'Parrot Bay', 'Papūgų įlanka'),
      w('💀', 'Skull Rock', 'Kaukolės uola'),
      w('🦈', 'Shark Reef', 'Ryklių rifas'),
      w('🌋', 'Volcano Isle', 'Ugnikalnio sala'),
      w('🐙', 'Kraken Deep', 'Krakeno gelmė'),
      w('👻', 'Ghost Ship', 'Laivas vaiduoklis'),
      w('💰', 'Treasure Cove', 'Lobių įlanka'),
      w('🌊', 'Seven Seas', 'Septynios jūros'),
      w('⛵', 'Golden Fleet', 'Auksinis laivynas'),
      w('👑', 'Legendary Treasure', 'Legendinis lobis'),
    ],
    badges: [
      w('🦜', 'Talking Parrot', 'Kalbanti papūga'),
      w('🗡️', 'Silver Cutlass', 'Sidabrinis kardas'),
      w('🧭', 'Golden Compass', 'Auksinis kompasas'),
      w('💎', 'Fire Gem', 'Ugnies brangakmenis'),
      w('🦷', 'Kraken Tooth', 'Krakeno dantis'),
      w('🏮', 'Ghost Lantern', 'Vaiduoklių žibintas'),
      w('🗺️', 'Treasure Map', 'Lobio žemėlapis'),
      w('⚓', 'Golden Anchor', 'Auksinis inkaras'),
      w('🔭', "Captain's Spyglass", 'Kapitono žiūronas'),
      w('👑', "Pirate King's Crown", 'Piratų karaliaus karūna'),
    ],
    cheers: {
      en: ['Arrr!', 'Ahoy, matey!', 'Treasure!', 'Full sail!'],
      lt: ['Arrr!', 'Ohoj!', 'Lobis!', 'Visu greičiu!'],
    },
  },
  unicorn: {
    id: 'unicorn',
    name: { en: 'Unicorn kingdom', lt: 'Vienaragių karalystė' },
    avatar: '🦄',
    stamp: '🌸',
    colors: {
      bg1: '#3b1a5a',
      bg2: '#a3418d',
      card: 'rgba(255,255,255,0.12)',
      accent: '#ffd6f5',
      accentText: '#4a1450',
      text: '#fff7fd',
      muted: '#f1c6e8',
    },
    worlds: [
      w('🌈', 'Rainbow Meadow', 'Vaivorykštės pieva'),
      w('💎', 'Crystal Lake', 'Krištolo ežeras'),
      w('🍭', 'Candy Forest', 'Saldainių miškas'),
      w('☁️', 'Cloud Castle', 'Debesų pilis'),
      w('🌟', 'Star Garden', 'Žvaigždžių sodas'),
      w('🌙', 'Moon Palace', 'Mėnulio rūmai'),
      w('🌷', 'Flower Valley', 'Gėlių slėnis'),
      w('🎆', 'Northern Lights', 'Šiaurės pašvaistė'),
      w('💠', 'Diamond Sky', 'Deimantinis dangus'),
      w('👑', 'Rainbow Throne', 'Vaivorykštės sostas'),
    ],
    badges: [
      w('🎀', 'Rainbow Bow', 'Vaivorykštės kaspinas'),
      w('🔮', 'Crystal Ball', 'Krištolo rutulys'),
      w('🧁', 'Magic Cupcake', 'Stebuklingas keksiukas'),
      w('🪽', 'Cloud Wings', 'Debesų sparnai'),
      w('🌟', 'Wishing Star', 'Norų žvaigždė'),
      w('🪄', 'Moon Wand', 'Mėnulio lazdelė'),
      w('💐', 'Valley Bouquet', 'Slėnio puokštė'),
      w('🦋', 'Aurora Butterfly', 'Pašvaistės drugelis'),
      w('💖', 'Sparkling Heart', 'Spindinti širdelė'),
      w('👑', 'Rainbow Tiara', 'Vaivorykštės diadema'),
    ],
    cheers: {
      en: ['Magical!', 'Sparkly!', 'Wonderful!', 'Pure magic!'],
      lt: ['Stebuklinga!', 'Spindi!', 'Nuostabu!', 'Tikra magija!'],
    },
  },
  pets: {
    id: 'pets',
    name: { en: 'Pet town', lt: 'Gyvūnėlių miestelis' },
    avatar: '🐶',
    stamp: '🐾',
    colors: {
      bg1: '#1f3b2c',
      bg2: '#3f7d4f',
      card: 'rgba(255,255,255,0.1)',
      accent: '#ffb86b',
      accentText: '#3a2208',
      text: '#fbfff6',
      muted: '#c4e3c9',
    },
    worlds: [
      w('🐶', 'Puppy Park', 'Šuniukų parkas'),
      w('🐱', 'Kitten Café', 'Kačiukų kavinė'),
      w('🐰', 'Bunny Hill', 'Triušiukų kalva'),
      w('🐹', 'Hamster Town', 'Žiurkėnų miestelis'),
      w('🐴', 'Pony Farm', 'Ponių ūkis'),
      w('🐼', 'Panda Garden', 'Pandų sodas'),
      w('🦊', 'Fox Forest', 'Lapių miškas'),
      w('🏆', 'Pet Show', 'Gyvūnų paroda'),
      w('🦁', 'Safari', 'Safaris'),
      w('🌟', 'Pet Paradise', 'Gyvūnų rojus'),
    ],
    badges: [
      w('🦴', 'Golden Bone', 'Auksinis kaulas'),
      w('🧶', 'Ball of Yarn', 'Siūlų kamuolys'),
      w('🥕', 'Crunchy Carrot', 'Traški morka'),
      w('🌻', 'Sunflower', 'Saulėgrąža'),
      w('🍎', 'Pony Apple', 'Ponio obuolys'),
      w('🎋', 'Lucky Bamboo', 'Laimingasis bambukas'),
      w('🍁', 'Maple Leaf', 'Klevo lapas'),
      w('🏅', 'Show Medal', 'Parodos medalis'),
      w('📸', 'Safari Camera', 'Safario fotoaparatas'),
      w('🏆', 'Pet Paradise Cup', 'Gyvūnų rojaus taurė'),
    ],
    cheers: {
      en: ['Woof!', 'Purr-fect!', 'Good job!', 'Paw-some!'],
      lt: ['Au au!', 'Puiku!', 'Šaunu!', 'Nuostabu!'],
    },
  },
}

export const THEME_IDS = Object.keys(THEMES) as ThemeId[]

/** CSS custom properties for a Theme, applied on the app root. */
export function themeStyle(t: Theme): string {
  const c = t.colors
  return [
    `--bg1:${c.bg1}`,
    `--bg2:${c.bg2}`,
    `--card:${c.card}`,
    `--accent:${c.accent}`,
    `--accent-text:${c.accentText}`,
    `--text:${c.text}`,
    `--muted:${c.muted}`,
  ].join(';')
}
