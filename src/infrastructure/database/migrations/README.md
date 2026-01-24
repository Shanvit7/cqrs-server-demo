# Database Migrations

This directory contains database migrations in the format: `{timestamp}_{description}/`

Each migration directory should contain:

- `up.sql` - Migration SQL to apply
- `down.sql` - Rollback SQL to revert

## Migration Naming

Format: `YYYYMMDDHHMMSS_description`

Example: `20250124000000_create_event_store`

## Usage

```bash
# Run pending migrations
bun run migrate up

# Rollback last migration
bun run migrate down

# Rollback last 2 migrations
bun run migrate down 2

# Check migration status
bun run migrate status
```

## Creating a New Migration

1. Create a new directory: `YYYYMMDDHHMMSS_your_description/`
2. Add `up.sql` with your migration SQL
3. Add `down.sql` with rollback SQL
4. Run `bun run migrate up` to apply
