# Expert Next.js 15 - Quality Checklist

Pre-commit and code review checklist to ensure production-ready quality.

## Pre-Commit Checklist

Use this checklist before committing code:

### TypeScript & Type Safety

- [ ] **No `any` types** - All types explicit and precise
  ```bash
  # Check for 'any'
  grep -r "\bany\b" app/ --include="*.ts" --include="*.tsx" | grep -v "unknown"
  ```

- [ ] **All imports typed** - No implicit any from external packages
  ```typescript
  // ✅ GOOD
  import { z, type ZodError } from 'zod';

  // ❌ WRONG
  import z = require('zod');
  ```

- [ ] **Function signatures complete** - All parameters and returns typed
  ```typescript
  // ✅ GOOD
  async function fetchUser(id: string): Promise<User> { }

  // ❌ WRONG
  async function fetchUser(id) { }
  ```

- [ ] **No `unknown` misuse** - `unknown` requires type narrowing
  ```typescript
  // ✅ GOOD
  function handle(error: unknown) {
    if (error instanceof Error) {
      console.log(error.message);
    }
  }

  // ❌ WRONG
  function handle(error: unknown) {
    console.log(error.message); // Compile error
  }
  ```

### Documentation

- [ ] **JSDoc on all functions** - Required fields: @param, @returns, @example
  ```typescript
  /**
   * Description (1-2 lines).
   *
   * Detailed explanation and context.
   *
   * @param {Type} name - Description
   * @returns {ReturnType} What it returns
   *
   * @example
   * const result = myFunction(arg);
   */
  export function myFunction(arg: Type): ReturnType { }
  ```

- [ ] **@example in JSDoc** - Every function has at least one example
  ```typescript
  * @example
  * const result = await submitForm(data);
  * console.log(result.data);
  ```

- [ ] **@throws documented** - All possible errors listed
  ```typescript
  * @throws {ZodError} If validation fails
  * @throws {AppError} If database operation fails
  ```

- [ ] **Comments for complex logic** - Explain "why", not "what"
  ```typescript
  // ✅ GOOD - Explains intent
  // Retry with exponential backoff for transient failures
  await retryWithBackoff(() => fetchData());

  // ❌ WRONG - Just restates code
  // Increment i
  i++;
  ```

### Validation & Security

- [ ] **Zod schemas for all input** - Server Actions, API routes, form data
  ```typescript
  const schema = z.object({
    email: z.string().trim().toLowerCase().email(),
    name: z.string().trim().min(1).max(255),
  });
  ```

- [ ] **Input validated at boundaries** - Server Action entry point
  ```typescript
  // ✅ GOOD - Validate on server
  export async function action(input: unknown) {
    const validated = schema.parse(input);
    // Use validated
  }

  // ❌ WRONG - Client-only validation
  function onSubmit(data: any) { }
  ```

- [ ] **Sensitive data not in client** - No secrets, API keys, or passwords
  ```typescript
  // ✅ GOOD - Server Action
  'use server';
  export async function sendEmail(email: string) {
    const apiKey = process.env.EMAIL_API_KEY;
    // Use server-side
  }

  // ❌ WRONG - Exposed in client
  const apiKey = process.env.NEXT_PUBLIC_API_KEY; // Wrong!
  ```

- [ ] **No SQL injection risks** - Use parameterized queries
  ```typescript
  // ✅ GOOD - Parameterized
  await db.query('SELECT * FROM users WHERE id = ?', [userId]);

  // ❌ WRONG - String concatenation
  await db.query(`SELECT * FROM users WHERE id = ${userId}`);
  ```

- [ ] **No console.log sensitive data** - Only debug info
  ```typescript
  // ✅ GOOD
  console.error('[action] Error code:', error.code);

  // ❌ WRONG
  console.log('[action] User data:', userData);
  ```

### React Best Practices

- [ ] **Proper `use client` directives** - Only on interactive components
  ```typescript
  // ✅ GOOD - On interactive component
  'use client';
  export function Button() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
  }

  // ❌ WRONG - On server-capable component
  'use client';
  export function PageTitle() {
    return <h1>Welcome</h1>; // Doesn't need client
  }
  ```

- [ ] **Hooks in correct component** - useState, useEffect in `'use client'` only
  ```typescript
  // ✅ GOOD - In client component
  'use client';
  const [state, setState] = useState(initial);

  // ❌ WRONG - In server component
  const [state, setState] = useState(initial); // Error!
  ```

- [ ] **Key prop for lists** - Stable, unique identifier
  ```typescript
  // ✅ GOOD
  {items.map(item => <Item key={item.id} data={item} />)}

  // ❌ WRONG - Index as key
  {items.map((item, i) => <Item key={i} data={item} />)}
  ```

- [ ] **No inline functions in props** - Use useCallback for dependencies
  ```typescript
  // ✅ GOOD - Stable reference
  const handleClick = useCallback(() => {
    // Handler logic
  }, [dependencies]);
  <Child onClick={handleClick} />

  // ❌ WRONG - New function every render
  <Child onClick={() => { /* logic */ }} />
  ```

- [ ] **Memoization where needed** - useMemo for expensive calculations
  ```typescript
  // ✅ GOOD - Memoized
  const filtered = useMemo(
    () => items.filter(i => i.match(query)),
    [items, query]
  );

  // ❌ WRONG - Computed on every render
  const filtered = items.filter(i => i.match(query));
  ```

### Error Handling

- [ ] **No unhandled errors** - All try/catch or Result types
  ```typescript
  // ✅ GOOD - Error handled
  try {
    await operation();
  } catch (error) {
    return { success: false, error: 'Operation failed' };
  }

  // ❌ WRONG - Unhandled
  await operation(); // Could throw!
  ```

- [ ] **Zod errors handled** - First error message returned
  ```typescript
  // ✅ GOOD
  if (error instanceof z.ZodError) {
    return {
      success: false,
      error: error.errors[0]?.message || 'Validation failed',
    };
  }

  // ❌ WRONG - Leaking internal structure
  return { success: false, errors: error.errors };
  ```

- [ ] **Meaningful error messages** - User-friendly, not technical
  ```typescript
  // ✅ GOOD - User understands
  error: 'Email already registered'

  // ❌ WRONG - Technical jargon
  error: 'Unique constraint violation on users.email'
  ```

- [ ] **Error logging with context** - Use namespaced console.error
  ```typescript
  // ✅ GOOD - Clear context
  console.error('[submitForm] Validation failed:', error);

  // ❌ WRONG - No context
  console.error(error);
  ```

### Performance

- [ ] **No N+1 queries** - Batch queries when possible
  ```typescript
  // ✅ GOOD - One query
  const posts = await db.posts.findMany({ userId: userId });

  // ❌ WRONG - N+1
  for (const userId of userIds) {
    const posts = await db.posts.findMany({ userId }); // Multiple queries
  }
  ```

- [ ] **Server Components by default** - Minimize client bundle
  ```typescript
  // ✅ GOOD - Server Component
  export default function Page() {
    // Can fetch data directly
  }

  // ❌ WRONG - Client when not needed
  'use client';
  export default function Page() {
    // Should probably be server
  }
  ```

- [ ] **Dynamic imports for large components**
  ```typescript
  // ✅ GOOD - Code split
  const HeavyComponent = dynamic(() => import('./Heavy'));

  // ❌ WRONG - In main bundle
  import HeavyComponent from './Heavy';
  ```

- [ ] **Images optimized** - Use next/image
  ```typescript
  // ✅ GOOD - Optimized
  import Image from 'next/image';
  <Image src={url} alt="description" width={400} height={300} />

  // ❌ WRONG - Unoptimized
  <img src={url} alt="description" />
  ```

### Code Organization

- [ ] **No circular dependencies** - Check import graph
  ```bash
  # Check for circular imports
  npm install --save-dev madge
  madge --circular app/
  ```

- [ ] **Imports organized** - External, internal, relative order
  ```typescript
  // ✅ GOOD - Organized
  import { z } from 'zod';
  import { Button } from '@/components/ui/button';
  import { submitForm } from './actions';

  // ❌ WRONG - Mixed order
  import { submitForm } from './actions';
  import { Button } from '@/components/ui/button';
  import { z } from 'zod';
  ```

- [ ] **Files not too large** - <300 lines for components, <500 for utilities
  ```bash
  # Check file sizes
  find app -name "*.tsx" -exec wc -l {} + | sort -rn | head -10
  ```

- [ ] **Proper file naming** - Components PascalCase, files lowercase
  ```
  ✅ components/UserProfile.tsx
  ✅ hooks/useAuth.ts
  ✅ lib/utils.ts

  ❌ components/userProfile.tsx
  ❌ hooks/auth.ts
  ❌ lib/Utils.ts
  ```

---

## Pre-Push Checklist

Run these before pushing to remote:

```bash
# 1. Type check
pnpm typecheck

# 2. Lint and format
pnpm lint
pnpm format

# 3. Build
pnpm build

# 4. All quality checks
pnpm check

# Or run full CI pipeline
pnpm ci
```

### Type Check Result

```bash
$ pnpm typecheck
# Expected: No output, exit code 0
✓ TypeScript compilation successful
```

### Lint Result

```bash
$ pnpm lint
# Expected: No errors or warnings
Checked X files in Xms.
```

### Build Result

```bash
$ pnpm build
# Expected: Build succeeds without errors
✓ Build completed successfully
```

---

## Code Review Checklist

Use this when reviewing code from teammates:

### Architecture Review

- [ ] Does the solution follow Next.js 15 patterns?
- [ ] Are Server Actions used for secure operations?
- [ ] Are components properly split between client/server?
- [ ] Is the file structure logical and organized?
- [ ] Are types imported correctly with `type` keyword?

### Type Safety Review

- [ ] No `any` types (except necessary cases)?
- [ ] All generics properly constrained?
- [ ] Error types properly handled?
- [ ] Return types explicit?

### Documentation Review

- [ ] JSDoc on all public functions?
- [ ] Examples included where helpful?
- [ ] Complex logic has explanatory comments?
- [ ] README updated if needed?

### Performance Review

- [ ] No unnecessary re-renders?
- [ ] No N+1 queries?
- [ ] Memoization used appropriately?
- [ ] Large components code-split?
- [ ] Images optimized?

### Security Review

- [ ] All input validated with Zod?
- [ ] No secrets in client code?
- [ ] Sensitive operations on server?
- [ ] SQL injection risks checked?
- [ ] XSS prevention considered?

### Testing Review

- [ ] Happy path tested?
- [ ] Error cases tested?
- [ ] Edge cases considered?
- [ ] Mocks used appropriately?

---

## Common Mistakes to Avoid

### TypeScript Mistakes

```typescript
// ❌ WRONG: Implicit any
function process(data) { }

// ✅ RIGHT: Explicit type
function process(data: unknown): void { }

// ❌ WRONG: Overly loose generic
function getData<T>(): T { }

// ✅ RIGHT: Constrained generic
function getData<T extends Record<string, unknown>>(): T { }
```

### React Mistakes

```typescript
// ❌ WRONG: Hook in conditional
if (condition) {
  const state = useState(0);
}

// ✅ RIGHT: Hook at top level
const state = useState(0);
if (condition) {
  // Use state
}

// ❌ WRONG: Dependency missing
useEffect(() => {
  console.log(value); // Missing 'value' in deps
}, []);

// ✅ RIGHT: All dependencies included
useEffect(() => {
  console.log(value);
}, [value]);
```

### Error Handling Mistakes

```typescript
// ❌ WRONG: Silent failure
try {
  await operation();
} catch { }

// ✅ RIGHT: Proper error handling
try {
  await operation();
} catch (error) {
  console.error('[operation] Error:', error);
  return { success: false, error: 'Operation failed' };
}

// ❌ WRONG: Throwing unhandled errors
export async function action(input: unknown) {
  return await process(input); // Could throw!
}

// ✅ RIGHT: Caught and returned
export async function action(input: unknown) {
  try {
    return { success: true, data: await process(input) };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
}
```

---

## Quick Checklist Commands

Run these to verify your code:

```bash
#!/bin/bash

echo "🔍 Checking for 'any' types..."
grep -r "\bany\b" app/ --include="*.ts" --include="*.tsx" | grep -v "unknown" && echo "❌ Found 'any' types!" || echo "✅ No 'any' types"

echo "\n📋 Type checking..."
pnpm typecheck && echo "✅ Types OK" || echo "❌ Type errors"

echo "\n🎨 Linting..."
pnpm lint && echo "✅ Lint OK" || echo "❌ Lint errors"

echo "\n🏗️  Building..."
pnpm build && echo "✅ Build OK" || echo "❌ Build errors"

echo "\n✨ All checks passed!"
```

Save as `.github/scripts/quality-check.sh` and run before commit!

---

## Continuous Integration

These checks run automatically in CI/CD:

```yaml
# .github/workflows/quality.yml
name: Quality Checks

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Build
        run: pnpm build
```

---

## See Also

- [EXAMPLES.md](EXAMPLES.md) - Real-world code examples
- [REFERENCE.md](REFERENCE.md) - API and pattern reference
- [BEST_PRACTICES.md](BEST_PRACTICES.md) - Advanced patterns and strategies