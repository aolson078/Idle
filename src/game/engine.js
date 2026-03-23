/**
 * Core idle game engine — ticks, clicks, production, offline calc.
 * Communicates exclusively through the event bus.
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │  GAME STATE                                      │
 *   │  essence ──▶ spend on generators/upgrades        │
 *   │  generators[] ──▶ produce essence per tick       │
 *   │  upgrades[] ──▶ multiply click/production        │
 *   │  moltCount ──▶ permanent multiplier              │
 *   │  moltBonus ──▶ 1 + (moltCount * 0.1)            │
 *   └──────────────────────────────────────────────────┘
 */

const { GENERATORS, getGeneratorCost, getGeneratorRate } = require('./generators');
const { UPGRADES, canPurchaseUpgrade, getActiveEffects } = require('./upgrades');

class GameEngine {
  constructor(bus) {
    this._bus = bus;
    this._tickInterval = null;
    this._lastTick = Date.now();
    this._sessionStartTime = Date.now();
    this._clickCount = 0;

    this.state = {
      essence: 0,
      totalEssence: 0,
      generators: {},
      generatorPaths: {},
      upgrades: UPGRADES.map(u => ({ ...u })),
      moltCount: 0,
      moltBonus: 1.0,
      sessionNumber: 1,
    };

    for (const gen of GENERATORS) {
      this.state.generators[gen.id] = 0;
      this.state.generatorPaths[gen.id] = null;
    }
  }

  start() {
    this._lastTick = Date.now();
    this._sessionStartTime = Date.now();
    this._clickCount = 0;

    this._tickInterval = setInterval(() => this._tick(), 100);

    this._bus.emit('session_start', {
      session: this.state.sessionNumber,
    });
  }

  stop() {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }

    this._bus.emit('session_end', {
      session: this.state.sessionNumber,
      duration: Math.floor((Date.now() - this._sessionStartTime) / 1000),
      clicks: this._clickCount,
    });
  }

  _tick() {
    const now = Date.now();
    const dt = (now - this._lastTick) / 1000;
    this._lastTick = now;

    const rate = this.getProductionRate();
    const earned = rate * dt;

    if (earned > 0) {
      this.state.essence += earned;
      this.state.totalEssence += earned;
    }
  }

  click() {
    const effects = getActiveEffects(this.state.upgrades);
    const earned = 1 * effects.click_multiplier * this.state.moltBonus;
    this.state.essence += earned;
    this.state.totalEssence += earned;
    this._clickCount++;

    this._bus.emit('click', {
      earned,
      total: this.state.essence,
      clickCount: this._clickCount,
    });

    return earned;
  }

  buyGenerator(generatorId) {
    const genDef = GENERATORS.find(g => g.id === generatorId);
    if (!genDef) return false;

    const owned = this.state.generators[generatorId];
    const cost = getGeneratorCost(genDef, owned);

    if (this.state.essence < cost) return false;

    this.state.essence -= cost;
    this.state.generators[generatorId]++;

    this._bus.emit('purchase', {
      item: generatorId,
      tier: GENERATORS.indexOf(genDef) + 1,
      count: this.state.generators[generatorId],
      cost,
      path: this.state.generatorPaths[generatorId],
    });

    return true;
  }

  chooseGeneratorPath(generatorId, pathId) {
    const genDef = GENERATORS.find(g => g.id === generatorId);
    if (!genDef || !genDef.paths[pathId]) return false;
    if (this.state.generatorPaths[generatorId] !== null) return false;

    this.state.generatorPaths[generatorId] = pathId;

    this._bus.emit('path_chosen', {
      generator: generatorId,
      path: pathId,
      personalityWeight: genDef.paths[pathId].personalityWeight,
    });

    return true;
  }

  buyUpgrade(upgradeId) {
    const upgrade = this.state.upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return false;

    const purchasedIds = this.state.upgrades.filter(u => u.purchased).map(u => u.id);
    if (!canPurchaseUpgrade(upgrade, this.state.essence, purchasedIds)) return false;

    this.state.essence -= upgrade.cost;
    upgrade.purchased = true;

    this._bus.emit('upgrade_purchased', {
      upgrade: upgradeId,
      cost: upgrade.cost,
    });

    return true;
  }

  molt() {
    const moltThreshold = this.getMoltThreshold();
    if (this.state.totalEssence < moltThreshold) return false;

    const essenceBefore = this.state.totalEssence;
    this.state.moltCount++;
    this.state.moltBonus = 1 + (this.state.moltCount * 0.1);

    // Reset
    this.state.essence = 0;
    this.state.totalEssence = 0;
    for (const gen of GENERATORS) {
      this.state.generators[gen.id] = 0;
      // Paths persist across molts
    }
    this.state.upgrades = UPGRADES.map(u => ({ ...u }));

    this._bus.emit('molt', {
      number: this.state.moltCount,
      bonus: this.state.moltBonus,
      essenceBefore,
    });

    return true;
  }

  getMoltThreshold() {
    return Math.floor(10000 * Math.pow(10, this.state.moltCount));
  }

  getProductionRate() {
    const effects = getActiveEffects(this.state.upgrades);
    let total = 0;

    for (const gen of GENERATORS) {
      const owned = this.state.generators[gen.id];
      const path = this.state.generatorPaths[gen.id];
      total += getGeneratorRate(gen, owned, path);
    }

    return total * effects.generator_multiplier * this.state.moltBonus;
  }

  calculateOfflineProgress(secondsAway) {
    const effects = getActiveEffects(this.state.upgrades);
    if (effects.offline_rate === 0) return 0;

    const rate = this.getProductionRate();
    const earned = rate * secondsAway * effects.offline_rate;

    if (earned > 0) {
      this.state.essence += earned;
      this.state.totalEssence += earned;

      this._bus.emit('offline_progress', {
        secondsAway,
        earned,
        rate: effects.offline_rate,
      });
    }

    return earned;
  }

  getSaveData() {
    return {
      essence: this.state.essence,
      totalEssence: this.state.totalEssence,
      generators: { ...this.state.generators },
      generatorPaths: { ...this.state.generatorPaths },
      purchasedUpgrades: this.state.upgrades.filter(u => u.purchased).map(u => u.id),
      moltCount: this.state.moltCount,
      sessionNumber: this.state.sessionNumber,
      lastSave: new Date().toISOString(),
    };
  }

  loadSaveData(data) {
    if (!data) return;

    this.state.essence = data.essence || 0;
    this.state.totalEssence = data.totalEssence || 0;
    this.state.moltCount = data.moltCount || 0;
    this.state.moltBonus = 1 + (this.state.moltCount * 0.1);
    this.state.sessionNumber = (data.sessionNumber || 1) + 1;

    if (data.generators) {
      for (const [id, count] of Object.entries(data.generators)) {
        if (this.state.generators.hasOwnProperty(id)) {
          this.state.generators[id] = count;
        }
      }
    }

    if (data.generatorPaths) {
      for (const [id, path] of Object.entries(data.generatorPaths)) {
        if (this.state.generatorPaths.hasOwnProperty(id)) {
          this.state.generatorPaths[id] = path;
        }
      }
    }

    if (data.purchasedUpgrades) {
      for (const upgradeId of data.purchasedUpgrades) {
        const upgrade = this.state.upgrades.find(u => u.id === upgradeId);
        if (upgrade) upgrade.purchased = true;
      }
    }

    // Calculate offline progress
    if (data.lastSave) {
      const secondsAway = Math.floor((Date.now() - new Date(data.lastSave).getTime()) / 1000);
      if (secondsAway > 10) {
        this.calculateOfflineProgress(secondsAway);
      }
    }
  }
}

module.exports = { GameEngine };
