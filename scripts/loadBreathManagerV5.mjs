import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function executeSqlFile(filepath) {
  const sql = fs.readFileSync(filepath, 'utf8');
  const lines = sql.split('\n').filter(l => l.trim());
  console.log(`Executing ${filepath}: ${lines.length} statements...`);
  let success = 0;
  let failed = 0;
  for (const line of lines) {
    const { error } = await supabase.rpc('exec_sql', { sql_text: line });
    if (error) {
      // Try direct insert via from() instead
      failed++;
      if (failed <= 3) console.error(`  Error: ${error.message.slice(0, 100)}`);
    } else {
      success++;
    }
  }
  console.log(`  Success: ${success}, Failed: ${failed}`);
  return { success, failed };
}

// We can't use RPC for DML. Let's use the REST API directly.
async function executeViaRest() {
  const tables = [
    { file: 'scripts/data/bm5_tbl_bm5_passages.sql', table: 'bm5_passages' },
    { file: 'scripts/data/bm5_tbl_bm5_assets.sql', table: 'bm5_assets' },
    { file: 'scripts/data/bm5_tbl_bm5_issues.sql', table: 'bm5_issues' },
    { file: 'scripts/data/bm5_tbl_bm5_editorial_corrections.sql', table: 'bm5_editorial_corrections' },
    { file: 'scripts/data/bm5_tbl_bm5_acceptance_tests.sql', table: 'bm5_acceptance_tests' },
  { file: 'scripts/data/bm5_tbl_bm5_knowledge.sql', table: 'bm5_knowledge' },
    { file: 'scripts/data/bm5_tbl_bm5_catalog.sql', table: 'bm5_catalog' },
    { file: 'scripts/data/bm5_tbl_bm5_retrieval_preview.sql', table: 'bm5_retrieval_preview' },
  ];

  for (const { file, table } of tables) {
    const sql = fs.readFileSync(file, 'utf8');
    const lines = sql.split('\n').filter(l => l.trim());
    console.log(`\n=== ${table}: ${lines.length} rows ===`);
    
    // Parse INSERT statements and use supabase.from().insert()
    for (const line of lines) {
      // Extract VALUES clause
      const match = line.match(/INSERT INTO breath_manager_v5\.\w+ \(([^)]+)\) VALUES \((.+)\) ON CONFLICT/);
      if (!match) {
        console.error(`  Could not parse: ${line.slice(0, 80)}`);
        continue;
      }
      
      // This approach won't work easily with raw SQL values
      // We need to use the SQL editor approach
    }
    console.log(`  Skipping - need raw SQL execution`);
  }
}

// Actually, let's use the Postgres connection directly
import pg from 'pg';

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('Missing SUPABASE_DB_URL');
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl });

async function main() {
  await client.connect();
  console.log('Connected to database');

  const tables = [
    'scripts/data/bm5_tbl_bm5_passages.sql',
    'scripts/data/bm5_tbl_bm5_assets.sql',
    'scripts/data/bm5_tbl_bm5_issues.sql',
    'scripts/data/bm5_tbl_bm5_editorial_corrections.sql',
    'scripts/data/bm5_tbl_bm5_acceptance_tests.sql',
    'scripts/data/bm5_tbl_bm5_knowledge.sql',
    'scripts/data/bm5_tbl_bm5_catalog.sql',
    'scripts/data/bm5_tbl_bm5_retrieval_preview.sql',
  ];

  for (const file of tables) {
    const sql = fs.readFileSync(file, 'utf8');
    const lines = sql.split('\n').filter(l => l.trim());
    const tableName = file.match(/bm5_(\w+)\.sql/)[1];
    console.log(`\n=== ${tableName}: ${lines.length} rows ===`);
    
    // Execute in batches of 20
    for (let i = 0; i < lines.length; i += 20) {
      const batch = lines.slice(i, i + 20).join('\n');
      try {
        await client.query(batch);
      } catch (err) {
        console.error(`  Error at batch ${i}: ${err.message.slice(0, 200)}`);
        // Try line by line
        for (let j = i; j < Math.min(i + 20, lines.length); j++) {
          try {
            await client.query(lines[j]);
          } catch (err2) {
            console.error(`  Line ${j+1} failed: ${err2.message.slice(0, 150)}`);
            console.error(`  SQL: ${lines[j].slice(0, 200)}`);
          }
        }
      }
    }
    
    // Verify count
    const result = await client.query(`SELECT count(*) FROM breath_manager_v5.bm5_${tableName}`);
    console.log(`  Total rows: ${result.rows[0].count}`);
  }

  await client.end();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
