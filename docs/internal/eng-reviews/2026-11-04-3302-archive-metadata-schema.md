# Schema-qualify the archive metadata SQL

Issue: #3302 (follow-up from the review of #3745)  
Branch: `fix/3302-archive-metadata-schema`  
Scope: `PropertyRepository` archive metadata helpers

## Findings and decisions

| Area | Finding | Decision |
|---|---|---|
| Column lookup | `getArchiveMetadataColumns` filtered on `current_schema()`. The DSQL connection sets no `search_path` (the TypeORM `schema` option only qualifies entity tables), so this resolves to `public`, where `property` does not exist. The lookup returned no rows and every caller returned early. | Filter on `table_schema = $1` with the schema resolved from the client. |
| Raw updates | `UPDATE property ...` in `updatePropertyStatus` and `clearArchiveMetadata` was unqualified. | Use `"<schema>"."property"`. |
| Production effect | Archiving never recorded `archivedat`, `archivedby` or `archivereason`, and resubmitting an ARCHIVED listing (ARCHIVED to PENDING_REVIEW) never cleared them. Verified read-only: the columns exist in `main` only and `public.property` does not exist. | Fixed by the two changes above. |
| Transaction | The transaction manager has no `options`, so it cannot resolve the schema itself. | `transitionStatusWithEvent` resolves the schema once from the outer client and passes it in. |
| Resolver | Same rule as the other PropertyHandler repositories: `TEST=true` gives `test`, otherwise `client.options.schema` validated against `/^[A-Za-z_]\w*$/`, lowercased, `public` mapped to `main`, fallback `main`, identifier quoted. | Private resolver in `propertyRepository.js`. A shared helper in `.shared` stays a separate refactor. |
| `transitionStatus` | No production caller; scheduled for removal. | Kept working, not otherwise changed. Removed on branch `chore/3302-remove-transitionstatus` (see `2026-11-11-3302-remove-transitionstatus.md`). |

## Verification

- Tests assert the qualified SQL and the `$1` schema parameter for `main`, `test`, and invalid or unset schemas.
- The transaction path issues the qualified SQL on the manager and never on the outer client.
- Mutation check: restoring `current_schema()` makes the schema tests fail.

## Follow-up

- `archivedat`, `archivedby` and `archivereason` are in no entity and no migration, and they are missing in the `test` schema. This is schema drift: `test` silently skips the metadata, `main` writes it. Add the columns to the `Property` entity and a migration for both schemas.
- Extract the duplicated schema resolver into `.shared`.
