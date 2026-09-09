/*
# K4: Knowledge Content Layer — source text storage

## Purpose
Creates two new tables to store Yoga Zukan manuscript text (source_text)
separate from the existing knowledge_entries table. This preserves the
original manuscript faithfully without modifying it for AI or public use.

## New Tables

### 1. knowledge_contents
Stores manuscript text keyed to each knowledge entry, with content kind
and safety review tracking.

- `id` (uuid, primary key, auto-generated)
- `knowledge_entry_id` (uuid, NOT NULL, FK → knowledge_entries(id) ON DELETE CASCADE)
- `content_kind` (text, NOT NULL) — CHECK: source_text | editorial_summary | public_content | ai_teacher_content
- `language` (text, NOT NULL, default 'ja')
- `content` (text, NOT NULL)
- `content_status` (text, NOT NULL, default 'source_only') — CHECK: source_only | editorial_review | approved | rejected
- `safety_review_status` (text, NOT NULL, default 'not_reviewed') — CHECK: not_reviewed | review_required | reviewed_safe | restricted
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())
- UNIQUE(knowledge_entry_id, content_kind, language)

### 2. knowledge_source_sections
Stores structured sub-sections of source text (e.g. definition, method,
benefit, caution) for granular manuscript tracking.

- `id` (uuid, primary key, auto-generated)
- `knowledge_entry_id` (uuid, NOT NULL, FK → knowledge_entries(id) ON DELETE CASCADE)
- `source_id` (uuid, nullable, FK → knowledge_sources(id) ON DELETE SET NULL)
- `section_type` (text, nullable) — CHECK: definition | introduction | method | benefit | caution | contraindication | note | example | history | concept | teaching | other
- `heading` (text, nullable)
- `body` (text, nullable)
- `source_order` (integer, nullable)
- `created_at` (timestamptz, default now())

## Security (RLS)
Both tables have RLS ENABLED with NO policies for anon/authenticated.
This means:
- No client (anon or authenticated) can SELECT, INSERT, UPDATE, or DELETE.
- Only the service role key (server-side) can access these tables.
- source_text is NOT publicly readable.
- Future phases can add SELECT policies for approved public_content only.

## updated_at trigger
A trigger on knowledge_contents auto-updates updated_at on row modification,
reusing the existing update_updated_at_column() function.

## Notes
- Does NOT modify existing tables (knowledge_entries, knowledge_sources).
- Does NOT affect existing RLS policies.
- Does NOT create any AI/RAG/embedding infrastructure.
- Idempotent: uses IF NOT EXISTS for tables and indexes.
*/
