/* Play Reminders (docs/adr/0004), imported into the generated service worker.
   The Family Sheet sends an empty push while today's Play Day isn't earned;
   the words are made here from the Kid's progress saved on this device, so
   nothing about the Kid goes through the push service. */

const AVATAR = { space: '🚀', pirates: '🏴‍☠️', unicorn: '🦄', pets: '🐶' }

const WORDS = {
  lt: {
    title: (name) => (name ? `${name}, laikas misijai!` : 'Laikas misijai!'),
    body: 'Šiandienos misija laukia. Užtruks tik kelias minutes!',
    streak: (n) => `Tavo serija: ${n} 🔥 Pratęsk ją šiandien!`,
    done: 'Šiandien jau žaidei – puiku! Laukia papildomas raundas.',
  },
  en: {
    title: (name) => (name ? `${name}, mission time!` : 'Mission time!'),
    body: "Today's mission is waiting. It only takes a few minutes!",
    streak: (n) => `Your streak: ${n} 🔥 Keep it going today!`,
    done: 'Today is done, great! A bonus round is waiting.',
  },
}

/** The Kid saved by the game (idb-keyval's default store), or null. */
function readKid() {
  return new Promise((resolve) => {
    const req = indexedDB.open('keyval-store')
    req.onupgradeneeded = () => req.result.createObjectStore('keyval')
    req.onerror = () => resolve(null)
    req.onsuccess = () => {
      try {
        const get = req.result.transaction('keyval').objectStore('keyval').get('kid')
        get.onsuccess = () => resolve(get.result || null)
        get.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    }
  })
}

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Missed days between the last Play Day and today. */
function gap(last, today) {
  return Math.round((Date.parse(today) - Date.parse(last)) / 86_400_000) - 1
}

async function remind() {
  const kid = await readKid()
  const lang = kid?.settings?.lang === 'en' ? 'en' : kid ? 'lt' : (self.navigator.language || '').startsWith('lt') ? 'lt' : 'en'
  const w = WORDS[lang]
  const today = isoDate(new Date())
  const journey = kid?.journey
  const last = journey?.playDays?.at(-1)
  let body = w.body
  if (last === today) body = w.done
  else if (journey?.streak > 0 && last && gap(last, today) <= journey.shields) body = w.streak(journey.streak)
  const avatar = AVATAR[kid?.settings?.theme] || '⭐'
  return self.registration.showNotification(`${avatar} ${w.title(kid?.name)}`, {
    body,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: 'play-reminder',
    renotify: true,
  })
}

self.addEventListener('push', (event) => {
  event.waitUntil(remind())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.registration.scope))
      return open ? open.focus() : self.clients.openWindow(self.registration.scope)
    }),
  )
})
