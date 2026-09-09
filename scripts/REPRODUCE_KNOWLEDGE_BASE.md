# Yoga Knowledge Base — Reproduction Guide

Reproduces `knowledge_entries = 335` and `knowledge_sources = 392` in a fresh Supabase environment.

## Prerequisites

Set environment variables (do NOT use the VITE_ prefixed ones):
```sh
export SUPABASE_URL=<your-project-url>
export SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## Steps

### 1. Apply migrations
All schema lives under `supabase/migrations/`. Apply them in timestamp order.
The K3-specific migrations are:
- `20260909081515_k3_add_knowledge_master_columns.sql`
- `20260909082200_k3_fix_add_breathwork_category.sql`

### 2. Import Formal Master (knowledge_entries — 335 rows)
```sh
npx tsx scripts/importYogaKnowledge.ts
```
This reads `scripts/data/yoga_knowledge_master_k2_6_formal.json` and upserts
335 entries into `knowledge_entries` keyed by `master_id`. All entries are
imported with `is_published = false`.

### 3. Import Source Mappings (knowledge_sources — 392 rows)
```sh
node fix_source_mappings.js
```
This reads `scripts/data/yoga_knowledge_master_k2_6_source_mappings.csv`,
DELETEs all existing `yoga_zukan` sources, then INSERTs 392 rows.
Idempotent (DELETE then INSERT).

## File locations
- Formal Master JSON: `scripts/data/yoga_knowledge_master_k2_6_formal.json`
- Formal Master CSV:  `scripts/data/yoga_knowledge_master_k2_6_formal.csv`
- Source Mappings CSV: `scripts/data/yoga_knowledge_master_k2_6_source_mappings.csv`
- Entry import script: `scripts/importYogaKnowledge.ts`
- Source import script: `fix_source_mappings.js`

### 4. Import Source Text (K4 — knowledge_contents + knowledge_source_sections)
```sh
npx tsx scripts/importYogaKnowledgeContent.ts
```
This reads `scripts/data/yoga_knowledge_content_k4.json` and upserts
source_text rows into `knowledge_contents`, plus structured sub-sections
into `knowledge_source_sections`. Idempotent (upsert + DELETE/INSERT sections).

K4-specific migration:
- `20260909090100_k4_create_content_tables.sql`

## File locations
- Formal Master JSON: `scripts/data/yoga_knowledge_master_k2_6_formal.json`
- Formal Master CSV:  `scripts/data/yoga_knowledge_master_k2_6_formal.csv`
- Source Mappings CSV: `scripts/data/yoga_knowledge_master_k2_6_source_mappings.csv`
- K4 Content JSON:    `scripts/data/yoga_knowledge_content_k4.json`
- Entry import script: `scripts/importYogaKnowledge.ts`
- Source import script: `fix_source_mappings.js`
- Content import script: `scripts/importYogaKnowledgeContent.ts`

## Expected result
- knowledge_entries with master_id = 335
- knowledge_sources (yoga_zukan) = 392
- entries with 0 source mappings = 0
- knowledge_contents: varies by K4 JSON (test: 3 rows)
- knowledge_source_sections: varies by K4 JSON (test: 9 rows)
