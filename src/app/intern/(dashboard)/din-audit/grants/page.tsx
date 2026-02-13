'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExternalLink, Loader2 } from 'lucide-react'

interface Grant {
  id: string
  name: string
  provider: string
  purpose: string | null
  url: string | null
  region: string
  minEmployees: number | null
  maxEmployees: number | null
}

export default function GrantsPage() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const fetchGrants = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedRegion && selectedRegion !== 'all') {
        params.set('region', selectedRegion)
      }
      const response = await fetch(`/api/v1/din/grants?${params}`)
      const data = await response.json()
      if (data.success) {
        setGrants(data.data.grants)
        if (regions.length === 0) {
          setRegions(data.data.regions)
        }
      }
    } catch (error) {
      console.error('Failed to fetch grants:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedRegion, regions.length])

  useEffect(() => {
    fetchGrants()
  }, [fetchGrants])

  const formatEmployeeRange = (min: number | null, max: number | null) => {
    if (min && max) return `${min} - ${max} Mitarbeiter`
    if (max) return `bis ${max} Mitarbeiter`
    if (min) return `ab ${min} Mitarbeiter`
    return 'Keine Einschraenkung'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Foerdermittel</h1>
          <p className="text-muted-foreground">
            Bundes- und Landesfoerderprogramme fuer IT-Sicherheit und Digitalisierung
          </p>
        </div>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Region:</label>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Alle Regionen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Regionen</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              {grants.length} Programme gefunden
            </span>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : grants.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">Keine Foerderprogramme gefunden.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {grants.map((grant) => (
            <Card key={grant.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{grant.name}</CardTitle>
                    <CardDescription>{grant.provider}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{grant.region}</Badge>
                    {grant.url && (
                      <a href={grant.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {grant.purpose && (
                  <p className="text-sm mb-2">{grant.purpose}</p>
                )}
                <div className="text-xs text-muted-foreground">
                  {formatEmployeeRange(grant.minEmployees, grant.maxEmployees)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
