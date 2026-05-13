import { query } from '../config/database.js'

/**
 * Fix script: Ensure all modals have a `content` field populated
 * This script checks for modals with NULL or empty content and helps diagnose the issue
 */
async function fixModalContent() {
  try {
    console.log('[FIX] Checking modals with missing or empty content...')
    
    // Find all modals with NULL or empty content
    const { rows, error } = await query(
      `SELECT id, name, title, content, config FROM modals WHERE content IS NULL OR TRIM(content) = ''`,
      []
    )
    
    if (error) {
      console.error('[FIX] Error querying modals:', error)
      return
    }
    
    console.log(`[FIX] Found ${rows.length} modals with missing/empty content:`)
    rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Name: "${row.name}", Title: "${row.title}"`)
      console.log(`    Config: ${row.config}`)
    })
    
    if (rows.length === 0) {
      console.log('[FIX] ✓ All modals have content populated')
      return
    }
    
    console.log('\n[FIX] Note: You may need to manually edit these modals in the UI to add content.')
    console.log('[FIX] Or, if using seeded templates, run seedTemplates() again from the admin panel.')
    
  } catch (err) {
    console.error('[FIX] Unexpected error:', err.message)
  }
}

await fixModalContent()
