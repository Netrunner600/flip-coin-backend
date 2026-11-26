# Portal recovery — 26 November 2026

This branch prepares targeted repairs. It has not been deployed.

## Changes

- Use MySQL's normal default port, 3306, when DB_PORT is absent.
- Aggregate integer columns directly rather than generating CAST(... AS INTEGER).
- Group projected joined character fields and avoid an ungrouped history session ID.
- Qualify history country columns when joining character records.
- Atomically increment the selected history row by primary key, preserving older days.

Run `node --test tests/recovery.test.mjs` with Node.js 24. The six regressions execute
the actual service with isolated ORM/socket doubles. They are not MySQL integration
tests. CI also attempts a clean dependency installation and Nest build.

## Hosting evidence

The shared Premium hosting public_html contains default.php and dev01, not the
running Next.js application. The account also has VPS srv740768.hstgr.cloud
(Ubuntu 24.04, KVM 2, Phoenix), which is a candidate origin, not yet verified.
The VPS web console requires separate OS login. Weekly backups are listed for
16 and 23 November 2026; their application/database recoverability is untested.

## Before production deployment

1. Authenticate to the VPS using an existing owner-controlled login.
2. Verify nginx routing, named PM2 processes, deployed revisions and API errors.
3. Inspect the actual database schema/SQL mode and test these queries against it.
4. Back up the live database, upload directories and deployment configuration.
5. Stage the repair and verify API responses, gameplay and mobile behaviour.
6. Restart only the confirmed portal process and retain a rollback release.

## Still unresolved

This is not a complete counter/security rewrite. Authentication and upload safety,
idempotent batch acceptance, runtime count validation, concurrent first-row writes,
the legacy single-click endpoint, session identity and true rolling 24-hour totals
still need work. Failures during socket/statistics work can still follow a committed
write; the existing client must not gain automatic retries without idempotency.
Historical correctness cannot be established from repository source.

The VPS lists three SSH keys, including a developer-labelled key. Verify owner
access before revoking developer keys. Also inspect OS users, authorized_keys,
GitHub collaborators/deploy keys, account sharing and reused credentials. A new
repository does not revoke server credentials or erase existing code copies.
