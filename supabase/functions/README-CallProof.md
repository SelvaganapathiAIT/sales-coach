# CallProof API Supabase Edge Functions

This directory contains comprehensive Supabase Edge Functions for integrating with the CallProof API. These functions provide a complete interface for managing contacts, calls, appointments, emails, tasks, deals, and analytics.

## Functions Overview

### 1. `callproof-api` - Main API Interface
**File:** `callproof-api/index.ts`

A comprehensive function that handles all CallProof API endpoints through a single interface.

**Usage:**
```javascript
const response = await fetch('/functions/v1/callproof-api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    endpoint: 'contacts',
    method: 'GET',
    params: { limit: 50 }
  })
});
```

**Available Endpoints:**
- `contacts` - Get all contacts
- `contacts/find` - Search contacts by name or email
- `contacts/create` - Create a new contact
- `calls` - Get all calls
- `calls/create` - Create a new call record
- `appointments` - Get all appointments
- `appointments/create` - Create a new appointment
- `emails` - Get all emails
- `emails/send` - Send an email
- `reps/stats` - Get representative statistics
- `reps/profile` - Get representative profile
- `reps/update` - Update representative profile
- `companies` - Get all companies
- `companies/create` - Create a new company
- `tasks` - Get all tasks
- `tasks/create` - Create a new task
- `deals` - Get all deals
- `deals/create` - Create a new deal
- `reports/calls` - Get call reports
- `reports/activity` - Get activity reports

### 2. `callproof-webhook` - Webhook Handler
**File:** `callproof-webhook/index.ts`

Handles real-time webhooks from CallProof for instant updates.

**Supported Events:**
- `call.created`, `call.updated`
- `contact.created`, `contact.updated`
- `appointment.created`, `appointment.updated`, `appointment.cancelled`
- `email.sent`, `email.received`
- `task.created`, `task.updated`, `task.completed`
- `deal.created`, `deal.updated`, `deal.closed`

**Usage:**
```javascript
// Configure webhook URL in CallProof: https://your-project.supabase.co/functions/v1/callproof-webhook
```

### 3. `callproof-analytics` - Analytics & Reporting
**File:** `callproof-analytics/index.ts`

Generates comprehensive analytics and reports from CallProof data.

**Usage:**
```javascript
const response = await fetch('/functions/v1/callproof-analytics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    reportType: 'summary', // 'calls', 'contacts', 'appointments', 'emails', 'tasks', 'deals', 'summary'
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    groupBy: 'day' // 'day', 'week', 'month', 'contact', 'company'
  })
});
```

**Report Types:**
- `calls` - Call analytics with duration, outcomes, and trends
- `contacts` - Contact distribution and company analysis
- `appointments` - Appointment scheduling and completion rates
- `emails` - Email activity and recipient analysis
- `tasks` - Task completion and priority analysis
- `deals` - Deal pipeline and value analysis
- `summary` - Comprehensive overview of all activities

### 4. `callproof-sync-data` - Data Synchronization
**File:** `callproof-sync-data/index.ts`

Syncs and backs up all CallProof data to local database tables.

**Usage:**
```javascript
const response = await fetch('/functions/v1/callproof-sync-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    dataTypes: ['contacts', 'calls', 'appointments', 'emails', 'tasks', 'deals', 'companies'],
    fullSync: false,
    lastSyncDate: '2024-01-01'
  })
});
```

**Features:**
- Incremental and full sync options
- Selective data type synchronization
- Conflict resolution and duplicate handling
- Sync status tracking

### 5. `callproof-sync` - Legacy Sync Function
**File:** `callproof-sync/index.ts`

Original sync function for basic CallProof integration.

**Usage:**
```javascript
const response = await fetch('/functions/v1/callproof-sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    action: 'sync_contacts' // 'sync_contacts', 'get_calls', 'sync_profile'
  })
});
```

### 6. `callproof-activity` - Activity Feed
**File:** `callproof-activity/index.ts`

Provides recent activity feed from CallProof.

**Usage:**
```javascript
const response = await fetch('/functions/v1/callproof-activity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    limit: 10,
    days: 7
  })
});
```

## Database Schema Requirements

### Required Tables

1. **profiles** (existing)
```sql
ALTER TABLE profiles ADD COLUMN callproof_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN callproof_api_key text;
ALTER TABLE profiles ADD COLUMN callproof_api_secret text;
ALTER TABLE profiles ADD COLUMN callproof_last_sync timestamp;
ALTER TABLE profiles ADD COLUMN callproof_sync_status text;
ALTER TABLE profiles ADD COLUMN callproof_last_activity timestamp;
```

2. **callproof_events** (for webhooks)
```sql
CREATE TABLE callproof_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  event_data jsonb,
  rep_email text,
  timestamp text,
  created_at timestamp DEFAULT now()
);
```

3. **callproof_contacts** (for data sync)
```sql
CREATE TABLE callproof_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  callproof_id text UNIQUE,
  first_name text,
  last_name text,
  email text,
  phone text,
  company text,
  title text,
  source text,
  raw_data jsonb,
  last_synced timestamp DEFAULT now(),
  created_at timestamp DEFAULT now()
);
```

4. **callproof_calls** (for data sync)
```sql
CREATE TABLE callproof_calls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  callproof_id text UNIQUE,
  contact_id text,
  contact_name text,
  duration integer,
  outcome text,
  notes text,
  call_date timestamp,
  raw_data jsonb,
  last_synced timestamp DEFAULT now(),
  created_at timestamp DEFAULT now()
);
```

5. **callproof_appointments** (for data sync)
```sql
CREATE TABLE callproof_appointments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  callproof_id text UNIQUE,
  contact_id text,
  title text,
  start_time timestamp,
  end_time timestamp,
  location text,
  status text,
  notes text,
  raw_data jsonb,
  last_synced timestamp DEFAULT now(),
  created_at timestamp DEFAULT now()
);
```

6. **callproof_emails** (for data sync)
```sql
CREATE TABLE callproof_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  callproof_id text UNIQUE,
  contact_id text,
  to text,
  from text,
  subject text,
  body text,
  type text,
  sent_at timestamp,
  raw_data jsonb,
  last_synced timestamp DEFAULT now(),
  created_at timestamp DEFAULT now()
);
```

7. **callproof_tasks** (for data sync)
```sql
CREATE TABLE callproof_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  callproof_id text UNIQUE,
  contact_id text,
  title text,
  description text,
  status text,
  priority text,
  due_date timestamp,
  completed_at timestamp,
  raw_data jsonb,
  last_synced timestamp DEFAULT now(),
  created_at timestamp DEFAULT now()
);
```

8. **callproof_deals** (for data sync)
```sql
CREATE TABLE callproof_deals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  callproof_id text UNIQUE,
  contact_id text,
  title text,
  value numeric,
  stage text,
  close_date timestamp,
  description text,
  raw_data jsonb,
  last_synced timestamp DEFAULT now(),
  created_at timestamp DEFAULT now()
);
```

9. **callproof_companies** (for data sync)
```sql
CREATE TABLE callproof_companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  callproof_id text UNIQUE,
  name text,
  website text,
  phone text,
  address text,
  industry text,
  raw_data jsonb,
  last_synced timestamp DEFAULT now(),
  created_at timestamp DEFAULT now()
);
```

## Environment Variables

Set these environment variables in your Supabase project:

```bash
CALLPROOF_API_KEY=your_callproof_api_key
CALLPROOF_API_SECRET=your_callproof_api_secret
```

## Authentication

All functions require user authentication. The functions automatically retrieve CallProof credentials from the user's profile.

## Error Handling

All functions include comprehensive error handling:
- API credential validation
- Network error handling
- Data validation
- Graceful degradation

## Rate Limiting

The functions include built-in rate limiting considerations:
- Batch processing for large datasets
- Incremental sync options
- Configurable limits

## Security

- API credentials are stored securely in user profiles
- All database operations use RLS (Row Level Security)
- Input validation and sanitization
- CORS headers configured

## Deployment

Deploy the functions using Supabase CLI:

```bash
supabase functions deploy callproof-api
supabase functions deploy callproof-webhook
supabase functions deploy callproof-analytics
supabase functions deploy callproof-sync-data
supabase functions deploy callproof-sync
supabase functions deploy callproof-activity
```

## Testing

Test the functions using the Supabase dashboard or curl:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/callproof-api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-anon-key" \
  -d '{"userId": "user-uuid", "endpoint": "contacts"}'
```

## Support

For issues or questions:
1. Check the function logs in Supabase dashboard
2. Verify CallProof API credentials
3. Ensure database tables are created
4. Check environment variables are set correctly
