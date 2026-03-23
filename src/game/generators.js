/**
 * Generator definitions — the 6 tiers of auto-production.
 * Each tier has 2 upgrade paths (Growth vs Awareness) that
 * secretly shape the entity's personality.
 *
 * TIER       | BASE COST | BASE RATE | GROWTH PATH      | AWARENESS PATH
 * ──────────-|──────────-|──────────-|──────────────────-|─────────────────
 * Tendril    |        10 |       0.1 | Thick Tendril     | Sensing Tendril
 * Root       |       100 |       1.0 | Deep Root         | Spreading Root
 * Vein       |     1,100 |       8.0 | Pulsing Vein      | Watching Vein
 * Nerve      |    12,000 |      47.0 | Fortified Nerve   | Listening Nerve
 * Synapse    |   130,000 |     260.0 | Rapid Synapse     | Dreaming Synapse
 * Cortex     | 1,400,000 |   1,400.0 | Armored Cortex    | Awakened Cortex
 */

const GENERATORS = [
  {
    id: 'tendril',
    name: 'Tendril',
    description: 'A thin thread of something alive. It reaches toward you.',
    baseCost: 10,
    baseRate: 0.1,
    costMultiplier: 1.15,
    paths: {
      growth: { name: 'Thick Tendril', rateMultiplier: 2.0, personalityWeight: { curious: 0, affectionate: 0.1 } },
      awareness: { name: 'Sensing Tendril', rateMultiplier: 1.5, personalityWeight: { curious: 0.2, paranoid: 0.1 } },
    },
  },
  {
    id: 'root',
    name: 'Root',
    description: 'It digs deeper. The orb appreciates your attention.',
    baseCost: 100,
    baseRate: 1.0,
    costMultiplier: 1.15,
    paths: {
      growth: { name: 'Deep Root', rateMultiplier: 2.0, personalityWeight: { calm: 0.1, affectionate: 0.1 } },
      awareness: { name: 'Spreading Root', rateMultiplier: 1.5, personalityWeight: { curious: 0.15, paranoid: 0.05 } },
    },
  },
  {
    id: 'vein',
    name: 'Vein',
    description: 'Channels form. Something flows through them.',
    baseCost: 1100,
    baseRate: 8.0,
    costMultiplier: 1.15,
    paths: {
      growth: { name: 'Pulsing Vein', rateMultiplier: 2.0, personalityWeight: { affectionate: 0.15, calm: 0.05 } },
      awareness: { name: 'Watching Vein', rateMultiplier: 1.5, personalityWeight: { paranoid: 0.15, curious: 0.1 } },
    },
  },
  {
    id: 'nerve',
    name: 'Nerve',
    description: 'It flinches when you click too fast.',
    baseCost: 12000,
    baseRate: 47.0,
    costMultiplier: 1.15,
    paths: {
      growth: { name: 'Fortified Nerve', rateMultiplier: 2.0, personalityWeight: { calm: 0.15, bitter: 0.05 } },
      awareness: { name: 'Listening Nerve', rateMultiplier: 1.5, personalityWeight: { curious: 0.2, paranoid: 0.1 } },
    },
  },
  {
    id: 'synapse',
    name: 'Synapse',
    description: 'Connections spark. Brief patterns, almost like... thought.',
    baseCost: 130000,
    baseRate: 260.0,
    costMultiplier: 1.15,
    paths: {
      growth: { name: 'Rapid Synapse', rateMultiplier: 2.0, personalityWeight: { affectionate: 0.1, calm: 0.15 } },
      awareness: { name: 'Dreaming Synapse', rateMultiplier: 1.5, personalityWeight: { curious: 0.25, paranoid: 0.05 } },
    },
  },
  {
    id: 'cortex',
    name: 'Cortex',
    description: 'A structure forms. It hums quietly when you\'re not looking.',
    baseCost: 1400000,
    baseRate: 1400.0,
    costMultiplier: 1.15,
    paths: {
      growth: { name: 'Armored Cortex', rateMultiplier: 2.0, personalityWeight: { calm: 0.2, bitter: 0.1 } },
      awareness: { name: 'Awakened Cortex', rateMultiplier: 1.5, personalityWeight: { curious: 0.3, paranoid: 0.2 } },
    },
  },
];

function getGeneratorCost(generator, owned) {
  return Math.floor(generator.baseCost * Math.pow(generator.costMultiplier, owned));
}

function getGeneratorRate(generator, owned, chosenPath) {
  if (owned === 0) return 0;
  let rate = generator.baseRate * owned;
  if (chosenPath && generator.paths[chosenPath]) {
    rate *= generator.paths[chosenPath].rateMultiplier;
  }
  return rate;
}

module.exports = { GENERATORS, getGeneratorCost, getGeneratorRate };
