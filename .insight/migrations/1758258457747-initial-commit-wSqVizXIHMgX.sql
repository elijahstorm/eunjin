BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
CREATE TYPE organization_role AS ENUM ('owner','admin','member','viewer');
CREATE TYPE session_status AS ENUM ('draft','live','ended','archived');
CREATE TYPE recording_source AS ENUM ('live','imported','upload');
CREATE TYPE recording_provider AS ENUM ('none','zoom','teams','manual');
CREATE TYPE recording_status AS ENUM ('pending','processing','ready','failed');
CREATE TYPE transcript_provider AS ENUM ('deepgram','assemblyai','whisper','other');
CREATE TYPE transcript_status AS ENUM ('processing','ready','failed');
CREATE TYPE highlight_source AS ENUM ('live','uploaded','imported');
CREATE TYPE summary_type AS ENUM ('full_transcript','highlight_summary');
CREATE TYPE job_status AS ENUM ('pending','processing','ready','failed');
CREATE TYPE consent_status AS ENUM ('pending','granted','denied','revoked');

-- Timestamp trigger
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users (app profile) referencing Supabase auth.users
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  full_name text,
  avatar_url text,
  default_language_code varchar(16) NOT NULL DEFAULT 'ko',
  time_zone text NOT NULL DEFAULT 'Asia/Seoul',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  default_language_code varchar(16) NOT NULL DEFAULT 'ko',
  billing_email text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_organizations_created_by ON public.organizations(created_by);
CREATE TRIGGER set_timestamp_organizations
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Organization members
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  role organization_role NOT NULL DEFAULT 'member',
  invited_by uuid REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE TRIGGER set_timestamp_organization_members
BEFORE UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Sessions (meetings/lectures)
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  title text NOT NULL,
  description text,
  status session_status NOT NULL DEFAULT 'draft',
  language_code varchar(16) NOT NULL DEFAULT 'ko',
  timezone text,
  consent_required boolean NOT NULL DEFAULT true,
  address text,
  latitude double precision,
  longitude double precision,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT latitude_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);
CREATE INDEX idx_sessions_org ON public.sessions(organization_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_sessions_scheduled_start ON public.sessions(scheduled_start DESC);
CREATE INDEX idx_sessions_actual_start ON public.sessions(actual_start DESC);
CREATE TRIGGER set_timestamp_sessions
BEFORE UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Recordings
CREATE TABLE public.recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  source recording_source NOT NULL DEFAULT 'live',
  provider recording_provider NOT NULL DEFAULT 'none',
  status recording_status NOT NULL DEFAULT 'pending',
  storage_path text,
  original_url text,
  duration_seconds integer,
  sample_rate integer,
  channels integer,
  file_size_bytes bigint,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_recordings_session ON public.recordings(session_id);
CREATE INDEX idx_recordings_status ON public.recordings(status);
CREATE TRIGGER set_timestamp_recordings
BEFORE UPDATE ON public.recordings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Speakers (per session)
CREATE TABLE public.speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  label text NOT NULL,
  display_name text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, label)
);
CREATE INDEX idx_speakers_session ON public.speakers(session_id);
CREATE INDEX idx_speakers_user ON public.speakers(user_id);
CREATE TRIGGER set_timestamp_speakers
BEFORE UPDATE ON public.speakers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Transcripts (runs)
CREATE TABLE public.transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  recording_id uuid REFERENCES public.recordings(id) ON DELETE SET NULL ON UPDATE CASCADE,
  provider transcript_provider NOT NULL,
  status transcript_status NOT NULL DEFAULT 'processing',
  language_code varchar(16),
  punctuated boolean NOT NULL DEFAULT true,
  diarized boolean NOT NULL DEFAULT true,
  avg_confidence numeric(4,3),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_transcripts_session ON public.transcripts(session_id);
CREATE INDEX idx_transcripts_status ON public.transcripts(status);
CREATE INDEX idx_transcripts_recording ON public.transcripts(recording_id);
CREATE TRIGGER set_timestamp_transcripts
BEFORE UPDATE ON public.transcripts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Transcript segments
CREATE TABLE public.transcript_segments (
  id bigserial PRIMARY KEY,
  transcript_id uuid NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  speaker_id uuid REFERENCES public.speakers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  start_ms integer NOT NULL,
  end_ms integer,
  text text NOT NULL,
  confidence numeric(4,3),
  is_final boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT segment_time_range CHECK (end_ms IS NULL OR end_ms >= start_ms)
);
CREATE INDEX idx_segments_transcript_start ON public.transcript_segments(transcript_id, start_ms);
CREATE INDEX idx_segments_session_start ON public.transcript_segments(session_id, start_ms);
CREATE INDEX idx_segments_speaker ON public.transcript_segments(speaker_id);
CREATE TRIGGER set_timestamp_transcript_segments
BEFORE UPDATE ON public.transcript_segments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Highlights
CREATE TABLE public.highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  source highlight_source NOT NULL DEFAULT 'live',
  start_ms integer,
  end_ms integer,
  related_speaker_id uuid REFERENCES public.speakers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  note text,
  uploaded_raw_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT highlight_time_range CHECK (end_ms IS NULL OR start_ms IS NULL OR end_ms >= start_ms)
);
CREATE INDEX idx_highlights_session ON public.highlights(session_id);
CREATE INDEX idx_highlights_creator ON public.highlights(created_by);
CREATE TRIGGER set_timestamp_highlights
BEFORE UPDATE ON public.highlights
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Summaries (outputs)
CREATE TABLE public.summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type summary_type NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  model text,
  prompt_version text,
  input_token_count integer,
  output_token_count integer,
  content text,
  content_url text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_summaries_session ON public.summaries(session_id);
CREATE INDEX idx_summaries_type ON public.summaries(type);
CREATE INDEX idx_summaries_status ON public.summaries(status);
CREATE TRIGGER set_timestamp_summaries
BEFORE UPDATE ON public.summaries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Consent records
CREATE TABLE public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  subject_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  subject_name text,
  subject_email text,
  status consent_status NOT NULL DEFAULT 'pending',
  method text,
  evidence_url text,
  recorded_at timestamptz,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_scope CHECK (organization_id IS NOT NULL OR session_id IS NOT NULL)
);
CREATE INDEX idx_consents_org ON public.consents(organization_id);
CREATE INDEX idx_consents_session ON public.consents(session_id);
CREATE INDEX idx_consents_status ON public.consents(status);
CREATE TRIGGER set_timestamp_consents
BEFORE UPDATE ON public.consents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;