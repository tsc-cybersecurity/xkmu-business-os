# Expert Next.js 15 - API Reference

Complete API reference for patterns, types, and utility functions used in this Skill.

## Type System Reference

### ActionResult<T> - Standardized Response Type

**Definition**:
```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; data: null; error: string };
```

**Purpose**: Standardized response format for all Server Actions. Eliminates exceptions and provides type-safe error handling.

**Usage**:
```typescript
// Define domain type
type UserData = {
  id: string;
  email: string;
  name: string;
};

// Use ActionResult with domain type
type CreateUserResponse = ActionResult<UserData>;

// Handle response
const result: CreateUserResponse = await createUser(input);

if (result.success) {
  // TypeScript knows result.data is UserData
  console.log(result.data.email);
} else {
  // TypeScript knows result.error is string
  console.error(result.error);
}
```

**Benefits**:
- ✅ Type-safe error handling
- ✅ No try/catch on client
- ✅ Consistent across all Server Actions
- ✅ Supports discriminated union types

---

### Discriminated Union Pattern

Used throughout for type safety:

```typescript
// ✅ CORRECT - Type discriminator (success field)
type Result =
  | { success: true; data: User }
  | { success: false; error: string };

// Type guard
function handleResult(result: Result) {
  if (result.success) {
    // TypeScript narrows to first union
    console.log(result.data.name); // ✅ Valid
  } else {
    // TypeScript narrows to second union
    console.log(result.error); // ✅ Valid
  }
}

// ❌ WRONG - Multiple possible types
type BadResult = { success?: boolean; data?: User; error?: string };
// TypeScript can't narrow types effectively
```

---

## Zod Validation Patterns

### String Validation

```typescript
// Basic string
z.string()

// With constraints
z.string().min(1).max(255)

// With auto-trim
z.string().trim()

// Email validation
z.string().email()

// URL validation
z.string().url()

// Case normalization
z.string().toLowerCase()
z.string().toUpperCase()

// Enum validation
z.enum(['admin', 'user', 'guest'])

// Optional with default
z.string().optional().default('default_value')

// Nullable
z.string().nullable()
```

### Number Validation

```typescript
// Basic number
z.number()

// Integer only
z.number().int()

// Range validation
z.number().min(0).max(100)

// Positive/Negative
z.number().positive()
z.number().negative()
```

### Object Validation

```typescript
// Basic object schema
z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().positive(),
})

// Partial updates (some fields optional)
z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
})

// Nested validation
z.object({
  user: z.object({
    name: z.string(),
    profile: z.object({
      bio: z.string().optional(),
    }),
  }),
})

// Union types
z.object({
  type: z.enum(['admin', 'user']),
  permissions: z.string().array(),
})
```

### Array Validation

```typescript
// Array of strings
z.string().array()

// Array with constraints
z.string().array().min(1).max(10)

// Array of objects
z.object({ id: z.string() }).array()
```

### Custom Validation

```typescript
// Refine existing schema
z.string().email().refine(
  (email) => !email.endsWith('@deprecated.com'),
  { message: 'Email domain not allowed' }
)

// Superrefine for advanced validation
z.object({ password: z.string(), confirm: z.string() }).superRefine(
  ({ password, confirm }, ctx) => {
    if (password !== confirm) {
      ctx.addIssue({
        code: z.ZodErrorCode.custom,
        path: ['confirm'],
        message: 'Passwords do not match',
      });
    }
  }
)
```

---

## TypeScript Strict Mode Patterns

### Proper Generic Constraints

```typescript
// ❌ WRONG - Generic too loose
function getData<T>(id: string): T {
  // Can return anything!
}

// ✅ RIGHT - Proper constraints
function getData<T extends { id: string }>(id: string): T {
  // T must have 'id' property
}

// ✅ RIGHT - Multiple constraints
function getData<T extends Record<string, unknown>>(data: T): T {
  // T is object-like with string keys
}
```

### Type Guards and Narrowing

```typescript
// Error type guard
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

// Usage in error handling
if (isError(error)) {
  console.log(error.message); // ✅ Type-safe
}

// Zod error guard
import { ZodError } from 'zod';

if (error instanceof ZodError) {
  console.log(error.errors[0]?.message);
}
```

### Defensive Type Assertions

```typescript
// Type assertion (use sparingly)
const value = someData as string;

// Type assertion with validation
const value = (() => {
  const result = someData;
  if (typeof result === 'string') {
    return result;
  }
  throw new Error('Expected string');
})();

// `as const` for literal types
const ROLES = ['admin', 'user', 'guest'] as const;
type Role = (typeof ROLES)[number]; // 'admin' | 'user' | 'guest'
```

---

## Server Action Patterns

### Validation Pattern

```typescript
'use server';

import { z } from 'zod';

// 1. Define schema
const InputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

// 2. Define types
type Input = z.infer<typeof InputSchema>;
type Success = { id: string; email: string };

// 3. Implement action
export async function myAction(
  input: unknown,
): Promise<ActionResult<Success>> {
  try {
    // 4. Validate
    const validated = InputSchema.parse(input);

    // 5. Process
    const result = await processData(validated);

    // 6. Return success
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    // 7. Handle errors
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        error: error.errors[0]?.message || 'Validation failed',
      };
    }

    console.error('[myAction] Error:', error);

    return {
      success: false,
      data: null,
      error: 'Operation failed',
    };
  }
}
```

### Cache Revalidation Pattern

```typescript
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateUser(input: unknown): Promise<ActionResult<User>> {
  try {
    const validated = UserSchema.parse(input);

    // Update database
    const user = await db.users.update(validated);

    // Revalidate by path
    revalidatePath('/users');
    revalidatePath(`/users/${user.id}`);

    // Revalidate by tag
    revalidateTag(`user_${user.id}`);

    return { success: true, data: user };
  } catch (error) {
    // ... error handling
  }
}
```

---

## React Hooks Patterns

### useAsync Hook Pattern

```typescript
export function useAsync<T, E = string>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList = [],
): UseAsyncState<T, E> {
  const [state, setState] = useState<UseAsyncState<T, E>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true; // Memory leak prevention

    (async () => {
      try {
        const data = await asyncFn();
        if (isMounted) setState({ data, loading: false, error: null });
      } catch (error) {
        if (isMounted) {
          setState({
            data: null,
            loading: false,
            error: (error instanceof Error ? error.message : String(error)) as E,
          });
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, deps);

  return state;
}
```

**Key patterns**:
- ✅ `isMounted` flag prevents state updates after unmount
- ✅ Generic `<T, E>` for type flexibility
- ✅ Dependency array for refetch control
- ✅ Always clean up in return callback

### useMemo for Performance

```typescript
// ✅ USE when:
// - Computing expensive value
// - Value is in dependency array of other hooks
// - Value is object/array passed to child components

const expensiveValue = useMemo(
  () => computeExpensiveValue(data),
  [data] // Only recompute when data changes
);

// ❌ DON'T USE for:
// - Primitive values (numbers, strings)
// - Simple calculations
// - Premature optimization
```

### useCallback for Functions

```typescript
// ✅ USE when:
// - Function is dependency in child useEffect
// - Function is passed to memoized child component
// - Function is expensive to recreate

const handleClick = useCallback(
  () => {
    processData(value);
  },
  [value] // Only recreate when value changes
);

// ❌ DON'T USE for:
// - Event handlers only used locally
// - All functions (premature optimization)
```

---

## Component Patterns

### Client vs Server Components Decision Tree

```
Is this a component?
├─ YES: Does it use hooks or 'use client' features?
│  ├─ YES: Use 'use client' (Client Component)
│  └─ NO: Keep as Server Component (default)
└─ NO: Use Server Action 'use server'

Client Component Features:
✅ useState, useEffect, useContext, etc.
✅ Event listeners (onClick, onChange, etc.)
✅ Browser APIs (localStorage, sessionStorage, etc.)
✅ Interactive features

Server Component Features:
✅ Direct database queries
✅ Secret environment variables
✅ Secure operations
✅ Large dependencies
```

### Component Props Typing

```typescript
// ✅ GOOD - Explicit prop types
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  ...props
}: ButtonProps): React.ReactElement {
  // Implementation
}

// ❌ WRONG - Implicit any
export function Button(props: any) {
  // Type safety lost
}
```

---

## Error Handling Reference

### Error Classification

```typescript
// ZodError - Validation failures
try {
  schema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    // User input error - return to client
    return { success: false, error: error.errors[0]?.message };
  }
}

// AppError - Business logic error
class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN',
    public cause?: unknown,
  ) {
    super(message);
  }
}

// Unexpected error - log and return generic message
} catch (error) {
  console.error('[operation] Unexpected error:', error);
  return { success: false, error: 'Operation failed' };
}
```

### Error Messages

```typescript
// ❌ AVOID - Technical errors exposed to users
"TypeError: Cannot read properties of undefined (reading 'email')"

// ✅ USE - User-friendly messages
"Please provide a valid email address"

// Technical details go to console
console.error('[submitForm] Error:', error);
```

---

## Testing Reference

### Test File Structure

```typescript
// app/features/__tests__/actions.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { myAction } from '../actions';

describe('myAction', () => {
  describe('Success cases', () => {
    it('should handle valid input', async () => {
      const result = await myAction({ /* valid */ });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBeDefined();
      }
    });
  });

  describe('Error cases', () => {
    it('should reject invalid input', async () => {
      const result = await myAction({ /* invalid */ });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('Edge cases', () => {
    it('should handle null values', async () => {
      const result = await myAction(null);
      expect(result.success).toBe(false);
    });
  });
});
```

### Testing Server Actions

```typescript
// Don't mock Server Actions - run them real

// ✅ GOOD - Test actual Server Action
const result = await submitTestForm({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
});

// ❌ WRONG - Mock away the thing you're testing
vi.mock('../actions', () => ({
  submitTestForm: vi.fn().mockResolvedValue({ success: true }),
}));
```

---

## Performance Checklist

```typescript
// ✅ DO:
- Use Server Components by default
- Fetch on server, pass data to client
- Split large bundles with dynamic imports
- Memoize expensive calculations
- Use proper cache headers
- Implement pagination for lists

// ❌ AVOID:
- N+1 database queries
- Fetching on client when possible
- Large dependencies in client bundle
- Unnecessary re-renders
- Blocking rendering with heavy computations
```

---

## Security Checklist

```typescript
// ✅ DO:
- Use Server Actions for sensitive operations
- Validate all input with Zod
- Normalize and trim user input
- Use environment variables for secrets
- Implement proper authentication/authorization
- Sanitize output for XSS prevention

// ❌ AVOID:
- Exposing secrets in client code
- Trusting client-side validation only
- Running sensitive operations client-side
- Storing sensitive data in localStorage
- Using eval() or Function() constructors
```

---

## Project Structure Reference

```
my-nextjs-app/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                  # Route group for organization
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── api/                     # API routes
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── actions.ts          # Server Actions
│   └── layout.tsx              # Root layout with providers
│
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── common/                  # App-specific components
│   └── forms/                   # Form components
│
├── hooks/                        # Custom React hooks
│   ├── use-async.ts
│   ├── use-debounce.ts
│   └── use-fetch.ts
│
├── lib/                          # Utilities
│   ├── utils.ts                # cn() helper
│   ├── auth.ts                 # Auth utilities
│   └── db.ts                   # Database client
│
├── types/                        # TypeScript types
│   ├── index.ts                # Export all types
│   └── entities.ts             # Domain models
│
├── tsconfig.json               # TypeScript config (strict mode)
├── biome.json                  # Code quality config
└── package.json
```

---

## Commands Reference

```bash
# Type checking
pnpm typecheck

# Linting and formatting
pnpm lint
pnpm format
pnpm fix

# Quality checks
pnpm check
pnpm check:strict

# Building
pnpm build
pnpm start

# Development
pnpm dev

# CI/CD validation
pnpm ci
pnpm validate
```

For examples, see [EXAMPLES.md](EXAMPLES.md).
For best practices, see [BEST_PRACTICES.md](BEST_PRACTICES.md).