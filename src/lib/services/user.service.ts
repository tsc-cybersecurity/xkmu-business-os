import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, and, ilike, count } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import type { User, NewUser } from '@/lib/db/schema'
import type { PaginatedResult } from '@/lib/utils/api-response'
import type { SessionUser, AuthResult } from '@/lib/types/auth.types'

export interface UserFilters {
  role?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}

export interface CreateUserInput {
  email: string
  password: string
  firstName?: string
  lastName?: string
  role?: string
  roleId?: string
}

export interface UpdateUserInput {
  email?: string
  firstName?: string
  lastName?: string
  role?: string
  status?: string
}

const SALT_ROUNDS = 10

export const UserService = {
  async create(tenantId: string, data: CreateUserInput): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)

    const [user] = await db
      .insert(users)
      .values({
        tenantId,
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'member',
        roleId: data.roleId,
      })
      .returning()

    return user
  },

  async authenticate(
    email: string,
    password: string
  ): Promise<AuthResult> {
    // AUTH-01: direkte Email-Suche, kein cross-tenant Iterieren
    const user = await this.findByEmail(email)

    if (!user) {
      return { success: false, error: 'Invalid credentials' }
    }

    if (user.status !== 'active') {
      return { success: false, error: 'Account is not active' }
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)

    if (!isValid) {
      return { success: false, error: 'Invalid credentials' }
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id))

    const sessionUser: SessionUser = {
      id: user.id,
      // tenantId entfernt — AUTH-02
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as SessionUser['role'],
      roleId: user.roleId ?? null,
    }

    return { success: true, user: sessionUser }
  },

  async getById(tenantId: string, userId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId)))
      .limit(1)

    return user ?? null
  },

  async getByEmail(tenantId: string, email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.email, email.toLowerCase()))
      )
      .limit(1)

    return user ?? null
  },

  async update(
    tenantId: string,
    userId: string,
    data: UpdateUserInput
  ): Promise<User | null> {
    const updateData: Partial<NewUser> = {
      ...data,
      updatedAt: new Date(),
    }

    if (data.email) {
      updateData.email = data.email.toLowerCase()
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(and(eq(users.id, userId)))
      .returning()

    return user ?? null
  },

  async updatePassword(
    tenantId: string,
    userId: string,
    newPassword: string
  ): Promise<boolean> {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)

    const result = await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId)))
      .returning({ id: users.id })

    return result.length > 0
  },

  async delete(tenantId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(and(eq(users.id, userId)))
      .returning({ id: users.id })

    return result.length > 0
  },

  async list(
    tenantId: string,
    filters: UserFilters = {}
  ): Promise<PaginatedResult<Omit<User, 'passwordHash'>>> {
    const { role, status, search, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions: ReturnType<typeof eq>[] = []

    if (role) {
      conditions.push(eq(users.role, role))
    }
    if (status) {
      conditions.push(eq(users.status, status))
    }
    if (search) {
      conditions.push(ilike(users.email, `%${search}%`))
    }

    const whereClause = and(...conditions)

    const [items, [{ count: total }]] = await Promise.all([
      db
        .select({
          id: users.id,
          tenantId: users.tenantId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          roleId: users.roleId,
          status: users.status,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(users).where(whereClause),
    ])

    return {
      items: items as Omit<User, 'passwordHash'>[],
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    }
  },

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    return user ?? null
  },

  async emailExists(
    tenantId: string,
    email: string,
    excludeId?: string
  ): Promise<boolean> {
    const results = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.email, email.toLowerCase()))
      )
      .limit(1)

    if (results.length === 0) return false
    if (excludeId && results[0].id === excludeId) return false
    return true
  },
}
