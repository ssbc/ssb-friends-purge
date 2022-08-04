// SPDX-FileCopyrightText: 2022 Andre 'Staltz' Medeiros <contact@staltz.com>
//
// SPDX-License-Identifier: CC0-1.0

const test = require('tape');
const SecretStack = require('secret-stack');
const caps = require('ssb-caps');
const ssbKeys = require('ssb-keys');
const rimraf = require('rimraf');
const pify = require('util').promisify;
const {author, where, toPromise} = require('ssb-db2/operators');

const dir = '/tmp/ssb-friends-purge';

rimraf.sync(dir);

const keys = ssbKeys.generate('ed25519', 'alice');
let sbot;

test('setup', (t) => {
  sbot = SecretStack({appKey: caps.shs})
    .use(require('ssb-db2'))
    .use(require('ssb-friends'))
    .use(require('../lib/index'))
    .call(null, {keys, path: dir, friends: {hops: 2}});

  t.end();
});

test('block someone', async (t) => {
  const badPerson = ssbKeys.generate('ed25519', 'bob');

  await pify(sbot.db.create)({
    keys: badPerson,
    content: {type: 'post', text: 'I am toxic'},
  });

  const msgs1 = await sbot.db.query(where(author(badPerson.id)), toPromise());
  t.equals(msgs1.length, 1, 'there is one msg from the bad person');

  await pify(sbot.db.create)({
    keys,
    content: {
      type: 'contact',
      contact: badPerson.id,
      blocking: true,
      following: false,
    },
  });
  t.pass('we blocked the bad person');

  const isBlocking = await pify(sbot.friends.isBlocking)({
    source: sbot.id,
    dest: badPerson.id,
  });
  t.true(isBlocking, '"isBlocking" returns true');

  const msgs2 = await sbot.db.query(where(author(badPerson.id)), toPromise());
  t.equals(msgs2.length, 1, 'there is still one msg from the bad person');

  await pify(sbot.friendsPurge.start)();
  t.pass('start purging');

  await pify(setTimeout)(2000);
  t.pass('wait 2 seconds');

  const msgs3 = await sbot.db.query(where(author(badPerson.id)), toPromise());
  t.equals(msgs3.length, 0, 'there are zero msgs from the bad person');

  t.end();
});

test('teardown', (t) => {
  sbot.close(true, t.end);
});
