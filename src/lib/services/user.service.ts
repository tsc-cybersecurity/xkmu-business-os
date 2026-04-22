import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, and, ilike, count } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import type { User, NewUser } from '@/lib/db/schema'
import type { PaginatedResult } from '@/lib/utils/api-response'
import type { SessionUser, AuthResult } from '@/lib/types/auth.types'
import { logger } from '@/lib/utils/logger'

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

export interface CreatePortalUserInput {
  companyId: string
  firstName: string
  lastName: string
  email: string
  method: 'password' | 'invite'
  password?: string  // required when method === 'password'
}

const SALT_ROUNDS = 10
const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MIN_PASSWORD_LENGTH = 10

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

async function generateDummyPasswordHash(): Promise<string> {
  const random = crypto.randomBytes(24).toString('hex')
  return bcrypt.hash(random, SALT_ROUNDS)
}

export const UserService = {
  async create(data: CreateUserInput): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)

    const [user] = await db
      .insert(users)
      .values({
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
    // AUTH-01: direkte Email-Suche, kein Iterieren aller Mandanten
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
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as SessionUser['role'],
      roleId: user.roleId ?? null,
    }

    return { success: true, user: sessionUser }
  },

  async getById(userId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId)))
      .limit(1)

    return user ?? null
  },

  async getByEmail(email: string): Promise<User | null> {
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

  async delete(userId: string): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(and(eq(users.id, userId)))
      .returning({ id: users.id })

    return result.length > 0
  },

  async list(
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

  /**
   * Create a portal user (role='portal_user') for a given company.
   * Either with a direct password or via an invite token that must be redeemed via acceptInvite.
   */
  async createPortalUser(input: CreatePortalUserInput): Promise<User> {
    const email = input.email.toLowerCase()

    // Duplicate check: same email + same company + role portal_user
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.email, email),
        eq(users.companyId, input.companyId),
        eq(users.role, 'portal_user'),
      ))
      .limit(1)
    if (existing) {
      throw new Error('Portal-User mit dieser E-Mail ist fuer diese Firma bereits vorhanden')
    }

    let passwordHash: string
    let inviteToken: string | null = null
    let inviteTokenExpiresAt: Date | null = null

    if (input.method === 'password') {
      if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein`)
      }
      passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)
    } else {
      passwordHash = await generateDummyPasswordHash()
      inviteToken = generateInviteToken()
      inviteTokenExpiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS)
    }

    const [created] = await db.insert(users).values({
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: 'portal_user',
      status: 'active',
      companyId: input.companyId,
      passwordHash,
      inviteToken,
      inviteTokenExpiresAt,
    }).returning()

    logger.info(
      `Portal user created: ${created.email} (company=${input.companyId}, method=${input.method})`,
      { module: 'UserService' }
    )
    return created
  },

  /** Regenerate the invite token (e.g. "resend invite"). */
  async regenerateInviteToken(userId: string): Promise<User | null> {
    const token = generateInviteToken()
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS)
    const [updated] = await db
      .update(users)
      .set({ inviteToken: token, inviteTokenExpiresAt: expiresAt, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()
    return updated ?? null
  },

  /** Accept an invite: validate token + expiry, set password, clear token, record firstLoginAt. */
  async acceptInvite(token: string, newPassword: string): Promise<User> {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein`)
    }
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.inviteToken, token))
      .limit(1)
    if (!user) throw new Error('Ungueltiger Einladungs-Link')
    if (!user.inviteTokenExpiresAt || user.inviteTokenExpiresAt < new Date()) {
      throw new Error('Einladungs-Link ist abgelaufen')
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    const [updated] = await db.update(users).set({
      passwordHash,
      inviteToken: null,
      inviteTokenExpiresAt: null,
      firstLoginAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(users.id, user.id)).returning()
    return updated
  },
}
