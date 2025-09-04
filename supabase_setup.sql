-- SUPABASE SETUP - Run these commands in Supabase SQL Editor
-- Complete schema for chats, projects, and files

-- =================================================
-- 1. CHATS TABLE
-- =================================================
-- Create the chats table
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    user_full_name TEXT NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON public.chats(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chats
CREATE POLICY "Users can view their own chats"
ON public.chats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats"
ON public.chats FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
ON public.chats FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
ON public.chats FOR DELETE
USING (auth.uid() = user_id);

-- =================================================
-- 2. PROJECTS TABLE
-- =================================================
-- Create the projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- Enable RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects
CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE
USING (auth.uid() = user_id);

-- =================================================
-- 3. FILES TABLE
-- =================================================
-- Create the files table
CREATE TABLE IF NOT EXISTS public.files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for files
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_expires_at ON public.files(expires_at);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);

-- Enable RLS for files
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for files
CREATE POLICY "Users can view their own files"
ON public.files FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
ON public.files FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
ON public.files FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
ON public.files FOR DELETE
USING (auth.uid() = user_id);

-- =================================================
-- 4. STORAGE BUCKETS
-- =================================================
-- Create user-files storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-files', 'user-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create avatars storage bucket (keeping existing one)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- =================================================
-- 5. STORAGE POLICIES
-- =================================================
-- Storage policies for user-files
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND auth.role() = 'authenticated'
);

-- Storage policies for avatars (existing)
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
);

-- =================================================
-- 6. FUNCTIONS AND TRIGGERS
-- =================================================
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER handle_updated_at_chats
    BEFORE UPDATE ON public.chats
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_projects
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =================================================
-- 7. CLEANUP FUNCTION FOR EXPIRED FILES
-- =================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_files()
RETURNS void AS $$
DECLARE
    expired_file RECORD;
BEGIN
    -- Delete expired files from storage and database
    FOR expired_file IN
        SELECT id, file_path FROM public.files
        WHERE expires_at < timezone('utc'::text, now())
    LOOP
        -- Delete from storage
        DELETE FROM storage.objects
        WHERE bucket_id = 'user-files'
        AND name = expired_file.file_path;

        -- Delete from database
        DELETE FROM public.files
        WHERE id = expired_file.id;
    END LOOP;
END;
$$ language 'plpgsql';

-- =================================================
-- 8. GRANT PERMISSIONS
-- =================================================
-- =================================================
-- 9. FUNCTIONS FOR COMPLETED TASK CLEANUP
-- =================================================

-- Add completed_at column to projects table if it doesn't exist
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE NULL;

-- Create index for completed_at
CREATE INDEX IF NOT EXISTS idx_projects_completed_at ON public.projects(completed_at);

-- Function to automatically delete completed tasks after 7 days
CREATE OR REPLACE FUNCTION delete_old_completed_tasks()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.projects
    WHERE completed = true
    AND completed_at IS NOT NULL
    AND completed_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Create a function to update completed_at when task is completed
CREATE OR REPLACE FUNCTION update_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If task is being marked as completed and wasn't completed before
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        NEW.completed_at = NOW();
        NEW.updated_at = NOW();
    -- If task is being marked as not completed
    ELSIF NEW.completed = false AND OLD.completed = true THEN
        NEW.completed_at = NULL;
        NEW.updated_at = NOW();
    ELSE
        NEW.updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger to automatically update completed_at
DROP TRIGGER IF EXISTS trigger_update_completed_at ON public.projects;
CREATE TRIGGER trigger_update_completed_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_completed_at();

-- =================================================
-- 10. GRANT PERMISSIONS
-- =================================================
-- Grant necessary permissions
GRANT ALL ON public.chats TO authenticated;
GRANT ALL ON public.chats TO anon;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.projects TO anon;
GRANT ALL ON public.files TO authenticated;
GRANT ALL ON public.files TO anon;
