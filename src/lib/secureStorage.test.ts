/**
 * Self-check for the chunking in secureStorage.
 * Run with: npx tsx src/lib/secureStorage.test.ts
 *
 * expo-secure-store is native-only, so it is stubbed with an in-memory map that
 * enforces the same 2048-byte ceiling the real module does.
 */
import assert from 'node:assert/strict';
import Module from 'node:module';

const store = new Map<string, string>();

const require_ = Module.prototype.require;
(Module.prototype as any).require = function (id: string) {
  if (id === 'expo-secure-store') {
    return {
      async getItemAsync(k: string) {
        return store.has(k) ? store.get(k)! : null;
      },
      async setItemAsync(k: string, v: string) {
        const bytes = Buffer.byteLength(v, 'utf8');
        assert.ok(bytes <= 2048, `chunk ${k} is ${bytes} bytes, over the 2048 limit`);
        store.set(k, v);
      },
      async deleteItemAsync(k: string) {
        store.delete(k);
      },
    };
  }
  return require_.apply(this, arguments as any);
};

const { secureStorage } = require('./secureStorage') as typeof import('./secureStorage');

const KEY = 'sb-project-auth-token';

async function roundTrip(label: string, value: string) {
  await secureStorage.setItem(KEY, value);
  assert.equal(await secureStorage.getItem(KEY), value, label);
}

async function main() {
  assert.equal(await secureStorage.getItem(KEY), null, 'missing key reads as null');

  await roundTrip('short value', 'hello');
  await roundTrip('empty value', '');
  await roundTrip('exactly one chunk', 'a'.repeat(500));
  await roundTrip('one char over a chunk', 'a'.repeat(501));
  await roundTrip('exact multiple of chunk size', 'b'.repeat(1500));
  await roundTrip('realistic session', JSON.stringify({ token: 'x'.repeat(4000), name: 'Jorge Sánchez' }));
  await roundTrip('multi-byte throughout', 'á'.repeat(3000));
  // Surrogate pairs must survive landing exactly on a chunk boundary.
  await roundTrip('emoji on the boundary', 'a'.repeat(499) + '🎓'.repeat(200));
  await roundTrip('all emoji', '🎓'.repeat(600));

  // A shorter value must not leave chunks of the previous longer one behind.
  await secureStorage.setItem(KEY, 'z'.repeat(5000));
  await secureStorage.setItem(KEY, 'short');
  assert.equal(await secureStorage.getItem(KEY), 'short', 'no orphaned chunks after shrink');

  await secureStorage.removeItem(KEY);
  assert.equal(await secureStorage.getItem(KEY), null, 'removed key reads as null');
  assert.equal(store.size, 0, 'removeItem leaves nothing behind');

  console.log('secureStorage: all checks passed');
}

main();
