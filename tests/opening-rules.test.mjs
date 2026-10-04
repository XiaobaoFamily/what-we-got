import test from 'node:test';
import assert from 'node:assert/strict';
import { searchOpeningRules, openingSuggestedDays } from '../src/data/shelfLifeRules.ts';

const rule = (id, startFrom, conditions = ['opened']) => ({
  id, name: '测试食品', aliases: [], category: 'pantry', conditions,
  riskLevel: 'low', sourceIds: [],
  storage: { chilled: { minDays: 3, maxDays: 5, startFrom, advice: [] } }
});

test('opening suggestions exclude unopened and unrelated start dates; household rules come first', () => {
  const matches = searchOpeningRules('测试食品', 'chilled', [
    rule('builtin', 'opened'), rule('sealed', 'purchased', ['unopened']),
    rule('cooked', 'cooked', ['cooked']), rule('household:custom', 'opened')
  ]);
  assert.deepEqual(matches.map((entry) => entry.rule.id), ['household:custom', 'builtin']);
  assert.deepEqual(searchOpeningRules('没有匹配', 'chilled', [rule('one', 'opened')]), []);
  assert.deepEqual(searchOpeningRules('测试食品', 'frozen', [rule('one', 'opened')]), []);
});

test('suggest shorter duration, leave label-first and unspecified durations blank', () => {
  const guidance = rule('one', 'opened').storage.chilled;
  assert.equal(openingSuggestedDays(guidance), '3');
  assert.equal(openingSuggestedDays({ ...guidance, labelFirst: true }), '');
  assert.equal(openingSuggestedDays({ ...guidance, minDays: null, maxDays: null }), '');
  assert.equal(openingSuggestedDays(null), '');
});
