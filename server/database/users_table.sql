-- users_table.sql
-- Creates only the public.users table and its required supporting objects.

CREATE SCHEMA IF NOT EXISTS public;

-- Keeps updated_at in sync on UPDATEs
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Sequence backing users.id
CREATE SEQUENCE IF NOT EXISTS public.users_id_seq
  AS integer
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id integer NOT NULL DEFAULT nextval('public.users_id_seq'::regclass),
  username character varying(50) NOT NULL,
  password_hash character varying(255) NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  last_login timestamp with time zone,
  first_name character varying(100) NOT NULL,
  last_name character varying(100) NOT NULL,
  email character varying(255) NOT NULL,
  date_of_birth date,
  role character varying(50) DEFAULT 'user',
  profile_picture character varying(500),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_username_key UNIQUE (username),
  CONSTRAINT users_email_key UNIQUE (email)
);

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users USING btree (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS users_profile_picture_idx ON public.users USING btree (id)
  WHERE (profile_picture IS NOT NULL);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
