'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CompanyForm } from '../../_components/company-form'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface Company {
  id: string
  name: string
  legalForm: string
  street: string
  houseNumber: string
  postalCode: string
  city: string
  country: string
  phone: string
  email: string
  website: string
  industry: string
  employeeCount: string
  annualRevenue: string
  vatId: string
  status: string
  tags: string[]
  notes: string
}

export default function EditCompanyPage() {
  const params = useParams()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  const companyId = params.id as string

  useEffect(() => {
    fetchCompany()
  }, [companyId])

  const fetchCompany = async () => {
    try {
      const response = await fetch(`/api/v1/companies/${companyId}`)
      const data = await response.json()

      if (data.success) {
        // Convert null values to empty strings for form
        const companyData = {
          ...data.data,
          legalForm: data.data.legalForm || '',
          street: data.data.street || '',
          houseNumber: data.data.houseNumber || '',
          postalCode: data.data.postalCode || '',
          city: data.data.city || '',
          country: data.data.country || 'DE',
          phone: data.data.phone || '',
          email: data.data.email || '',
          website: data.data.website || '',
          industry: data.data.industry || '',
          employeeCount: data.data.employeeCount?.toString() || '',
          annualRevenue: data.data.annualRevenue?.toString() || '',
          vatId: data.data.vatId || '',
          tags: data.data.tags || [],
          notes: data.data.notes || '',
        }
        setCompany(companyData)
      } else {
        toast.error('Firma nicht gefunden')
        router.push('/intern/contacts/companies')
      }
    } catch (error) {
      logger.error('Failed to fetch company', error, { module: 'ContactsCompaniesEditPage' })
      toast.error('Fehler beim Laden der Firma')
      router.push('/intern/contacts/companies')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  if (!company) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Firma bearbeiten</h1>
        <p className="text-muted-foreground">{company.name}</p>
      </div>

      <CompanyForm company={company} mode="edit" />
    </div>
  )
}
