BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TYPE file_type_enum AS ENUM ('pdf','docx','pptx','txt','image');
CREATE TYPE document_status_enum AS ENUM ('uploaded','parsing','chunking','embedding','indexing','summarizing','quiz_generating','ready','failed');
CREATE TYPE job_type_enum AS ENUM ('parse','ocr','chunk','embed','summarize','quiz_generate');
CREATE TYPE job_status_enum AS ENUM ('queued','processing','succeeded','failed','cancelled');
CREATE TYPE summary_length_enum AS ENUM ('short','medium','long');
CREATE TYPE summary_scope_enum AS ENUM ('full','section');
CREATE TYPE question_type_enum AS ENUM ('multiple_choice','short_answer','free_text','flashcard');
CREATE TYPE difficulty_enum AS ENUM ('easy','medium','hard');
CREATE TYPE chat_role_enum AS ENUM ('system','user','assistant');
CREATE TYPE srs_origin_type_enum AS ENUM ('quiz_question','chunk');
CREATE TYPE srs_card_status_enum AS ENUM ('active','suspended','archived');
CREATE TYPE ui_theme_enum AS ENUM ('system','light','dark');
CREATE TYPE consent_type_enum AS ENUM ('terms_of_service','privacy_policy','marketing_contact');
CREATE TYPE usage_event_type_enum AS ENUM ('embedding','chat_completion','summary','quiz_generation','ocr','parsing','storage');
CREATE TYPE language_code_enum AS ENUM ('ko','en');
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  preferred_language language_code_enum NOT NULL DEFAULT 'ko',
  ui_theme ui_theme_enum NOT NULL DEFAULT 'system',
  palette_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  consent_type consent_type_enum NOT NULL,
  version text,
  given_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX user_consents_one_active_per_type ON user_consents (user_id, consent_type) WHERE revoked_at IS NULL;
CREATE INDEX user_consents_user_id_idx ON user_consents (user_id);
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  title text NOT NULL,
  original_filename text NOT NULL,
  file_type file_type_enum NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes integer NOT NULL CHECK (file_size_bytes >= 0 AND file_size_bytes <= 20971520),
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  page_count integer,
  language language_code_enum DEFAULT 'ko',
  ocr_used boolean NOT NULL DEFAULT false,
  status document_status_enum NOT NULL DEFAULT 'uploaded',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX documents_user_id_idx ON documents (user_id);
CREATE INDEX documents_status_idx ON documents (status);
CREATE UNIQUE INDEX documents_user_path_unique ON documents (user_id, storage_bucket, storage_path);
CREATE TABLE document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  chunk_index integer NOT NULL,
  text text NOT NULL,
  page_number integer,
  slide_number integer,
  char_start integer,
  char_end integer,
  tokens integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index),
  CHECK (char_start IS NULL OR char_end IS NULL OR char_end >= char_start)
);
CREATE INDEX document_chunks_document_id_idx ON document_chunks (document_id);
CREATE INDEX document_chunks_page_idx ON document_chunks (page_number);
CREATE TABLE chunk_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  chunk_id uuid NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  embedding vector(1536) NOT NULL,
  embedding_model text NOT NULL DEFAULT 'text-embedding-3-small',
  embedding_dim smallint NOT NULL DEFAULT 1536,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chunk_id, embedding_model)
);
CREATE INDEX chunk_embeddings_document_id_idx ON chunk_embeddings (document_id);
CREATE INDEX chunk_embeddings_chunk_id_idx ON chunk_embeddings (chunk_id);
CREATE INDEX chunk_embeddings_embedding_ivfflat ON chunk_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE TABLE summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  scope summary_scope_enum NOT NULL DEFAULT 'full',
  length summary_length_enum NOT NULL DEFAULT 'medium',
  section_label text,
  page_from integer,
  page_to integer,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX summaries_document_id_idx ON summaries (document_id);
CREATE INDEX summaries_user_id_idx ON summaries (user_id);
CREATE TYPE quiz_set_type_enum AS ENUM ('regular','personalized','srs_review');
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  job_type job_type_enum NOT NULL,
  status job_status_enum NOT NULL DEFAULT 'queued',
  priority smallint NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  last_error text,
  payload jsonb,
  result jsonb,
  run_after timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_status_priority_idx ON jobs (status, priority DESC, run_after NULLS FIRST, created_at);
CREATE INDEX jobs_document_id_idx ON jobs (document_id);
CREATE INDEX jobs_user_id_idx ON jobs (user_id);
CREATE TABLE quiz_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type quiz_set_type_enum NOT NULL DEFAULT 'regular',
  title text NOT NULL,
  source_scope summary_scope_enum DEFAULT 'full',
  difficulty difficulty_enum DEFAULT 'medium',
  created_by_job_id uuid REFERENCES jobs(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quiz_sets_user_id_idx ON quiz_sets (user_id);
CREATE INDEX quiz_sets_document_id_idx ON quiz_sets (document_id);
CREATE TABLE quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_set_id uuid NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  question_type question_type_enum NOT NULL,
  prompt text NOT NULL,
  options jsonb,
  correct_answer jsonb,
  explanation text,
  difficulty difficulty_enum,
  chunk_id uuid REFERENCES document_chunks(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quiz_questions_quiz_set_idx ON quiz_questions (quiz_set_id);
CREATE INDEX quiz_questions_chunk_id_idx ON quiz_questions (chunk_id);
CREATE TABLE quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_set_id uuid NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  score numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quiz_attempts_user_id_idx ON quiz_attempts (user_id);
CREATE INDEX quiz_attempts_quiz_set_id_idx ON quiz_attempts (quiz_set_id);
CREATE TABLE question_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_attempt_id uuid NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_answer jsonb,
  is_correct boolean,
  score numeric(5,2),
  responded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_attempt_id, question_id)
);
CREATE INDEX question_attempts_attempt_idx ON question_attempts (quiz_attempt_id);
CREATE INDEX question_attempts_question_idx ON question_attempts (question_id);
CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL ON UPDATE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_sessions_user_id_idx ON chat_sessions (user_id);
CREATE INDEX chat_sessions_document_id_idx ON chat_sessions (document_id);
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  role chat_role_enum NOT NULL,
  content text NOT NULL,
  tokens_in integer,
  tokens_out integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_session_time_idx ON chat_messages (session_id, created_at);
CREATE TABLE chat_message_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE ON UPDATE CASCADE,
  chunk_id uuid NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  similarity double precision,
  start_offset integer,
  end_offset integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, chunk_id, start_offset, end_offset)
);
CREATE INDEX chat_message_citations_message_idx ON chat_message_citations (message_id);
CREATE INDEX chat_message_citations_chunk_idx ON chat_message_citations (chunk_id);
CREATE TABLE srs_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  origin_type srs_origin_type_enum NOT NULL,
  origin_id uuid NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL ON UPDATE CASCADE,
  quiz_question_id uuid REFERENCES quiz_questions(id) ON DELETE SET NULL ON UPDATE CASCADE,
  chunk_id uuid REFERENCES document_chunks(id) ON DELETE SET NULL ON UPDATE CASCADE,
  due_at timestamptz NOT NULL,
  last_reviewed_at timestamptz,
  interval_days integer NOT NULL DEFAULT 0,
  ease_factor numeric(4,2) NOT NULL DEFAULT 2.50,
  repetitions integer NOT NULL DEFAULT 0,
  status srs_card_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, origin_type, origin_id)
);
CREATE INDEX srs_cards_user_due_idx ON srs_cards (user_id, due_at);
CREATE TABLE srs_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES srs_cards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  quality smallint NOT NULL CHECK (quality >= 0 AND quality <= 5),
  previous_interval_days integer,
  new_interval_days integer,
  previous_ease_factor numeric(4,2),
  new_ease_factor numeric(4,2),
  previous_repetitions integer,
  new_repetitions integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX srs_reviews_card_id_idx ON srs_reviews (card_id, reviewed_at);
CREATE TABLE usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  related_document_id uuid REFERENCES documents(id) ON DELETE SET NULL ON UPDATE CASCADE,
  related_job_id uuid REFERENCES jobs(id) ON DELETE SET NULL ON UPDATE CASCADE,
  event_type usage_event_type_enum NOT NULL,
  provider text,
  model text,
  tokens_input integer,
  tokens_output integer,
  unit_cost_usd numeric(10,6),
  total_cost_usd numeric(12,6),
  metadata jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX usage_events_user_time_idx ON usage_events (user_id, occurred_at);
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_timestamp_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_user_consents BEFORE UPDATE ON user_consents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_documents BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_document_chunks BEFORE UPDATE ON document_chunks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_chunk_embeddings BEFORE UPDATE ON chunk_embeddings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_summaries BEFORE UPDATE ON summaries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_jobs BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_quiz_sets BEFORE UPDATE ON quiz_sets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_quiz_questions BEFORE UPDATE ON quiz_questions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_quiz_attempts BEFORE UPDATE ON quiz_attempts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_question_attempts BEFORE UPDATE ON question_attempts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_chat_sessions BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_chat_messages BEFORE UPDATE ON chat_messages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_chat_message_citations BEFORE UPDATE ON chat_message_citations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_srs_cards BEFORE UPDATE ON srs_cards FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_srs_reviews BEFORE UPDATE ON srs_reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_timestamp_usage_events BEFORE UPDATE ON usage_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
COMMIT;