-- Companies House verification proofs, stored in the database so they survive deploys.
-- Before this, proofs were written to the app folder, which is replaced on every deploy.
CREATE TABLE IF NOT EXISTS ch_verification_file (
    id          BIGSERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    filename    TEXT    NOT NULL UNIQUE,
    mime        TEXT    NOT NULL,
    bytes       BYTEA   NOT NULL,
    size_bytes  INTEGER NOT NULL,
    created_at  BIGINT  NOT NULL
);
CREATE INDEX IF NOT EXISTS ch_verification_file_user_idx ON ch_verification_file (user_id);
