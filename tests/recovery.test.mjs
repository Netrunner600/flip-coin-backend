import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

// Exercise the actual service with isolated ORM/socket doubles. These tests
// do not establish compatibility with the production schema or SQL mode.
const Op = { gte: Symbol('gte'), between: Symbol('between'), ne: Symbol('ne') };
const Sequelize = {
  col: name => ({ col: name }),
  fn: (name, ...args) => ({ fn: name, args }),
  cast: () => { throw new Error('Unexpected SQL cast'); },
};
let source = readFileSync(new URL('../src/character/character.service.ts', import.meta.url), 'utf8');
source = source.replace(/^import .*;\r?\n/gm, '')
  .replace(/@Injectable\(\)\s*/g, '')
  .replace(/@InjectModel\([^)]*\)\s*/g, '')
  .replace('export class CharacterService', 'class CharacterService');
const CharacterService = vm.runInNewContext(
  stripTypeScriptTypes(source, { mode: 'transform' }) + '\nCharacterService;',
  { Op, Sequelize, Character: class {}, Date, console: { log() {}, error() {} } },
);

test('a batch increments only today, without rewriting historical totals', async () => {
  const rows = [{ id: 'yesterday', totalPlus: 100, totalMinus: 1, pointsChange: 99 },
    { id: 'today', totalPlus: 10, totalMinus: 2, pointsChange: 8 }];
  const history = {
    findOne: async options => {
      assert.ok(options.where.created_at[Op.between]);
      return { ...rows[1] };
    },
    increment: async (values, options) => {
      assert.deepEqual(Object.keys(options.where), ['id']);
      const row = rows.find(row => row.id === options.where.id);
      for (const [key, value] of Object.entries(values)) row[key] += value;
    },
    findAll: async () => [], sum: async () => 0,
  };
  const service = new CharacterService({ findByPk: async () => ({ id: 'character' }) }, history,
    { sendUpdate() {}, sendToUser() {} });
  service.getStats = async () => ({});
  service.characterPointsData = async () => ({});
  await service.batchUpdatePoints('session', { points: [
    { characterId: 'character', totalPlus: 2, totalMinus: 1, pointsChange: 1 },
  ] }, 'Australia', 'AU');
  assert.deepEqual(rows, [
    { id: 'yesterday', totalPlus: 100, totalMinus: 1, pointsChange: 99 },
    { id: 'today', totalPlus: 12, totalMinus: 3, pointsChange: 9 },
  ]);
});

test('simultaneous batches retain all increments on an existing row', async () => {
  const row = { id: 'today', totalPlus: 0, totalMinus: 0, pointsChange: 0 };
  const history = {
    findOne: async () => ({ ...row }),
    increment: async values => {
      await Promise.resolve();
      for (const [key, value] of Object.entries(values)) row[key] += value;
    },
    findAll: async () => [], sum: async () => 0,
  };
  const service = new CharacterService({ findByPk: async () => ({}) }, history,
    { sendUpdate() {}, sendToUser() {} });
  service.getStats = async () => ({});
  service.characterPointsData = async () => ({});
  await Promise.all(Array.from({ length: 100 }, () => service.batchUpdatePoints('session', {
    points: [{ characterId: 'character', totalPlus: 1, totalMinus: 0, pointsChange: 1 }],
  }, 'Australia', 'AU')));
  assert.equal(row.totalPlus, 100);
  assert.equal(row.pointsChange, 100);
});

test('character list avoids projecting ungrouped joined session IDs', async () => {
  let query;
  const service = new CharacterService({ findAll: async options => { query = options; return []; } }, {}, {});
  await service.getAllCharacters(undefined);
  assert.equal(query.include[0].attributes.length, 0);
  assert.equal(query.include[0].where.sessionId, '');
});

test('statistics avoid unsupported integer casts and group selected character fields', async () => {
  const queries = [];
  const service = new CharacterService({}, { findAll: async options => { queries.push(options); return []; } }, {});
  await service.getStats();
  assert.equal(queries.length, 3);
  for (const query of queries.slice(0, 2)) {
    for (const attribute of query.include[0].attributes) {
      assert.ok(query.group.includes(`character.${attribute}`), `Missing GROUP BY ${attribute}`);
    }
    assert.ok(query.group.includes('character.id'));
  }
});

test('per-character query qualifies joined country fields and grouping', async () => {
  let query;
  const service = new CharacterService({ findOne: async () => ({ name: 'Test' }) },
    { findAll: async options => { query = options; return []; } }, {});
  await service.characterPointsData('character', 'session');
  assert.ok(query.attributes.some(attribute => attribute[0]?.col === 'PointsHistory.country'));
  for (const attribute of query.include[0].attributes) {
    assert.ok(query.group.includes(`character.${attribute}`));
  }
});

test('MySQL port defaults to 3306 and respects explicit configuration', () => {
  const configSource = readFileSync(new URL('../src/config/database.config.ts', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export default', 'const config =');
  const load = env => vm.runInNewContext(configSource + '; config;', {
    process: { env }, registerAs: (_name, factory) => factory(),
  });
  assert.equal(load({}).port, 3306);
  assert.equal(load({ DB_PORT: '3307' }).port, 3307);
});
