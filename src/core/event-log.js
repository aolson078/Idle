/**
 * Append-only event log — the entity's "true memory."
 *
 * Stored as JSONL in Electron's userData directory.
 * Each entry has a rolling SHA-256 chain for tamper detection.
 *
 *   EVENT LOG (JSONL file)
 *   ─────────────────────
 *   {"ts":"...","type":"session_start","session":1,"hash":"a1b2..."}
 *   {"ts":"...","type":"click","count":1,"hash":"c3d4..."}
 *   {"ts":"...","type":"purchase","item":"tendril","hash":"e5f6..."}
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class EventLog {
  constructor(logDir) {
    this._logDir = logDir;
    this._logPath = path.join(logDir, 'event-log.jsonl');
    this._lastHash = null;
    this._tampered = false;
    this._entryCount = 0;

    this._ensureDir();
    this._loadLastHash();
  }

  _ensureDir() {
    if (!fs.existsSync(this._logDir)) {
      fs.mkdirSync(this._logDir, { recursive: true });
    }
  }

  _computeHash(entry, previousHash) {
    const payload = JSON.stringify(entry) + (previousHash || 'GENESIS');
    return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
  }

  _loadLastHash() {
    if (!fs.existsSync(this._logPath)) {
      this._lastHash = null;
      this._entryCount = 0;
      return;
    }

    const content = fs.readFileSync(this._logPath, 'utf-8').trim();
    if (!content) {
      this._lastHash = null;
      this._entryCount = 0;
      return;
    }

    const lines = content.split('\n');
    this._entryCount = lines.length;

    // Verify chain integrity
    let prevHash = null;
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const storedHash = entry.hash;
        const { hash: _, ...payload } = entry;
        const expectedHash = this._computeHash(payload, prevHash);

        if (storedHash !== expectedHash) {
          this._tampered = true;
          break;
        }
        prevHash = storedHash;
      } catch {
        this._tampered = true;
        break;
      }
    }

    this._lastHash = prevHash;
  }

  append(event) {
    const { hash: _, ...payload } = event;
    const hash = this._computeHash(payload, this._lastHash);
    const entry = { ...payload, hash };

    fs.appendFileSync(this._logPath, JSON.stringify(entry) + '\n');
    this._lastHash = hash;
    this._entryCount++;

    return entry;
  }

  isTampered() {
    return this._tampered;
  }

  getEntryCount() {
    return this._entryCount;
  }

  query(filter = {}) {
    if (!fs.existsSync(this._logPath)) return [];

    const content = fs.readFileSync(this._logPath, 'utf-8').trim();
    if (!content) return [];

    const entries = content.split('\n').map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    return entries.filter(entry => {
      if (filter.type && entry.type !== filter.type) return false;
      if (filter.since && new Date(entry.ts) < new Date(filter.since)) return false;
      if (filter.until && new Date(entry.ts) > new Date(filter.until)) return false;
      return true;
    });
  }

  getRecent(count = 20) {
    if (!fs.existsSync(this._logPath)) return [];

    const content = fs.readFileSync(this._logPath, 'utf-8').trim();
    if (!content) return [];

    const lines = content.split('\n');
    return lines.slice(-count).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  }

  clear() {
    if (fs.existsSync(this._logPath)) {
      fs.unlinkSync(this._logPath);
    }
    this._lastHash = null;
    this._entryCount = 0;
    this._tampered = false;
  }
}

module.exports = { EventLog };
