-- ============================================================
-- Ajaia Docs – Supabase Schema  (safe to re-run)
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Profiles
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL DEFAULT '',
  full_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-create profile on signup
-- SET search_path = public  →  ensures the trigger can find the table
-- EXCEPTION block           →  never let a trigger failure block signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET email     = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but never fail the signup
  RAISE WARNING 'handle_new_user failed: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 2. Documents
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL DEFAULT 'Untitled Document',
  content     JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
  owner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documents_set_updated_at ON public.documents;
CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 3. Document Shares
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_shares (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  shared_with_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission       TEXT NOT NULL DEFAULT 'edit' CHECK (permission IN ('view', 'edit')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (document_id, shared_with_id)
);

-- ────────────────────────────────────────────────────────────
-- 4. Row Level Security
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe to re-run)
DROP POLICY IF EXISTS "Authenticated users can read profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"            ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"            ON public.profiles;
DROP POLICY IF EXISTS "Owner has full access to their documents" ON public.documents;
DROP POLICY IF EXISTS "Shared users can read documents"         ON public.documents;
DROP POLICY IF EXISTS "Shared editors can update documents"     ON public.documents;
DROP POLICY IF EXISTS "Document owner can manage shares"        ON public.document_shares;
DROP POLICY IF EXISTS "Shared user can view their share"        ON public.document_shares;

-- profiles
CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- documents: owner full access
CREATE POLICY "Owner has full access to their documents"
  ON public.documents FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- documents: shared users can read
CREATE POLICY "Shared users can read documents"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.document_shares
      WHERE document_shares.document_id = documents.id
        AND document_shares.shared_with_id = auth.uid()
    )
  );

-- documents: shared editors can update
CREATE POLICY "Shared editors can update documents"
  ON public.documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.document_shares
      WHERE document_shares.document_id = documents.id
        AND document_shares.shared_with_id = auth.uid()
        AND document_shares.permission = 'edit'
    )
  );

-- document_shares: owner manages, shared user reads their own
CREATE POLICY "Document owner can manage shares"
  ON public.document_shares FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_shares.document_id
        AND documents.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_shares.document_id
        AND documents.owner_id = auth.uid()
    )
  );

CREATE POLICY "Shared user can view their share"
  ON public.document_shares FOR SELECT
  USING (shared_with_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 5. Indexes
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_documents_owner_id       ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at     ON public.documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_shares_document_id       ON public.document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_shares_shared_with_id    ON public.document_shares(shared_with_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email           ON public.profiles(email);
