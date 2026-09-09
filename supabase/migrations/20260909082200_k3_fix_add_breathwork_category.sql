/*
# K3 Fix: Add 'breathwork' to knowledge_entries.category CHECK constraint

The K2.6 Formal Master contains entries with category = 'breathwork' (e.g. YK-0314, YK-0317-0318-0319).
The original K1 CHECK only allowed: asana, pranayama, dhyana, philosophy, anatomy, physiology, wellness, stress_management, teaching, communication, breathing, yoga_history.
'breathwork' was missing. Add it.
*/

ALTER TABLE knowledge_entries
  DROP CONSTRAINT IF EXISTS ke_category_check;

ALTER TABLE knowledge_entries
  ADD CONSTRAINT ke_category_check CHECK (
    category IN (
      'asana', 'pranayama', 'breathwork', 'dhyana', 'philosophy',
      'anatomy', 'physiology', 'wellness', 'stress_management',
      'teaching', 'communication', 'breathing', 'yoga_history'
    )
  );
