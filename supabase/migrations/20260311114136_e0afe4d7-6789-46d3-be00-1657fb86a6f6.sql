
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invited_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS joined_at timestamp with time zone;

-- Update existing active users to have status 'active' and joined_at = created_at
UPDATE public.profiles SET joined_at = created_at WHERE active = true;

-- Update existing disabled users
UPDATE public.profiles SET status = 'disabled' WHERE active = false;
