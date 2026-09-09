const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('./functions.js', 'utf8');
const context = {
  console,
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  },
  document: { getElementById() { return null; }, querySelector() { return null; } },
  window: {},
  Date,
};
vm.runInNewContext(source, context);

function getTarget(value) {
  return context.getNextMilestoneTarget(value);
}

function getNeeded(value, daysPassed = 1, daysOff = 0) {
  return context.getHoursNeededForNextMilestone(value, daysPassed, daysOff);
}

test('milestone target is 6 for averages under 6', () => {
  assert.equal(getTarget(5.50), 6);
  assert.equal(getNeeded(5.50, 5, 0), 2.5);
  assert.equal(getNeeded(5.50, 5, 1), 2.0);
});

test('milestone target is 7 for averages between 6 and 7', () => {
  assert.equal(getTarget(6.25), 7);
  assert.equal(getNeeded(6.25, 4, 0), 3);
  assert.equal(getNeeded(6.25, 4, 1), 2.25);
});

test('no additional hours are needed once average is at or above 7', () => {
  assert.equal(getTarget(7.00), 7);
  assert.equal(getNeeded(7.00, 4, 0), 0);
  assert.equal(getNeeded(9.25, 4, 1), 0);
});
