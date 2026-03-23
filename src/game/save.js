/**
 * Save/load game state to JSON file.
 * Game state is separate from the event log (entity memory).
 */

const fs = require('fs');
const path = require('path');

class SaveManager {
  constructor(saveDir) {
    this._saveDir = saveDir;
    this._savePath = path.join(saveDir, 'game-save.json');

    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }
  }

  save(data) {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(this._savePath, json);
  }

  load() {
    if (!fs.existsSync(this._savePath)) return null;
    try {
      const json = fs.readFileSync(this._savePath, 'utf-8');
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  exists() {
    return fs.existsSync(this._savePath);
  }

  delete() {
    if (fs.existsSync(this._savePath)) {
      fs.unlinkSync(this._savePath);
    }
  }
}

module.exports = { SaveManager };
