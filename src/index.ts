// SPDX-FileCopyrightText: 2022 Andre 'Staltz' Medeiros <contact@staltz.com>
//
// SPDX-License-Identifier: LGPL-3.0-only

import {FeedId} from 'ssb-typescript';
const pull = require('pull-stream');
const debug = require('debug')('ssb:friends-purge');

export = {
  name: 'friendsPurge',
  version: '1.0.0',
  manifest: {
    start: 'sync',
    stop: 'sync',
  },
  permissions: {
    master: {
      allow: ['start', 'stop'],
    },
  },
  init: function init(ssb: any) {
    const queue = [] as Array<FeedId>;
    let isDeleting = false;
    let wantsToStart = false;
    let sink: {abort: CallableFunction} | null = null;

    ssb.db.getIndexingActive()((active: number) => {
      if (active > 0) {
        pause();
      } else {
        if (wantsToStart) resume();
      }
    });

    function deleteNext() {
      isDeleting = true;
      if (queue.length === 0) {
        isDeleting = false;
        return;
      }
      const feedId = queue.shift();
      const start = Date.now();
      ssb.db.deleteFeed(feedId, (err: any) => {
        if (err) {
          console.warn(err);
        } else {
          const duration = Date.now() - start;
          debug('deleted %s in %dms', feedId, duration);
          setImmediate(deleteNext);
        }
      });
    }

    function resume() {
      pull(
        ssb.friends.hopStream({old: true, live: true}),
        (sink = pull.drain((hops: Record<FeedId, number>) => {
          for (let feedId in hops) {
            if (hops[feedId] < 0) {
              queue.push(feedId);
            }
          }
          if (queue.length === 0 || isDeleting) return;
          // Make sure no indexing is ongoing when a burst of deletes starts:
          ssb.db.onDrain('base', () => {
            ssb.db.onDrain('contacts', () => {
              if (queue.length > 0 && !isDeleting) deleteNext();
            });
          });
        })),
      );
    }

    function pause() {
      if (sink) {
        sink.abort();
        sink = null;
      }
    }

    return {
      start() {
        wantsToStart = true;
        if (ssb.db.getIndexingActive().value > 0) return;
        else resume();
      },

      stop() {
        wantsToStart = false;
        pause();
      },
    };
  },
};
