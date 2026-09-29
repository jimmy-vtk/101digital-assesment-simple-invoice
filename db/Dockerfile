# PostgreSQL for SimpleInvoice. Credentials and database name come from the
# environment (POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB, set by
# docker-compose.yml); the schema is created by the backend's migrations.
FROM postgres:16-alpine

HEALTHCHECK --interval=5s --timeout=5s --retries=10 \
  CMD pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" || exit 1
