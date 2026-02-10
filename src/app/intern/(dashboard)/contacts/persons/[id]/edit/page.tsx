'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PersonForm } from '../../_components/person-form'
import { toast } from 'sonner'

interface Person {
  id: string
  salutation: string
  firstName: string
  lastName: string
  email: string
  phone: string
  mobile: string
  jobTitle: string
  department: string
  companyId: string
  street: string
  houseNumber: string
  postalCode: string
  city: string
  country: string
  status: string
  isPrimaryContact: boolean
  tags: string[]
  notes: string
}

function EditPersonForm() {
  const params = useParams()
  const router = useRouter()
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)

  const personId = params.id as string

  useEffect(() => {
    fetchPerson()
  }, [personId])

  const fetchPerson = async () => {
    try {
      const response = await fetch(`/api/v1/persons/${personId}`)
      const data = await response.json()

      if (data.success) {
        // Convert null values to empty strings for form
        const personData = {
          ...data.data,
          salutation: data.data.salutation || '',
          email: data.data.email || '',
          phone: data.data.phone || '',
          mobile: data.data.mobile || '',
          jobTitle: data.data.jobTitle || '',
          department: data.data.department || '',
          companyId: data.data.companyId || '',
          street: data.data.street || '',
          houseNumber: data.data.houseNumber || '',
          postalCode: data.data.postalCode || '',
          city: data.data.city || '',
          country: data.data.country || 'DE',
          tags: data.data.tags || [],
          notes: data.data.notes || '',
        }
        setPerson(personData)
      } else {
        toast.error('Person nicht gefunden')
        router.push('/intern/contacts/persons')
      }
    } catch (error) {
      console.error('Failed to fetch person:', error)
      toast.error('Fehler beim Laden der Person')
      router.push('/intern/contacts/persons')
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

  if (!person) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Person bearbeiten</h1>
        <p className="text-muted-foreground">
          {person.firstName} {person.lastName}
        </p>
      </div>

      <PersonForm person={person} mode="edit" />
    </div>
  )
}

export default function EditPersonPage() {
  return (
    <Suspense fallback={<div>Laden...</div>}>
      <EditPersonForm />
    </Suspense>
  )
}
