# Expert Next.js 15 - Best Practices Deep Dive

Advanced patterns and best practices for production Next.js 15 applications.

## 1. Server Components vs Client Components Strategy

### When to Use Server Components (Default)

✅ **Use Server Components when:**
- Fetching data directly from database
- Accessing environment variables (secrets)
- Keeping large dependencies on server
- Building pages or layouts
- Processing sensitive data

```typescript
// ✅ GOOD - Server Component
export default function UserPage({ params }: { params: { id: string } }) {
  // Direct database access
  const user = await db.users.findUnique({ where: { id: params.id } });

  // Render server-side
  return (
    <div>
      <h1>{user.name}</h1>
      {/* Safe - can include sensitive data */}
      <p>Email verified: {user.emailVerified}</p>
    </div>
  );
}
```

### When to Use Client Components

✅ **Use Client Components when:**
- Using React hooks (useState, useEffect, etc.)
- Adding interactivity (onClick, onChange, etc.)
- Browser APIs (localStorage, sessionStorage)
- Conditional rendering based on client state
- Event listeners or forms

```typescript
// ✅ GOOD - Client Component with interactivity
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}
```

### Hybrid Approach

```typescript
// ✅ BEST - Server Component with Client Components nested

// Server Component - fetches data
export default async function Page() {
  const data = await fetchServerData();

  return (
    <div>
      {/* Pass data to client component */}
      <ClientComponent initialData={data} />
    </div>
  );
}

// Client Component - handles interactivity
'use client';
function ClientComponent({ initialData }) {
  const [state, setState] = useState(initialData);
  // Interactive code here
  return <div>{/* render */}</div>;
}
```

---

## 2. State Management Strategy

### Local State (useState)

```typescript
// ✅ USE for: Form inputs, UI toggles, temporary state
'use client';

function EditForm({ user }: { user: User }) {
  const [name, setName] = useState(user.name);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setIsSaving(true);
      await updateUser({ name });
      setIsSaving(false);
    }}>
      <input value={name} onChange={e => setName(e.target.value)} />
      <button disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
    </form>
  );
}
```

### Context API

```typescript
// ✅ USE for: Theme, auth, global app state

// app/providers.tsx
'use client';

import { createContext, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

export const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: 'light',
  setTheme: () => {},
});

export function Providers({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// In component
'use client';

import { useContext } from 'react';
import { ThemeContext } from '@/app/providers';

export function ThemeToggle() {
  const { theme, setTheme } = useContext(ThemeContext);

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      {theme}
    </button>
  );
}
```

### Server State (Caching & Revalidation)

```typescript
// ✅ USE for: User data, posts, any database content

// app/dashboard/page.tsx
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

// Cache function for 1 hour
const getPosts = unstable_cache(
  async () => {
    return await db.posts.findMany();
  },
  ['posts'],
  { revalidate: 3600 },
);

export default async function Dashboard() {
  const posts = await getPosts();

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>{post.title}</article>
      ))}
    </div>
  );
}

// Revalidate on demand
export async function deletePost(id: string) {
  'use server';

  await db.posts.delete({ where: { id } });

  // Revalidate cache
  revalidateTag('posts');
  revalidatePath('/dashboard');
}
```

---

## 3. Data Fetching Patterns

### Server Component Data Fetching

```typescript
// ✅ BEST - Direct database in Server Component
import { db } from '@/lib/db';

async function UsersList() {
  // Direct database access - no network overhead
  const users = await db.users.findMany();

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### API Routes for Client Fetching

```typescript
// When client needs data: Use API Routes

// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const users = await db.users.findMany();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Client component using it
'use client';

import { useAsync } from '@/hooks/use-async';

function UsersList() {
  const { data: users, loading, error } = useAsync(
    () => fetch('/api/users').then(r => r.json()),
    []
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Server Actions for Mutations

```typescript
// ✅ BEST - Use Server Actions for all data modifications

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const UpdateUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

export async function updateUser(input: unknown): Promise<ActionResult<User>> {
  try {
    const data = UpdateUserSchema.parse(input);

    const user = await db.users.update({
      where: { id: data.id },
      data: { name: data.name, email: data.email },
    });

    // Revalidate related pages
    revalidatePath('/users');
    revalidatePath(`/users/${user.id}`);

    return { success: true, data: user };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        error: error.errors[0]?.message || 'Validation failed',
      };
    }

    return {
      success: false,
      data: null,
      error: 'Update failed',
    };
  }
}

// Client usage
'use client';

import { updateUser } from './actions';

export function EditUserForm({ user }: { user: User }) {
  const [formData, setFormData] = useState(user);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await updateUser(formData);

    if (result.success) {
      // Show success
    } else {
      // Show error
      alert(result.error);
    }

    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

---

## 4. Form Handling Best Practices

### Form State Management

```typescript
// ✅ GOOD - Controlled form with proper state

'use client';

import { FormEvent, useState } from 'react';
import { submitForm } from './actions';

interface FormData {
  email: string;
  name: string;
  message: string;
}

interface FormErrors {
  [key in keyof FormData]?: string;
}

export function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    message: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const result = await submitForm(formData);

    if (result.success) {
      setSubmitted(true);
      setFormData({ email: '', name: '', message: '' });
    } else {
      setErrors({ email: result.error });
    }

    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="email"
          value={formData.email}
          onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
          disabled={isSubmitting}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
          disabled={isSubmitting}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div>
        <textarea
          value={formData.message}
          onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
          disabled={isSubmitting}
        />
        {errors.message && <span className="error">{errors.message}</span>}
      </div>

      <button disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>

      {submitted && <p className="success">Thank you!</p>}
    </form>
  );
}
```

### Using react-hook-form (Advanced)

```typescript
// ✅ For complex forms, use react-hook-form

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { submitForm } from './actions';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  message: z.string().min(10),
});

type FormData = z.infer<typeof schema>;

export function ContactForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
    });

  async function onSubmit(data: FormData) {
    const result = await submitForm(data);
    if (!result.success) {
      alert(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input {...register('email')} />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      <div>
        <input {...register('name')} />
        {errors.name && <span>{errors.name.message}</span>}
      </div>

      <div>
        <textarea {...register('message')} />
        {errors.message && <span>{errors.message.message}</span>}
      </div>

      <button disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

---

## 5. Authentication & Authorization

### Auth Pattern

```typescript
// lib/auth.ts
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET!);

export async function getSession() {
  const token = (await cookies()).get('auth')?.value;

  if (!token) return null;

  try {
    const verified = await jwtVerify(token, SECRET);
    return verified.payload;
  } catch {
    return null;
  }
}

// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function Dashboard() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Welcome, {session.name}</h1>
      {/* Protected content */}
    </div>
  );
}
```

### Protected Server Actions

```typescript
'use server';

import { getSession } from '@/lib/auth';
import { AppError } from '@/lib/errors';

export async function protectedAction(input: unknown) {
  const session = await getSession();

  if (!session) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED');
  }

  if (session.role !== 'admin') {
    throw new AppError('Forbidden', 'FORBIDDEN');
  }

  // Admin-only operation
}
```

---

## 6. Performance Optimization

### Image Optimization

```typescript
// ✅ GOOD - Use next/image
import Image from 'next/image';

export function UserAvatar({ src, name }: { src: string; name: string }) {
  return (
    <Image
      src={src}
      alt={name}
      width={40}
      height={40}
      className="rounded-full"
    />
  );
}

// ❌ WRONG - Plain img tag
export function UserAvatar({ src, name }: { src: string; name: string }) {
  return <img src={src} alt={name} className="rounded-full w-10 h-10" />;
}
```

### Code Splitting

```typescript
// ✅ GOOD - Dynamic import for heavy component
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <div>Loading chart...</div>,
});

export function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <HeavyChart /> {/* Loaded separately */}
    </div>
  );
}
```

### Memoization Strategy

```typescript
// ✅ USE useMemo for expensive calculations
import { useMemo } from 'react';

export function DataTable({ items, searchTerm }: Props) {
  // Only recompute when items or searchTerm changes
  const filtered = useMemo(
    () => items.filter(i => i.name.includes(searchTerm)),
    [items, searchTerm]
  );

  return (
    <table>
      {/* Render filtered data */}
    </table>
  );
}

// ✅ USE React.memo for expensive renders
import { memo } from 'react';

const UserCard = memo(function UserCard({ user }: { user: User }) {
  return (
    <div className="card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
});

export function UsersList({ users }: { users: User[] }) {
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

---

## 7. Error Handling Strategy

### Custom Error Class

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN',
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Usage in Server Action
'use server';

import { AppError } from '@/lib/errors';

export async function deleteUser(id: string) {
  try {
    const user = await db.users.findUnique({ where: { id } });

    if (!user) {
      throw new AppError('User not found', 'NOT_FOUND', 404);
    }

    await db.users.delete({ where: { id } });
  } catch (error) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    return {
      success: false,
      error: 'Operation failed',
      code: 'INTERNAL_ERROR',
    };
  }
}
```

### Global Error Handler

```typescript
// app/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-xl font-bold">Something went wrong!</h2>
      <p className="text-gray-600 mt-2">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Try again
      </button>
    </div>
  );
}
```

---

## 8. Testing Strategy

### Unit Testing Server Actions

```typescript
// app/auth/__tests__/actions.test.ts
import { describe, it, expect, vi } from 'vitest';
import { registerUser } from '../actions';

describe('registerUser', () => {
  it('registers new user with valid data', async () => {
    const result = await registerUser({
      email: 'test@example.com',
      password: 'SecurePass123',
      name: 'Test User',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('rejects duplicate email', async () => {
    const result = await registerUser({
      email: 'existing@example.com',
      password: 'SecurePass123',
      name: 'Test User',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('already registered');
  });

  it('rejects weak password', async () => {
    const result = await registerUser({
      email: 'test@example.com',
      password: 'weak',
      name: 'Test User',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('password');
  });
});
```

### Component Testing

```typescript
// components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<Button isLoading>Save</Button>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

---

## See Also

- [EXAMPLES.md](EXAMPLES.md) - Code examples
- [REFERENCE.md](REFERENCE.md) - API reference
- [CHECKLIST.md](CHECKLIST.md) - Quality checklist