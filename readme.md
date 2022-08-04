<!--
SPDX-FileCopyrightText: 2022 Andre 'Staltz' Medeiros <contact@staltz.com>

SPDX-License-Identifier: CC0-1.0
-->

# ssb-friends-purge

> SSB plugin to automatically delete blocked feeds

If you have [ssb-db2](https://github.com/ssbc/ssb-db2), then it supports
deleting **all** messages from a feed. We use that functionality to comb through
all feeds at *negative hops distance*, i.e. blocked feeds and their friends, and
delete their messages.

Combine that with the `compact` feature in ssb-db2 and now your database can
shrink in size the more blocked feeds there are.

## Install

```
npm install ssb-friends-purge
```

## Usage

- Requires **Node.js 12** or higher
- Requires `secret-stack@^6.2.0`
- Requires `ssb-db2>=4.2.0`
- Requires `ssb-friends@>=5.0.0`

```diff
 SecretStack({appKey: require('ssb-caps').shs})
   .use(require('ssb-master'))
+  .use(require('ssb-db2'))
+  .use(require('ssb-friends'))
+  .use(require('ssb-friends-purge'))
   .use(require('ssb-conn'))
   .use(require('ssb-blobs'))
   .call(null, config)
```

Now you should be able to access the following muxrpc APIs under
`ssb.friendsPurge.*`:

| API | Type | Description |
|-----|------|-------------|
| **`start()`** | `sync` | Triggers the start of purge task. |
| **`stop()`** | `sync` | Stops the purge task if it is currently active. |

## License

LGPL-3.0
