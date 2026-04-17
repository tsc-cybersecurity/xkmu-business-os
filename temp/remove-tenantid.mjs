/**
 * Remove ALL _tenantId references from the codebase.
 *
 * Transformations:
 * 1. Service method signatures: remove `_tenantId: string` first param
 * 2. Service call sites: remove first arg ('', TENANT_ID, _tenantId, auth.tenantId, tenantId)
 * 3. Remove `import { TENANT_ID } from '@/lib/constants/tenant'`
 * 4. Remove `tenantId` from AuthContext interface
 * 5. Remove `tenantId: TENANT_ID` from AI context objects
 * 6. Remove `tenantId` from seed function params
 * 7. Clean up api-key.ts tenantId references
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = 'c:/Daten/xkmu-business-os/src'
let totalChanges = 0
let filesChanged = 0

function getAllTsFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      results.push(...getAllTsFiles(full))
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      results.push(full)
    }
  }
  return results
}

function transform(filePath) {
  const original = readFileSync(filePath, 'utf8')
  let code = original
  let changes = 0

  // ==========================================
  // 1. Remove _tenantId: string from method signatures
  // ==========================================

  // Pattern: (_tenantId: string, nextParam  →  (nextParam
  // Handles both inline and multiline
  const beforeSig = code

  // Inline: async method(_tenantId: string, arg2: type)
  code = code.replace(/\(\s*_tenantId:\s*string\s*,\s*/g, '(')

  // Multiline:
  //   async method(
  //     _tenantId: string,
  //     arg2: type
  code = code.replace(/\(\s*\n\s*_tenantId:\s*string\s*,\s*\n/g, '(\n')

  // Only param: async method(_tenantId: string)
  code = code.replace(/\(\s*_tenantId:\s*string\s*\)/g, '()')

  // Seed function params: (db: ..., tenantId: string, ...)
  // e.g. async function seedAuditorRole(db: ReturnType<typeof drizzle>, tenantId: string)
  code = code.replace(/,\s*tenantId:\s*string(?=\s*[,)])/g, '')

  if (code !== beforeSig) changes++

  // ==========================================
  // 2. Remove first arg from service call sites
  // ==========================================
  const beforeCalls = code

  // Pattern: .method('', arg  →  .method(arg
  code = code.replace(/(\.\w+)\(\s*''\s*,\s*/g, '$1(')

  // Pattern: .method('')  →  .method()
  code = code.replace(/(\.\w+)\(\s*''\s*\)/g, '$1()')

  // Pattern: .method(TENANT_ID, arg  →  .method(arg
  code = code.replace(/(\.\w+)\(\s*TENANT_ID\s*,\s*/g, '$1(')

  // Pattern: .method(TENANT_ID)  →  .method()
  code = code.replace(/(\.\w+)\(\s*TENANT_ID\s*\)/g, '$1()')

  // Pattern: .method(_tenantId, arg  →  .method(arg  (pass-through calls)
  code = code.replace(/(\.\w+)\(\s*_tenantId\s*,\s*/g, '$1(')

  // Pattern: .method(_tenantId)  →  .method()
  code = code.replace(/(\.\w+)\(\s*_tenantId\s*\)/g, '$1()')

  // Pattern: .method(tenantId, arg  →  .method(arg  (local var in seeds)
  // Only in seed files to avoid false positives
  if (filePath.includes('seed')) {
    code = code.replace(/(\.\w+)\(\s*tenantId\s*,\s*/g, '$1(')
  }

  // Multiline: ServiceName.method(\n  TENANT_ID,\n  arg  →  ServiceName.method(\n  arg
  code = code.replace(/(\.\w+)\(\s*\n\s*TENANT_ID\s*,\s*\n/g, '$1(\n')
  code = code.replace(/(\.\w+)\(\s*\n\s*''\s*,\s*\n/g, '$1(\n')
  code = code.replace(/(\.\w+)\(\s*\n\s*_tenantId\s*,\s*\n/g, '$1(\n')

  // Function call: functionName('', arg  →  functionName(arg
  // For seed functions called directly (not as method)
  code = code.replace(/(\b(?:seed\w+|handleDunning))\(\s*''\s*,\s*/g, '$1(')

  if (code !== beforeCalls) changes++

  // ==========================================
  // 3. Remove TENANT_ID import line
  // ==========================================
  const beforeImport = code
  code = code.replace(/import\s*\{\s*TENANT_ID\s*\}\s*from\s*['"]@\/lib\/constants\/tenant['"]\s*\n/g, '')
  // Also from combined imports: import { TENANT_ID, OTHER } → import { OTHER }
  code = code.replace(/\bTENANT_ID\s*,\s*/g, (match) => {
    // Only in import lines
    return ''
  })
  // Clean up: import {  OTHER } → import { OTHER }
  code = code.replace(/import\s*\{\s+(\w)/g, 'import { $1')
  if (code !== beforeImport) changes++

  // ==========================================
  // 4. Remove tenantId from objects like { tenantId: TENANT_ID, feature: '...' }
  // ==========================================
  const beforeObj = code
  code = code.replace(/\{\s*tenantId:\s*TENANT_ID\s*,\s*/g, '{ ')
  code = code.replace(/,\s*tenantId:\s*TENANT_ID\s*/g, '')
  code = code.replace(/\{\s*tenantId:\s*TENANT_ID\s*\}/g, '{}')
  if (code !== beforeObj) changes++

  // ==========================================
  // 5. Remove tenantId from AuthContext interface
  // ==========================================
  const beforeAuth = code
  code = code.replace(/\s*tenantId:\s*string\s*\n/g, '\n')
  // Remove tenantId: TENANT_ID from return objects in auth-context
  code = code.replace(/\s*tenantId:\s*TENANT_ID\s*,\s*\/\/.*\n/g, '\n')
  if (code !== beforeAuth) changes++

  // ==========================================
  // 6. Remove tenantId from api-key.ts
  // ==========================================
  const beforeApiKey = code
  code = code.replace(/\s*tenantId:\s*'legacy'\s*,\s*\/\/.*\n/g, '\n')
  if (code !== beforeApiKey) changes++

  // ==========================================
  // 7. Remove tenantId from API doc examples
  // ==========================================
  const beforeDocs = code
  code = code.replace(/\s*tenantId:\s*'[^']*'\s*,\s*\n/g, '\n')
  if (code !== beforeDocs) changes++

  // ==========================================
  // 8. Clean up: remove auth.tenantId usages in routes
  // ==========================================
  const beforeAuthUsage = code
  // { tenantId: auth.tenantId, feature: 'x' } → { feature: 'x' }
  code = code.replace(/\{\s*tenantId:\s*auth\.tenantId\s*,\s*/g, '{ ')
  code = code.replace(/,\s*tenantId:\s*auth\.tenantId\s*/g, '')
  if (code !== beforeAuthUsage) changes++

  // ==========================================
  // 9. Remove `tenantId` from seed function calls with db arg
  //    seedExampleBusinessData(db, tenantId, adminUserId) → seedExampleBusinessData(db, adminUserId)
  // ==========================================
  const beforeSeedCalls = code
  code = code.replace(/(seed\w+)\(db\s*,\s*tenantId\s*,\s*/g, '$1(db, ')
  code = code.replace(/(seed\w+)\(db\s*,\s*tenantId\s*\)/g, '$1(db)')
  code = code.replace(/(seedManagementFramework)\(\s*tenantId\s*\)/g, '$1()')
  if (code !== beforeSeedCalls) changes++

  // Write back if changed
  if (code !== original) {
    writeFileSync(filePath, code, 'utf8')
    const rel = relative('c:/Daten/xkmu-business-os', filePath).replace(/\\/g, '/')
    console.log(`  ✓ ${rel}`)
    filesChanged++
    totalChanges += changes
  }
}

// Run
console.log('Scanning all .ts/.tsx files...')
const files = getAllTsFiles(ROOT)
console.log(`Found ${files.length} files. Transforming...`)
console.log('')

for (const f of files) {
  transform(f)
}

console.log('')
console.log(`Done: ${filesChanged} files changed, ${totalChanges} transformation groups applied.`)
