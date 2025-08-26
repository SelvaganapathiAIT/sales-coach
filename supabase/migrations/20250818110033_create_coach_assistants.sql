-- migrations/xxxxxx_create_coach_assistants.sql

-- Table to store extra AI agent configuration for each coach
create table if not exists public.coach_assistants (
  id uuid primary key default gen_random_uuid(),

  -- Link back to main coaches table
  coach_id uuid not null references public.coaches(id) on delete cascade,

  -- AI Config
  system_prompt text not null,
  first_message text,
  llm_model text default 'gpt-4.1',
  temperature numeric(3,2) default 0.7,
  agent_language text default 'en',

  -- Style & behavior
  performance_standard text,
  intensity_level text,
  coaching_style text,
  roasting_level text,
  permissions text default 'private',
  is_public boolean default false,

  -- Contact & integrations
  phone text,
  linkedin_url text,
  allowed_emails text[],
  enable_crm boolean default false,
  enable_calendar boolean default false,
  enable_email boolean default false,
  enable_transfer_agent boolean default false,
  enable_transfer_number boolean default false,
  enable_voicemail_detection boolean default false,
  enable_tracking boolean default false,
  enable_detect_language boolean default false,
  enable_end_call boolean default false,
  enable_skip_turn boolean default false,
  enable_keypad_tone boolean default false,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index to speed up lookups
create index if not exists idx_coach_assistants_coach 
  on public.coach_assistants(coach_id);

-- Trigger to auto-update updated_at
create trigger update_coach_assistants_updated_at
  before update on public.coach_assistants
  for each row execute function public.update_updated_at_column();


ALTER TABLE public.coaches
ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

-- Add agent_id column to store ElevenLabs agent ID
ALTER TABLE public.coaches
ADD COLUMN IF NOT EXISTS agent_id text;

-- Create index for agent_id lookups
CREATE INDEX IF NOT EXISTS idx_coaches_agent_id 
  ON public.coaches(agent_id);

alter table coaches enable row level security;
alter table coach_assistants enable row level security;

create policy "Users can read their own coaches"
on coaches
for select
using ( owner_user_id = auth.uid() );

-- Assistants: a user can only read assistants
-- if the assistant belongs to one of their coaches
create policy "Users can read assistants of their own coaches"
on coach_assistants
for select
using (
  coach_id in (
    select id from coaches where owner_user_id = auth.uid()
  )
);

-- UPDATE: A user can update only their own coaches
create policy "Users can update their own coach"
on coaches
for update
using ( owner_user_id = auth.uid() )
with check ( owner_user_id = auth.uid() );

-- DELETE: A user can delete only their own coaches
create policy "Users can delete their own coach"
on coaches
for delete
using ( owner_user_id = auth.uid() );

create policy "Users can update assistants for their own coaches"
on coach_assistants
for update
using (
  coach_id in (
    select id from coaches where owner_user_id = auth.uid()
  )
)
with check (
  coach_id in (
    select id from coaches where owner_user_id = auth.uid()
  )
);


CREATE INDEX conversation_history_agent_user_idx
ON conversation_history (agent_id, user_id);
