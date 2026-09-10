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

  const document = {
    body,
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
    getElementById() { return null; },
    querySelector() { return null; }
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
  return { context, storage, document };
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

test('no additional hours are needed once average is at or above 7', () => {
  assert.equal(getTarget(7.00), 7);
  assert.equal(getNeeded(7.00, 4, 0), 0);
  assert.equal(getNeeded(9.25, 4, 1), 0);
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
