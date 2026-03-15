# Expert Next.js 15 - Real-World Examples

Complete, production-ready code examples for common Next.js 15 patterns.

## Server Actions with Full Validation

### Example 1: User Registration Server Action

```typescript
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

/**
 * Schéma de validation stricte pour l'enregistrement utilisateur.
 *
 * @internal
 */
const RegisterSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(/[A-Z]/, { message: 'Password must contain uppercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain number' }),
  fullName: z
    .string()
    .trim()
    .min(2, { message: 'Full name required' })
    .max(255),
});

type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Response data on successful registration.
 *
 * @property {string} userId - Unique user identifier
 * @property {string} email - Confirmed email address
 * @property {string} message - Success message
 */
type RegisterSuccess = {
  userId: string;
  email: string;
  message: string;
};

/**
 * Registers a new user with complete validation and error handling.
 *
 * - Validates email format and uniqueness
 * - Enforces strong password requirements
 * - Hashes password securely (using bcrypt in real app)
 * - Creates user record in database
 * - Revalidates auth cache
 *
 * @param {unknown} input - Raw registration data
 *
 * @returns {Promise<ActionResult<RegisterSuccess>>} Registration result
 *
 * @example
 * ```typescript
 * const result = await registerUser({
 *   email: 'user@example.com',
 *   password: 'SecurePass123',
 *   fullName: 'John Doe'
 * });
 *
 * if (result.success) {
 *   console.log('User registered:', result.data.userId);
 * } else {
 *   console.error('Registration failed:', result.error);
 * }
 * ```
 */
export async function registerUser(
  input: unknown,
): Promise<ActionResult<RegisterSuccess>> {
  try {
    // Validate input
    const validatedInput = RegisterSchema.parse(input);

    // Check email uniqueness (mock - replace with DB query)
    const existingUser = false; // await checkEmailExists(validatedInput.email);
    if (existingUser) {
      return {
        success: false,
        data: null,
        error: 'Email already registered',
      };
    }

    // Hash password (mock - use bcrypt in production)
    const hashedPassword = `hashed_${validatedInput.password}`;

    // Create user in database
    const userId = 'user_' + Date.now();

    // Revalidate auth routes
    revalidatePath('/auth');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: {
        userId,
        email: validatedInput.email,
        message: `Welcome ${validatedInput.fullName}! Your account has been created.`,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        error: error.errors[0]?.message || 'Validation failed',
      };
    }

    console.error('[registerUser] Unexpected error:', error);

    return {
      success: false,
      data: null,
      error: 'Registration failed. Please try again.',
    };
  }
}
```

### Example 2: Data Update Server Action with Optimistic Updates

```typescript
'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';

/**
 * Schéma pour mise à jour profil utilisateur.
 *
 * @internal
 */
const UpdateProfileSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().trim().min(1).max(255).optional(),
  bio: z.string().trim().max(500).optional(),
  avatar: z.string().url().optional(),
});

type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/**
 * Type de données retournées après mise à jour.
 *
 * @property {string} userId - User ID updated
 * @property {Date} updatedAt - Timestamp of update
 * @property {Partial<UpdateProfileInput>} changes - Fields changed
 */
type UpdateProfileSuccess = {
  userId: string;
  updatedAt: Date;
  changes: Partial<UpdateProfileInput>;
};

/**
 * Updates user profile with selective field updates.
 *
 * Supports optimistic updates with revalidation.
 * Only provided fields are updated (partial updates).
 *
 * @param {unknown} input - Profile update data
 *
 * @returns {Promise<ActionResult<UpdateProfileSuccess>>} Update result
 *
 * @example
 * ```typescript
 * // Client component
 * const [profile, setProfile] = useState(initialProfile);
 *
 * async function handleUpdate(newName: string) {
 *   // Optimistic update
 *   setProfile(prev => ({ ...prev, name: newName }));
 *
 *   // Server update
 *   const result = await updateProfile({
 *     userId: session.userId,
 *     name: newName
 *   });
 *
 *   if (!result.success) {
 *     // Revert on error
 *     setProfile(initialProfile);
 *     toast.error(result.error);
 *   }
 * }
 * ```
 */
export async function updateProfile(
  input: unknown,
): Promise<ActionResult<UpdateProfileSuccess>> {
  try {
    const validatedInput = UpdateProfileSchema.parse(input);

    // Remove undefined fields
    const fieldsToUpdate = Object.fromEntries(
      Object.entries(validatedInput).filter(([, value]) => value !== undefined),
    );

    // Update in database (mock)
    // await db.users.update(validatedInput.userId, fieldsToUpdate);

    // Revalidate user data cache
    revalidateTag(`user_${validatedInput.userId}`);

    return {
      success: true,
      data: {
        userId: validatedInput.userId,
        updatedAt: new Date(),
        changes: fieldsToUpdate,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        error: error.errors[0]?.message || 'Update failed',
      };
    }

    return {
      success: false,
      data: null,
      error: 'Failed to update profile',
    };
  }
}
```

---

## Custom Hooks with Type Safety

### Example 3: useAsync Hook with Cleanup

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * State object returned by useAsync hook.
 *
 * @template T - Type of data resolved from async operation
 * @template E - Type of error (defaults to string)
 *
 * @property {T | null} data - Resolved data or null while loading/error
 * @property {boolean} loading - True while operation is in progress
 * @property {E | null} error - Error message or null on success
 */
export interface UseAsyncState<T, E = string> {
  data: T | null;
  loading: boolean;
  error: E | null;
}

/**
 * Manages async operation state with automatic cleanup.
 *
 * Handles loading, error, and success states automatically.
 * Prevents state updates on unmounted components (memory leak prevention).
 * Perfect for data fetching, API calls, and other async operations.
 *
 * @template T - Type of resolved data
 * @template E - Type of error object (defaults to string)
 *
 * @param {() => Promise<T>} asyncFn - Function to execute (called on mount/dependency change)
 * @param {React.DependencyList} [dependencies=[]] - Effect dependencies
 *
 * @returns {UseAsyncState<T, E>} Current state of async operation
 *
 * @example
 * ```typescript
 * // Fetch user data
 * const { data: user, loading, error } = useAsync(
 *   () => fetch('/api/user').then(r => r.json()),
 *   [],
 * );
 *
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error} />;
 * return <UserProfile user={data} />;
 * ```
 *
 * @example
 * ```typescript
 * // Refetch when ID changes
 * const { data: post, loading, error } = useAsync(
 *   () => fetch(`/api/posts/${postId}`).then(r => r.json()),
 *   [postId], // Refetch when postId changes
 * );
 * ```
 */
export function useAsync<T, E = string>(
  asyncFn: () => Promise<T>,
  dependencies: React.DependencyList = [],
): UseAsyncState<T, E> {
  const [state, setState] = useState<UseAsyncState<T, E>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const data = await asyncFn();
        if (isMounted) {
          setState({ data, loading: false, error: null });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            data: null,
            loading: false,
            error: (error instanceof Error
              ? error.message
              : String(error)) as E,
          });
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return state;
}
```

### Example 4: useDebounce Hook for Search

```typescript
'use client';

import { useState, useEffect } from 'react';

/**
 * Debounces a value with specified delay.
 *
 * Useful for search inputs, form fields, and other user input
 * that triggers expensive operations (API calls, filtering, etc).
 *
 * @template T - Type of value to debounce
 *
 * @param {T} value - Value to debounce
 * @param {number} [delay=500] - Delay in milliseconds
 *
 * @returns {T} Debounced value
 *
 * @example
 * ```typescript
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 *
 * // Only fetch when user stops typing for 300ms
 * useEffect(() => {
 *   if (!debouncedSearchTerm) return;
 *   fetchSearchResults(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 *
 * return (
 *   <input
 *     value={searchTerm}
 *     onChange={e => setSearchTerm(e.target.value)}
 *     placeholder="Search users..."
 *   />
 * );
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

---

## React Components with Proper Typing

### Example 5: Form Component with Server Action

```typescript
'use client';

import { FormEvent, useState } from 'react';
import { submitTestForm } from '@/app/test-form/actions';

interface ContactFormProps {
  onSuccess?: () => void;
  defaultEmail?: string;
}

/**
 * Contact form component with server-side submission.
 *
 * Handles form state, validation feedback, and submission.
 * Integrates with Server Action for secure backend processing.
 *
 * @param {ContactFormProps} props - Component props
 * @param {() => void} [props.onSuccess] - Callback on successful submission
 * @param {string} [props.defaultEmail] - Pre-fill email field
 *
 * @returns {React.ReactElement} Form component
 *
 * @example
 * ```typescript
 * <ContactForm
 *   defaultEmail="user@example.com"
 *   onSuccess={() => router.push('/success')}
 * />
 * ```
 */
export function ContactForm({
  onSuccess,
  defaultEmail = '',
}: ContactFormProps): React.ReactElement {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: defaultEmail,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await submitTestForm(formData);

      if (result.success) {
        setMessage({
          type: 'success',
          text: result.data.message,
        });
        setFormData({ firstName: '', lastName: '', email: defaultEmail });
        onSuccess?.();
      } else {
        setMessage({
          type: 'error',
          text: result.error,
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div
          className={`p-3 rounded ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <input
        type="text"
        placeholder="First Name"
        value={formData.firstName}
        onChange={(e) =>
          setFormData((p) => ({ ...p, firstName: e.target.value }))
        }
        disabled={isSubmitting}
        required
      />

      <input
        type="text"
        placeholder="Last Name"
        value={formData.lastName}
        onChange={(e) =>
          setFormData((p) => ({ ...p, lastName: e.target.value }))
        }
        disabled={isSubmitting}
        required
      />

      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
        disabled={isSubmitting}
        required
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

### Example 6: Reusable Button Component

```typescript
import React, { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

/**
 * Reusable button component with variants and sizes.
 *
 * Supports different visual styles and loading states.
 * Fully typed with proper HTML button attributes.
 *
 * @param {ButtonProps} props - Button properties
 * @param {string} [props.variant='primary'] - Visual style
 * @param {string} [props.size='md'] - Button size
 * @param {boolean} [props.isLoading=false] - Show loading state
 * @param {React.ReactNode} props.children - Button content
 *
 * @returns {React.ReactElement} Rendered button
 *
 * @example
 * ```typescript
 * <Button variant="primary" size="lg" onClick={handleClick}>
 *   Click Me
 * </Button>
 *
 * <Button variant="danger" isLoading={true}>
 *   Deleting...
 * </Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      className,
      disabled,
      children,
      ...props
    },
    ref,
  ): React.ReactElement => {
    const baseStyles =
      'font-semibold rounded-lg transition-colors disabled:opacity-50';

    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    };

    const sizeStyles = {
      sm: 'px-3 py-1 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? 'Loading...' : children}
      </button>
    );
  },
);

Button.displayName = 'Button';
```

---

## Advanced Patterns

### Example 7: Error Boundary Component

```typescript
'use client';

import { ReactNode, ReactElement } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactElement;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component to catch render errors.
 *
 * Catches errors in child components and displays fallback UI.
 * Prevents entire app crash from single component error.
 *
 * @param {ErrorBoundaryProps} props - Props
 * @param {ReactNode} props.children - Child components
 * @param {(error: Error) => ReactElement} [props.fallback] - Error UI
 *
 * @returns {ReactElement} Component or fallback UI
 *
 * @example
 * ```typescript
 * <ErrorBoundary
 *   fallback={(error) => (
 *     <div className="p-4 bg-red-100">
 *       <h2>Something went wrong</h2>
 *       <p>{error.message}</p>
 *     </div>
 *   )}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    console.error('[ErrorBoundary] Caught error:', error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback?.(this.state.error!) || (
          <div className="p-4 bg-red-100 text-red-900 rounded">
            <h2 className="font-bold">Something went wrong</h2>
            <p>{this.state.error?.message}</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

---

## Testing Strategy

### Example 8: Unit Test for Server Action

```typescript
// app/test-form/__tests__/actions.test.ts
import { describe, it, expect } from 'vitest';
import { submitTestForm } from '../actions';

describe('submitTestForm', () => {
  it('should validate and accept valid input', async () => {
    const result = await submitTestForm({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('john@example.com');
      expect(result.data.fullName).toBe('John Doe');
    }
  });

  it('should reject invalid email', async () => {
    const result = await submitTestForm({
      firstName: 'John',
      lastName: 'Doe',
      email: 'invalid-email',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('email');
  });

  it('should reject short name', async () => {
    const result = await submitTestForm({
      firstName: 'J',
      lastName: 'Doe',
      email: 'john@example.com',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('2 caractères');
  });
});
```

---

## Quick Reference

| Pattern | File | Import |
|---------|------|--------|
| Server Action | `app/*/actions.ts` | `'use server'` |
| Custom Hook | `hooks/use*.ts` | `'use client'` |
| Component | `components/*.tsx` | Client/Server |
| Type Definition | `types/index.ts` | TypeScript |
| Utility | `lib/utils.ts` | Pure functions |

For more patterns, see [REFERENCE.md](REFERENCE.md) and [BEST_PRACTICES.md](BEST_PRACTICES.md).