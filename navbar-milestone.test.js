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
  document: {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; }
  },
  window: {},
  Date,
};
vm.runInNewContext(source, context);

function makeContext(storageState = {}) {
  const storage = {
    data: { ...storageState },
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
    },
    setItem(key, value) {
      this.data[key] = String(value);
    },
    removeItem(key) {
      delete this.data[key];
    },
    key(index) {
      return Object.keys(this.data)[index] || null;
    },
    get length() {
      return Object.keys(this.data).length;
    }
  };

  const body = {
    children: [],
    appendChild(node) {
      this.children.push(node);
      return node;
    },
    removeChild(node) {
      this.children = this.children.filter(item => item !== node);
    }
  };

  const navbarClasses = new Set();
  const navbar = {
    classList: {
      add(className) {
        navbarClasses.add(className);
      },
      remove(...classNames) {
        classNames.forEach(className => navbarClasses.delete(className));
      },
      contains(className) {
        return navbarClasses.has(className);
      }
    }
  };
  const perDayDisplay = { textContent: '' };
  const document = {
    body,
    addEventListener() {},
    createElement(tagName) {
      return {
        tagName,
        style: {},
        textContent: '',
        hidden: false,
        click() {},
        remove() {
          body.removeChild(this);
        },
        appendChild() {},
        setAttribute() {},
      };
    },
    getElementById(id) {
      return id === 'navbar-per-day' ? perDayDisplay : null;
    },
    querySelector(selector) {
      return selector === '.navbar' ? navbar : null;
    }
  };

  const context = {
    console,
    localStorage: storage,
    document,
    window: {},
    URL: {
      createObjectURL() { return 'blob://test'; },
      revokeObjectURL() {}
    },
    Date,
    JSZip: class JSZip {
      static instances = [];
      constructor() {
        this.files = {};
        JSZip.instances.push(this);
      }
      file(name, value) {
        this.files[name] = value;
      }
      generateAsync() {
        return Promise.resolve({});
      }
    }
  };

  vm.runInNewContext(source, context);
  return { context, storage, document, navbar, navbarClasses, perDayDisplay };
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

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

test('the 7-hour average remains its own milestone', () => {
  assert.equal(getTarget(7.00), 7);
  assert.equal(getNeeded(7.00, 4, 0), 0);
});

test('milestone target is 8 for averages above 7', () => {
  assert.equal(getTarget(7.01), 8);
  assert.equal(getTarget(8), 8);
  assert.equal(getNeeded(7.25, 4, 0), 3);
  assert.equal(getNeeded(7.25, 4, 1), 2.25);
  assert.equal(getNeeded(9.25, 4, 1), 0);
});

test('navbar shows hours needed to reach 8 above 7 and turns golden above 8', () => {
  const { context, navbar, perDayDisplay } = makeContext();
  context.getCurrentWeekPerDay = () => 7.25;
  context.weekdaysRemainingInWeek = () => 1;

  context.updateNavbarPerDay();

  assert.equal(perDayDisplay.textContent, 'This Week: 7.25 h/day • Need 3.00 h today to reach 8.00 h/day');
  assert.equal(navbar.classList.contains('per-day-good'), true);

  context.getCurrentWeekPerDay = () => 8;
  context.updateNavbarPerDay();

  assert.equal(navbar.classList.contains('per-day-good'), true);
  assert.equal(navbar.classList.contains('per-day-excellent'), false);

  context.getCurrentWeekPerDay = () => 8.01;
  context.updateNavbarPerDay();

  assert.equal(navbar.classList.contains('per-day-good'), false);
  assert.equal(navbar.classList.contains('per-day-excellent'), true);
  assert.equal(navbar.classList.contains('per-day-bad'), false);
});

test('downloadAllTimeSplits only includes entries changed since the last export', async () => {
  const { context, storage } = makeContext({
    key1: 'old-value',
    key2: 'same-value',
    key3: 'gone'
  });

  storage.setItem('lastExportHashes', JSON.stringify({
    key1: String(hashString('old-value')),
    key2: String(hashString('same-value')),
    key3: String(hashString('old-value'))
  }));

  storage.setItem('key1', 'new-value');
  storage.setItem('key2', 'same-value');
  storage.removeItem('key3');

  await context.downloadAllTimeSplits();
  await new Promise(resolve => setTimeout(resolve, 0));

  const zip = context.JSZip.instances.at(-1);
  assert.ok(zip);
  assert.deepEqual(Object.keys(zip.files).sort(), ['key1.json']);
  assert.equal(storage.getItem('lastExportHashes'), JSON.stringify({
    key1: String(hashString('new-value')),
    key2: String(hashString('same-value'))
  }));
});

test('downloadAllTimeSplits skips the zip when no localStorage entries changed', async () => {
  const { context, storage, document } = makeContext({
    key1: 'same-value',
    key2: 'another-value'
  });

  storage.setItem('lastExportHashes', JSON.stringify({
    key1: String(hashString('same-value')),
    key2: String(hashString('another-value'))
  }));

  await context.downloadAllTimeSplits();
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(context.JSZip.instances.length, 0);
  assert.ok(document.body.children.some(node => node.textContent && node.textContent.includes('No changes')));
});
