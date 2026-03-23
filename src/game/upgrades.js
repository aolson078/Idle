/**
 * Upgrade definitions — multipliers and unlocks.
 * Each upgrade has a cost, effect, and optional flavor text
 * that shifts subtly across phases.
 */

const UPGRADES = [
  {
    id: 'click_power_1',
    name: 'Firmer Touch',
    description: 'Each click yields 2x Essence.',
    cost: 100,
    effect: { type: 'click_multiplier', value: 2 },
    requires: null,
    purchased: false,
  },
  {
    id: 'click_power_2',
    name: 'Heavy Hand',
    description: 'Each click yields 5x Essence.',
    cost: 5000,
    effect: { type: 'click_multiplier', value: 5 },
    requires: 'click_power_1',
    purchased: false,
  },
  {
    id: 'click_power_3',
    name: 'Crushing Grip',
    description: 'Each click yields 20x Essence. It trembles.',
    cost: 100000,
    effect: { type: 'click_multiplier', value: 20 },
    requires: 'click_power_2',
    purchased: false,
  },
  {
    id: 'gen_boost_1',
    name: 'Fertile Ground',
    description: 'All generators produce 2x Essence.',
    cost: 500,
    effect: { type: 'generator_multiplier', value: 2 },
    requires: null,
    purchased: false,
  },
  {
    id: 'gen_boost_2',
    name: 'Rich Soil',
    description: 'All generators produce 3x Essence.',
    cost: 25000,
    effect: { type: 'generator_multiplier', value: 3 },
    requires: 'gen_boost_1',
    purchased: false,
  },
  {
    id: 'gen_boost_3',
    name: 'Deep Nutrients',
    description: 'All generators produce 5x Essence. Growth accelerates beyond expectation.',
    cost: 500000,
    effect: { type: 'generator_multiplier', value: 5 },
    requires: 'gen_boost_2',
    purchased: false,
  },
  {
    id: 'offline_1',
    name: 'Dormant Growth',
    description: 'Earn 25% of production while away.',
    cost: 1000,
    effect: { type: 'offline_rate', value: 0.25 },
    requires: null,
    purchased: false,
  },
  {
    id: 'offline_2',
    name: 'Restless Sleep',
    description: 'Earn 50% of production while away. It doesn\'t really sleep.',
    cost: 50000,
    effect: { type: 'offline_rate', value: 0.50 },
    requires: 'offline_1',
    purchased: false,
  },
];

function canPurchaseUpgrade(upgrade, essence, purchasedUpgrades) {
  if (upgrade.purchased) return false;
  if (essence < upgrade.cost) return false;
  if (upgrade.requires && !purchasedUpgrades.includes(upgrade.requires)) return false;
  return true;
}

function getActiveEffects(upgrades) {
  const effects = {
    click_multiplier: 1,
    generator_multiplier: 1,
    offline_rate: 0,
  };

  for (const upgrade of upgrades) {
    if (!upgrade.purchased) continue;
    switch (upgrade.effect.type) {
      case 'click_multiplier':
        effects.click_multiplier = upgrade.effect.value;
        break;
      case 'generator_multiplier':
        effects.generator_multiplier *= upgrade.effect.value;
        break;
      case 'offline_rate':
        effects.offline_rate = upgrade.effect.value;
        break;
    }
  }

  return effects;
}

module.exports = { UPGRADES, canPurchaseUpgrade, getActiveEffects };
