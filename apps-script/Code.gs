/**
 * Family Sheet backend for the Multiplication Challenge.
 *
 * Paste this into the sheet's Extensions → Apps Script, then
 * Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * The app stores a shared secret here on first connect; every later request
 * must carry it. See README.md → "Family Sheet" and docs/adr/0001.
 */

var TABS = {
  answers: {
    name: 'Answers',
    header: ['Kid', 'Date', 'Time', 'Fact', 'Answer', 'Given', 'Correct', 'Fast', 'Ms', 'Target ms', 'Baseline ms', 'Round', 'Kid id', 'Answer id', 'Guess'],
  },
  days: {
    name: 'Days',
    header: ['Kid', 'Date', 'Play Day', 'Minutes', 'Questions', 'Correct', 'Accuracy %', 'Fast %', 'Median ms', 'New facts', 'Gold', 'Diamond', 'Streak', 'Shields', 'Key'],
  },
  state: {
    name: 'State',
    header: ['Kid id', 'Kid', 'Active device', 'Updated', 'Snapshot (split across columns)'],
  },
  batches: {
    name: 'Batches',
    header: ['Batch id', 'Kid id', 'Received'],
  },
  settings: {
    name: 'Settings',
    header: ['Kid id', 'Kid', 'Daily minutes', 'Recall Budget (s)', 'Legend Recall Budget (s)', 'Changed', 'Reminder times'],
  },
  reminders: {
    name: 'Reminders',
    header: ['Kid id', 'Kid', 'Device id', 'Subscription', 'Turned on', 'Last sent', 'Last result'],
  },
};

var SNAPSHOT_COL = 5;
var CHUNK = 45000; // a cell holds at most 50 000 characters
var DAY_KEY_COL = 15;
var SETTINGS_WIDTH = 6; // Kid id, Kid, 3 values, Changed
var CHANGED_COL = 6;
var REMINDER_TIMES_COL = 7;
var DEFAULT_REMINDER_TIMES = '07:30, 14:00, 16:00, 18:00, 20:00';
var REMINDER_EVERY_MIN = 15; // how often sendReminders runs
var REMINDER_LATE_MIN = 60; // a reminder time missed by more than this is skipped
var PLAYING_MIN = 20; // a device that synced this recently is being played on

var TIER_STYLE = {
  '': { text: '', color: '#f1f1f1' },
  B: { text: '🥉', color: '#e8c39e' },
  S: { text: '🥈', color: '#d9dde3' },
  G: { text: '🥇', color: '#ffe07a' },
  D: { text: '💎', color: '#b9ecff' },
};

function doGet(e) {
  return respond_((e && e.parameter) || {});
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_json' });
  }
  return respond_(body);
}

function respond_(req) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return json_({ ok: false, error: 'busy' });
  try {
    return json_(route_(req));
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function route_(req) {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('SECRET');

  if (req.action === 'init') {
    if (!req.secret) return { ok: false, error: 'bad_secret' };
    if (!secret) {
      // Trust on first use: the first app to connect sets the secret.
      props.setProperty('SECRET', String(req.secret));
      setup_();
      return { ok: true };
    }
    return secret === req.secret ? { ok: true } : { ok: false, error: 'secret_mismatch' };
  }

  if (!secret || req.secret !== secret) return { ok: false, error: 'bad_secret' };
  if (req.action === 'restore') return restore_(req);
  if (req.action === 'sync') return sync_(req);
  if (req.action === 'pushKey') return pushKey_(req);
  return { ok: false, error: 'unknown_action' };
}

function setup_() {
  Object.keys(TABS).forEach(function (k) {
    tab_(TABS[k]);
  });
}

function tab_(def) {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(def.name);
  if (!sheet) {
    sheet = ss.insertSheet(def.name);
    sheet.getRange(1, 1, 1, def.header.length).setValues([def.header]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (sheet.getLastColumn() < def.header.length) {
    // A newer version of this script added columns: head them.
    var from = sheet.getLastColumn() + 1;
    sheet.getRange(1, from, 1, def.header.length - from + 1).setValues([def.header.slice(from - 1)]).setFontWeight('bold');
  }
  return sheet;
}

/** Row number where `col` equals `value` exactly, or 0. */
function findRow_(sheet, col, value) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var cell = sheet
    .getRange(2, col, last - 1, 1)
    .createTextFinder(String(value))
    .matchEntireCell(true)
    .findNext();
  return cell ? cell.getRow() : 0;
}

function readSnapshot_(sheet, row) {
  var width = sheet.getLastColumn() - SNAPSHOT_COL + 1;
  if (width < 1) return null;
  var parts = sheet.getRange(row, SNAPSHOT_COL, 1, width).getValues()[0];
  var text = parts.join('');
  return text ? text : null;
}

function writeSnapshot_(sheet, row, snapshot) {
  var width = sheet.getLastColumn() - SNAPSHOT_COL + 1;
  if (width > 0) sheet.getRange(row, SNAPSHOT_COL, 1, width).clearContent();
  var parts = [];
  for (var i = 0; i < snapshot.length; i += CHUNK) parts.push(snapshot.slice(i, i + CHUNK));
  if (parts.length) sheet.getRange(row, SNAPSHOT_COL, 1, parts.length).setValues([parts]);
}

/** Returns the Kid's snapshot; with claim=1 the caller becomes the Active Device. */
function restore_(req) {
  var state = tab_(TABS.state);
  var row = findRow_(state, 1, req.kidId);
  var now = new Date();
  if (!row) {
    if (req.claim === '1') state.appendRow([req.kidId, req.kidName || '', req.deviceId, now]);
    return { ok: true, snapshot: null };
  }
  if (req.claim === '1') state.getRange(row, 3, 1, 2).setValues([[req.deviceId, now]]);
  return { ok: true, snapshot: readSnapshot_(state, row) };
}

function sync_(req) {
  var state = tab_(TABS.state);
  var row = findRow_(state, 1, req.kidId);
  var now = new Date();
  if (row) {
    var device = state.getRange(row, 3).getValue();
    if (device && device !== req.deviceId) return { ok: false, error: 'inactive_device' };
    state.getRange(row, 2, 1, 3).setValues([[req.kidName, req.deviceId, now]]);
  } else {
    state.appendRow([req.kidId, req.kidName, req.deviceId, now]);
    row = state.getLastRow();
  }

  var answers = tab_(TABS.answers);
  var days = tab_(TABS.days);
  var batches = tab_(TABS.batches);
  var answerRows = [];
  var batchRows = [];

  (req.batches || []).forEach(function (b) {
    if (findRow_(batches, 1, b.id)) return; // already stored by an earlier retry
    (b.answers || []).forEach(function (a) {
      answerRows.push(answerRow_(req, a, false));
    });
    // A Guess (88, 555 …) counts for nothing in the app; it is logged here only for the Parent.
    (b.guesses || []).forEach(function (a) {
      answerRows.push(answerRow_(req, a, true));
    });
    upsertDay_(days, req, b.day);
    batchRows.push([b.id, req.kidId, now]);
  });
  // Guesses sit right before the answer that followed them.
  answerRows.sort(function (x, y) {
    return x[2].getTime() - y[2].getTime();
  });

  if (answerRows.length) {
    answers.getRange(answers.getLastRow() + 1, 1, answerRows.length, answerRows[0].length).setValues(answerRows);
  }
  if (batchRows.length) {
    batches.getRange(batches.getLastRow() + 1, 1, batchRows.length, batchRows[0].length).setValues(batchRows);
  }
  if (req.snapshot) writeSnapshot_(state, row, req.snapshot);
  if (req.board) writeBoard_(req.kidName, req.board);
  if (req.push !== undefined) savePush_(req);
  return { ok: true, settings: syncSettings_(req) };
}

/** One Answers row; a Guess leaves Correct and Fast blank, as it was not counted. */
function answerRow_(req, a, guess) {
  return [
    req.kidName,
    a.date,
    new Date(a.ts),
    a.a + ' × ' + a.b,
    a.a * a.b,
    a.given === null ? '' : a.given,
    guess ? '' : a.correct,
    guess ? '' : a.fast,
    a.ms,
    a.targetMs,
    a.baselineMs,
    a.round,
    req.kidId,
    a.id,
    guess,
  ];
}

/**
 * Parent Settings live both on the device and in the Settings tab; the later
 * change wins. Returns the tab's values when they changed after the device's.
 */
function syncSettings_(req) {
  var s = req.settings;
  if (!s) return null; // an app from before the Settings tab
  var sheet = tab_(TABS.settings);
  var deviceAt = s.changedAt ? new Date(s.changedAt).getTime() : 0;
  var deviceRow = [
    req.kidId,
    req.kidName,
    s.dailyMinutes,
    s.recallBudgetMs / 1000,
    s.legendRecallBudgetMs / 1000,
    s.changedAt ? new Date(s.changedAt) : '',
  ];
  var row = findRow_(sheet, 1, req.kidId);
  if (!row) {
    sheet.appendRow(deviceRow.concat([DEFAULT_REMINDER_TIMES]));
    sheet.getRange(sheet.getLastRow(), CHANGED_COL).setNumberFormat('yyyy-mm-dd hh:mm');
    return null;
  }
  var v = sheet.getRange(row, 1, 1, SETTINGS_WIDTH).getValues()[0];
  var sheetAt = v[CHANGED_COL - 1] instanceof Date ? v[CHANGED_COL - 1].getTime() : 0;
  if (deviceAt > sheetAt) {
    sheet.getRange(row, 1, 1, SETTINGS_WIDTH).setValues([deviceRow]);
    return null;
  }
  // A blank or mistyped value is put back to the device's.
  var minutes = number_(v[2]);
  var budget = number_(v[3]);
  var legend = number_(v[4]);
  sheet.getRange(row, 2, 1, 4).setValues([[
    req.kidName,
    minutes === null ? deviceRow[2] : minutes,
    budget === null ? deviceRow[3] : budget,
    legend === null ? deviceRow[4] : legend,
  ]]);
  if (sheetAt <= deviceAt) return null;
  var out = { changedAt: new Date(sheetAt).toISOString() };
  if (minutes !== null) out.dailyMinutes = minutes;
  if (budget !== null) out.recallBudgetMs = Math.round(budget * 1000);
  if (legend !== null) out.legendRecallBudgetMs = Math.round(legend * 1000);
  return out;
}

/** A cell as a number (a comma decimal is fine), or null. */
function number_(value) {
  var n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  return isFinite(n) ? n : null;
}

/**
 * Simple trigger: a Parent's edit in the Settings tab stamps the row's
 * Changed time, so the next Sync takes the new values to the Kid's device.
 * Edits made by this script (Syncs) don't fire it.
 */
function onEdit(e) {
  var range = e && e.range;
  if (!range || range.getSheet().getName() !== TABS.settings.name) return;
  if (range.getLastColumn() < 3 || range.getColumn() > 5) return;
  var first = Math.max(2, range.getRow());
  var last = range.getLastRow();
  if (last < first) return;
  var stamps = [];
  for (var r = first; r <= last; r++) stamps.push([new Date()]);
  range.getSheet().getRange(first, CHANGED_COL, stamps.length, 1).setValues(stamps).setNumberFormat('yyyy-mm-dd hh:mm');
}

function upsertDay_(sheet, req, d) {
  if (!d) return;
  var key = req.kidId + '|' + d.date;
  var pct = function (n) {
    return d.questions ? Math.round((n / d.questions) * 100) : '';
  };
  var values = [
    req.kidName,
    d.date,
    d.playDay || '',
    d.minutes,
    d.questions,
    d.correct,
    pct(d.correct),
    pct(d.fast),
    d.medianMs === null ? '' : d.medianMs,
    d.newFacts,
    d.gold,
    d.diamond,
    d.streak,
    d.shields,
    key,
  ];
  var row = findRow_(sheet, DAY_KEY_COL, key);
  if (row) sheet.getRange(row, 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);
}

/** One tab per Kid with the 10 × 10 Sticker Board. */
function writeBoard_(kidName, board) {
  var name = ('Board · ' + kidName).replace(/[:\\\/?*\[\]]/g, '').slice(0, 90);
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.setColumnWidths(1, 11, 44);
    sheet.setRowHeights(1, 11, 32);
  }
  var values = [['×', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]];
  var colors = [['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff']];
  for (var a = 0; a < 10; a++) {
    var row = [a + 1];
    var rowColors = ['#ffffff'];
    for (var b = 0; b < 10; b++) {
      var code = String(board[a][b] || '');
      var dusty = code.indexOf('*') >= 0;
      var style = TIER_STYLE[code.replace('*', '')] || TIER_STYLE[''];
      row.push(style.text + (dusty ? '💨' : ''));
      rowColors.push(style.color);
    }
    values.push(row);
    colors.push(rowColors);
  }
  var range = sheet.getRange(1, 1, 11, 11);
  range.setValues(values).setBackgrounds(colors).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange(1, 1, 1, 11).setFontWeight('bold');
  sheet.getRange(1, 1, 11, 1).setFontWeight('bold');
  sheet.getRange(13, 1).setValue('🥉 bronze · 🥈 silver · 🥇 gold (mastered) · 💎 diamond · 💨 dusty (missed lately)');
}

// ── Play Reminders ───────────────────────────────────────
// See docs/adr/0004. A Kid's device turns reminders on and sends its push
// subscription with every Sync; every 15 minutes sendReminders sends an empty
// push to it at the Kid's reminder times while today's Play Day isn't earned.
// The device writes the notification text itself, so nothing about the Kid
// goes through the push service.

/**
 * The VAPID key pair push messages are signed with. The first device to
 * turn reminders on makes it (the browser has a proper key generator) and
 * stores it here; later calls just get the public key.
 */
function pushKey_(req) {
  var props = PropertiesService.getScriptProperties();
  var pub = props.getProperty('VAPID_PUBLIC');
  if (!pub && req.publicKey && req.privateKey) {
    if (String(req.publicKey).length !== 87 || String(req.privateKey).length !== 43) return { ok: false, error: 'bad_key' };
    props.setProperty('VAPID_PUBLIC', req.publicKey);
    props.setProperty('VAPID_PRIVATE', req.privateKey);
    props.setProperty('VAPID_SUBJECT', String(req.subject || 'mailto:parent@example.com'));
    pub = req.publicKey;
  }
  return { ok: true, publicKey: pub || null };
}

/** Keep the Reminders row of the syncing device: its subscription, or none (null). */
function savePush_(req) {
  var sheet = tab_(TABS.reminders);
  var row = findRow_(sheet, 3, req.deviceId);
  if (!req.push || !req.push.endpoint) {
    if (row) sheet.deleteRow(row);
    return;
  }
  var json = JSON.stringify({ endpoint: req.push.endpoint, keys: req.push.keys || {} });
  if (row) {
    var v = sheet.getRange(row, 1, 1, 4).getValues()[0];
    if (v[0] === req.kidId && v[1] === req.kidName && v[3] === json) return;
    sheet.getRange(row, 1, 1, 4).setValues([[req.kidId, req.kidName, req.deviceId, json]]);
  } else {
    sheet.appendRow([req.kidId, req.kidName, req.deviceId, json, new Date(), '', '']);
  }
  var settings = tab_(TABS.settings);
  var srow = findRow_(settings, 1, req.kidId);
  if (srow && settings.getRange(srow, REMINDER_TIMES_COL).getValue() === '') {
    settings.getRange(srow, REMINDER_TIMES_COL).setValue(DEFAULT_REMINDER_TIMES);
  }
  ensureReminderTrigger_();
}

function ensureReminderTrigger_() {
  var has = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'sendReminders';
  });
  if (!has) ScriptApp.newTrigger('sendReminders').timeBased().everyMinutes(REMINDER_EVERY_MIN).create();
}

/** Minutes after midnight of each time in a cell like "07:30, 14:00"; [] for "off". */
function reminderTimes_(cell) {
  var text = String(cell === '' || cell === null || cell === undefined ? DEFAULT_REMINDER_TIMES : cell);
  if (cell instanceof Date) text = Utilities.formatDate(cell, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'HH:mm');
  var out = [];
  (text.match(/\d{1,2}[:.]\d{2}/g) || []).forEach(function (t) {
    var p = t.split(/[:.]/);
    var m = Number(p[0]) * 60 + Number(p[1]);
    if (Number(p[0]) < 24 && Number(p[1]) < 60) out.push(m);
  });
  return out.sort(function (a, b) {
    return a - b;
  });
}

/**
 * Time-driven trigger (created when the first device turns reminders on).
 * `now` is only for tests.
 */
function sendReminders(now) {
  now = now instanceof Date ? now : new Date();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    sendDueReminders_(now);
  } finally {
    lock.releaseLock();
  }
}

function sendDueReminders_(now) {
  var props = PropertiesService.getScriptProperties();
  var keys = { pub: props.getProperty('VAPID_PUBLIC'), priv: props.getProperty('VAPID_PRIVATE'), subject: props.getProperty('VAPID_SUBJECT') };
  if (!keys.pub || !keys.priv) return;
  var sheet = tab_(TABS.reminders);
  var last = sheet.getLastRow();
  if (last < 2) return;
  var tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone(); // File → Settings; the Kids' local time
  var date = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var hm = Utilities.formatDate(now, tz, 'HH:mm').split(':');
  var nowMin = Number(hm[0]) * 60 + Number(hm[1]);
  var rows = sheet.getRange(2, 1, last - 1, 7).getValues();
  var days = tab_(TABS.days);
  var state = tab_(TABS.state);
  var settings = tab_(TABS.settings);
  var gone = [];

  rows.forEach(function (r, i) {
    var kidId = r[0];
    var srow = findRow_(settings, 1, kidId);
    var times = reminderTimes_(srow ? settings.getRange(srow, REMINDER_TIMES_COL).getValue() : '');
    var slot = null;
    times.forEach(function (t) {
      if (t <= nowMin) slot = t;
    });
    if (slot === null || nowMin - slot > REMINDER_LATE_MIN) return;
    var slotStart = now.getTime() - (nowMin - slot) * 60000 - now.getSeconds() * 1000;
    if (r[5] instanceof Date && r[5].getTime() >= slotStart) return; // this time's reminder went already

    var dayRow = findRow_(days, DAY_KEY_COL, kidId + '|' + date);
    if (dayRow && days.getRange(dayRow, 3).getValue() !== '') return; // today's Play Day is earned
    var stateRow = findRow_(state, 1, kidId);
    if (stateRow) {
      var st = state.getRange(stateRow, 3, 1, 2).getValues()[0];
      if (st[0] && st[0] !== r[2]) return; // the Kid plays on another device now
      if (st[1] instanceof Date && now.getTime() - st[1].getTime() < PLAYING_MIN * 60000) return; // playing right now
    }

    var code;
    try {
      code = sendPush_(JSON.parse(r[3]), keys, now);
    } catch (err) {
      code = 'error: ' + String((err && err.message) || err);
    }
    sheet.getRange(i + 2, 6, 1, 2).setValues([[now, code]]);
    if (code === 404 || code === 410) gone.push(i + 2); // the device dropped the subscription
  });
  gone.reverse().forEach(function (row) {
    sheet.deleteRow(row);
  });
}

/** POST an empty Web Push message, signed with VAPID (RFC 8292). Returns the HTTP status. */
function sendPush_(sub, keys, now) {
  var origin = sub.endpoint.match(/^https:\/\/[^/]+/)[0];
  var jwt = vapidJwt_(origin, keys, now);
  var res = UrlFetchApp.fetch(sub.endpoint, {
    method: 'post',
    headers: { TTL: String(2 * 3600), Urgency: 'normal', Authorization: 'vapid t=' + jwt + ', k=' + keys.pub },
    payload: '',
    muteHttpExceptions: true,
  });
  return res.getResponseCode();
}

function vapidJwt_(aud, keys, now) {
  var enc = function (obj) {
    return b64url_(Utilities.newBlob(JSON.stringify(obj)).getBytes());
  };
  var input = enc({ typ: 'JWT', alg: 'ES256' }) + '.' + enc({ aud: aud, exp: Math.floor(now.getTime() / 1000) + 3600, sub: keys.subject });
  var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.newBlob(input).getBytes());
  return input + '.' + b64url_(es256Sign_(unsigned_(hash), unsigned_(b64urlBytes_(keys.priv))));
}

function b64url_(bytes) {
  return Utilities.base64EncodeWebSafe(signed_(bytes)).replace(/=+$/, '');
}

function b64urlBytes_(text) {
  var s = String(text);
  while (s.length % 4) s += '=';
  return Utilities.base64DecodeWebSafe(s);
}

/** Apps Script byte arrays hold -128…127. */
function unsigned_(bytes) {
  return bytes.map(function (b) {
    return b & 255;
  });
}

function signed_(bytes) {
  return bytes.map(function (b) {
    return b > 127 ? b - 256 : b;
  });
}

// ES256: ECDSA over P-256 with SHA-256 and an RFC 6979 nonce, as Apps Script
// has no elliptic-curve signing of its own. Not constant-time; it signs only
// short-lived reminder tokens on Google's servers.
var P256_ = null;

function p256_() {
  if (P256_) return P256_;
  var B = function (hex) {
    return BigInt('0x' + hex);
  };
  P256_ = {
    p: B('ffffffff00000001000000000000000000000000ffffffffffffffffffffffff'),
    n: B('ffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551'),
    G: [B('6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296'), B('4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5'), BigInt(1)],
  };
  return P256_;
}

function mod_(a, m) {
  var r = a % m;
  return r < BigInt(0) ? r + m : r;
}

function inv_(a, m) {
  // Fermat: a^(m-2) mod m, m prime.
  var result = BigInt(1);
  var base = mod_(a, m);
  var e = m - BigInt(2);
  while (e > BigInt(0)) {
    if (e & BigInt(1)) result = (result * base) % m;
    base = (base * base) % m;
    e >>= BigInt(1);
  }
  return result;
}

/** Jacobian point doubling for a = -3; null is the point at infinity. */
function pDouble_(P) {
  if (!P || P[1] === BigInt(0)) return null;
  var p = p256_().p;
  var X = P[0], Y = P[1], Z = P[2];
  var delta = (Z * Z) % p;
  var gamma = (Y * Y) % p;
  var beta = (X * gamma) % p;
  var alpha = mod_(BigInt(3) * (X - delta) * (X + delta), p);
  var X3 = mod_(alpha * alpha - BigInt(8) * beta, p);
  var Z3 = mod_((Y + Z) * (Y + Z) - gamma - delta, p);
  var Y3 = mod_(alpha * (BigInt(4) * beta - X3) - BigInt(8) * gamma * gamma, p);
  return [X3, Y3, Z3];
}

function pAdd_(P, Q) {
  if (!P) return Q;
  if (!Q) return P;
  var p = p256_().p;
  var Z1s = (P[2] * P[2]) % p;
  var Z2s = (Q[2] * Q[2]) % p;
  var U1 = (P[0] * Z2s) % p;
  var U2 = (Q[0] * Z1s) % p;
  var S1 = (P[1] * Z2s * Q[2]) % p;
  var S2 = (Q[1] * Z1s * P[2]) % p;
  if (U1 === U2) return S1 === S2 ? pDouble_(P) : null;
  var H = mod_(U2 - U1, p);
  var R = mod_(S2 - S1, p);
  var H2 = (H * H) % p;
  var H3 = (H2 * H) % p;
  var X3 = mod_(R * R - H3 - BigInt(2) * U1 * H2, p);
  var Y3 = mod_(R * (U1 * H2 - X3) - S1 * H3, p);
  var Z3 = (H * P[2] * Q[2]) % p;
  return [X3, Y3, Z3];
}

/** x coordinate (affine) of k × G. */
function baseMulX_(k) {
  var c = p256_();
  var R = null;
  var Q = c.G;
  while (k > BigInt(0)) {
    if (k & BigInt(1)) R = pAdd_(R, Q);
    Q = pDouble_(Q);
    k >>= BigInt(1);
  }
  var zi = inv_(R[2], c.p);
  return (R[0] * zi * zi) % c.p;
}

function toInt_(bytes) {
  var hex = bytes
    .map(function (b) {
      return (b < 16 ? '0' : '') + b.toString(16);
    })
    .join('');
  return BigInt('0x' + (hex || '0'));
}

function toBytes32_(n) {
  var hex = n.toString(16);
  while (hex.length < 64) hex = '0' + hex;
  var out = [];
  for (var i = 0; i < 64; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16));
  return out;
}

function hmac_(key, data) {
  return unsigned_(Utilities.computeHmacSha256Signature(signed_(data), signed_(key)));
}

/** Signature r‖s (64 bytes) of a SHA-256 `hash` with private key `d` (both unsigned byte arrays). */
function es256Sign_(hash, d) {
  var n = p256_().n;
  var x = toInt_(d);
  var z = mod_(toInt_(hash), n);
  var xb = toBytes32_(x);
  var hb = toBytes32_(z);
  var V = [];
  var K = [];
  for (var i = 0; i < 32; i++) {
    V.push(1);
    K.push(0);
  }
  K = hmac_(K, V.concat([0], xb, hb));
  V = hmac_(K, V);
  K = hmac_(K, V.concat([1], xb, hb));
  V = hmac_(K, V);
  for (;;) {
    V = hmac_(K, V);
    var k = toInt_(V);
    if (k > BigInt(0) && k < n) {
      var r = mod_(baseMulX_(k), n);
      var s = mod_(inv_(k, n) * (z + r * x), n);
      if (r !== BigInt(0) && s !== BigInt(0)) return toBytes32_(r).concat(toBytes32_(s));
    }
    K = hmac_(K, V.concat([0]));
    V = hmac_(K, V);
  }
}
