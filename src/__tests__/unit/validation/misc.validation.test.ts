import { describe, it, expect } from 'vitest'
import {
  contactFormSchema,
  businessDocumentUploadSchema,
  paginationSchema,
  convertIdeaSchema,
} from '@/lib/utils/validation'

// ============================================
// contactFormSchema
// ============================================

describe('contactFormSchema', () => {
  const validBase = {
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max@example.com',
    interests: ['product-a'],
    message: 'Ich habe eine Frage.',
    privacyAccepted: true as const,
  }

  it('accepts valid minimal input', () => {
    const result = contactFormSchema.safeParse(validBase)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.firstName).toBe('Max')
      expect(result.data.lastName).toBe('Mustermann')
      expect(result.data.email).toBe('max@example.com')
      expect(result.data.interests).toEqual(['product-a'])
      expect(result.data.message).toBe('Ich habe eine Frage.')
      expect(result.data.privacyAccepted).toBe(true)
    }
  })

  it('accepts valid full input with optional fields', () => {
    const result = contactFormSchema.safeParse({
      ...validBase,
      company: 'Mustermann GmbH',
      phone: '+49 123 456789',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty string for optional company', () => {
    const result = contactFormSchema.safeParse({ ...validBase, company: '' })
    expect(result.success).toBe(true)
  })

  it('accepts empty string for optional phone', () => {
    const result = contactFormSchema.safeParse({ ...validBase, phone: '' })
    expect(result.success).toBe(true)
  })

  it('rejects missing firstName', () => {
    const { firstName, ...rest } = validBase
    const result = contactFormSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects empty firstName', () => {
    const result = contactFormSchema.safeParse({ ...validBase, firstName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing lastName', () => {
    const { lastName, ...rest } = validBase
    const result = contactFormSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects empty lastName', () => {
    const result = contactFormSchema.safeParse({ ...validBase, lastName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing email', () => {
    const { email, ...rest } = validBase
    const result = contactFormSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = contactFormSchema.safeParse({ ...validBase, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects empty interests array', () => {
    const result = contactFormSchema.safeParse({ ...validBase, interests: [] })
    expect(result.success).toBe(false)
  })

  it('accepts multiple interests', () => {
    const result = contactFormSchema.safeParse({
      ...validBase,
      interests: ['product-a', 'product-b', 'support'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing message', () => {
    const { message, ...rest } = validBase
    const result = contactFormSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects empty message', () => {
    const result = contactFormSchema.safeParse({ ...validBase, message: '' })
    expect(result.success).toBe(false)
  })

  it('rejects privacyAccepted false', () => {
    const result = contactFormSchema.safeParse({ ...validBase, privacyAccepted: false })
    expect(result.success).toBe(false)
  })

  it('rejects missing privacyAccepted', () => {
    const { privacyAccepted, ...rest } = validBase
    const result = contactFormSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })
})

// ============================================
// businessDocumentUploadSchema
// ============================================

describe('businessDocumentUploadSchema', () => {
  const validInput = {
    filename: 'report-2026.pdf',
    originalName: 'Annual Report 2026.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 204800,
  }

  it('accepts valid input', () => {
    const result = businessDocumentUploadSchema.safeParse(validInput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.filename).toBe('report-2026.pdf')
      expect(result.data.originalName).toBe('Annual Report 2026.pdf')
      expect(result.data.mimeType).toBe('application/pdf')
      expect(result.data.sizeBytes).toBe(204800)
    }
  })

  it('rejects missing filename', () => {
    const { filename, ...rest } = validInput
    const result = businessDocumentUploadSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects empty filename', () => {
    const result = businessDocumentUploadSchema.safeParse({ ...validInput, filename: '' })
    expect(result.success).toBe(false)
  })

  it('rejects filename exceeding 255 chars', () => {
    const result = businessDocumentUploadSchema.safeParse({
      ...validInput,
      filename: 'a'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing originalName', () => {
    const { originalName, ...rest } = validInput
    const result = businessDocumentUploadSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects empty originalName', () => {
    const result = businessDocumentUploadSchema.safeParse({ ...validInput, originalName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects originalName exceeding 255 chars', () => {
    const result = businessDocumentUploadSchema.safeParse({
      ...validInput,
      originalName: 'a'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing mimeType', () => {
    const { mimeType, ...rest } = validInput
    const result = businessDocumentUploadSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects empty mimeType', () => {
    const result = businessDocumentUploadSchema.safeParse({ ...validInput, mimeType: '' })
    expect(result.success).toBe(false)
  })

  it('rejects mimeType exceeding 100 chars', () => {
    const result = businessDocumentUploadSchema.safeParse({
      ...validInput,
      mimeType: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing sizeBytes', () => {
    const { sizeBytes, ...rest } = validInput
    const result = businessDocumentUploadSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects sizeBytes of zero', () => {
    const result = businessDocumentUploadSchema.safeParse({ ...validInput, sizeBytes: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative sizeBytes', () => {
    const result = businessDocumentUploadSchema.safeParse({ ...validInput, sizeBytes: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer sizeBytes', () => {
    const result = businessDocumentUploadSchema.safeParse({ ...validInput, sizeBytes: 1024.5 })
    expect(result.success).toBe(false)
  })

  it('accepts various MIME types', () => {
    for (const mimeType of [
      'image/jpeg',
      'image/png',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]) {
      const result = businessDocumentUploadSchema.safeParse({ ...validInput, mimeType })
      expect(result.success).toBe(true)
    }
  })
})

// ============================================
// paginationSchema
// ============================================

describe('paginationSchema', () => {
  it('accepts valid input with explicit values', () => {
    const result = paginationSchema.safeParse({ page: 2, limit: 50 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.limit).toBe(50)
    }
  })

  it('defaults page to 1', () => {
    const result = paginationSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.page).toBe(1)
  })

  it('defaults limit to 20', () => {
    const result = paginationSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.limit).toBe(20)
  })

  it('coerces string page to number', () => {
    const result = paginationSchema.safeParse({ page: '3', limit: '10' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(3)
      expect(result.data.limit).toBe(10)
    }
  })

  it('rejects page less than 1', () => {
    const result = paginationSchema.safeParse({ page: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects page of -1', () => {
    const result = paginationSchema.safeParse({ page: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects limit less than 1', () => {
    const result = paginationSchema.safeParse({ limit: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects limit greater than 100', () => {
    const result = paginationSchema.safeParse({ limit: 101 })
    expect(result.success).toBe(false)
  })

  it('accepts limit of exactly 100', () => {
    const result = paginationSchema.safeParse({ limit: 100 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.limit).toBe(100)
  })

  it('accepts page of exactly 1', () => {
    const result = paginationSchema.safeParse({ page: 1 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.page).toBe(1)
  })

  it('rejects non-integer page', () => {
    const result = paginationSchema.safeParse({ page: 1.5 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer limit', () => {
    const result = paginationSchema.safeParse({ limit: 10.5 })
    expect(result.success).toBe(false)
  })
})

// ============================================
// convertIdeaSchema
// ============================================

describe('convertIdeaSchema', () => {
  it('accepts valid input with both flags', () => {
    const result = convertIdeaSchema.safeParse({ createLead: true, createCompany: true })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.createLead).toBe(true)
      expect(result.data.createCompany).toBe(true)
    }
  })

  it('defaults createLead to true', () => {
    const result = convertIdeaSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.createLead).toBe(true)
  })

  it('defaults createCompany to false', () => {
    const result = convertIdeaSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.createCompany).toBe(false)
  })

  it('accepts createLead false, createCompany true', () => {
    const result = convertIdeaSchema.safeParse({ createLead: false, createCompany: true })
    expect(result.success).toBe(true)
  })

  it('accepts createLead true, createCompany false', () => {
    const result = convertIdeaSchema.safeParse({ createLead: true, createCompany: false })
    expect(result.success).toBe(true)
  })

  it('accepts empty object (uses defaults)', () => {
    const result = convertIdeaSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects non-boolean createLead', () => {
    const result = convertIdeaSchema.safeParse({ createLead: 'yes' })
    expect(result.success).toBe(false)
  })

  it('rejects non-boolean createCompany', () => {
    const result = convertIdeaSchema.safeParse({ createCompany: 1 })
    expect(result.success).toBe(false)
  })
})
