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
    header: ['Kid', 'Date', 'Time', 'Fact', 'Answer', 'Given', 'Correct', 'Fast', 'Ms', 'Target ms', 'Baseline ms', 'Round', 'Kid id', 'Answer id'],
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
};

var SNAPSHOT_COL = 5;
var CHUNK = 45000; // a cell holds at most 50 000 characters
var DAY_KEY_COL = 15;

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
      answerRows.push([
        req.kidName,
        a.date,
        new Date(a.ts),
        a.a + ' × ' + a.b,
        a.a * a.b,
        a.given === null ? '' : a.given,
        a.correct,
        a.fast,
        a.ms,
        a.targetMs,
        a.baselineMs,
        a.round,
        req.kidId,
        a.id,
      ]);
    });
    upsertDay_(days, req, b.day);
    batchRows.push([b.id, req.kidId, now]);
  });

  if (answerRows.length) {
    answers.getRange(answers.getLastRow() + 1, 1, answerRows.length, answerRows[0].length).setValues(answerRows);
  }
  if (batchRows.length) {
    batches.getRange(batches.getLastRow() + 1, 1, batchRows.length, batchRows[0].length).setValues(batchRows);
  }
  if (req.snapshot) writeSnapshot_(state, row, req.snapshot);
  if (req.board) writeBoard_(req.kidName, req.board);
  return { ok: true };
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
