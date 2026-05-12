/**
 * Schema.org JSON-LD Markup fuer xKMU.
 *
 * Wird global in src/app/layout.tsx im <head> ausgespielt — gilt fuer
 * jede oeffentliche Seite. Ergaenzt seitenspezifische Schemas (z.B.
 * FAQPage aus FaqBlock) als zusaetzliches Knowledge-Graph-Signal.
 *
 * Quelle: Schema.org / Google Search Central Structured Data Guidelines.
 * Validierbar via https://search.google.com/test/rich-results.
 */

export interface OrganizationSchemaInput {
  siteUrl: string
  logoUrl?: string | null
}

export function buildOrganizationJsonLd({ siteUrl, logoUrl }: OrganizationSchemaInput): unknown[] {
  const baseUrl = siteUrl.replace(/\/$/, '')
  const absoluteLogoUrl = logoUrl
    ? (logoUrl.startsWith('http') ? logoUrl : `${baseUrl}${logoUrl}`)
    : undefined

  // 1) LocalBusiness (subtype Organization) — primaere Entitaet
  const localBusiness: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'ProfessionalService'],
    '@id': `${baseUrl}/#organization`,
    name: 'xKMU digital solutions UG (haftungsbeschränkt)',
    alternateName: 'xKMU',
    url: baseUrl,
    description:
      'Pragmatische Beratung für kleine und mittlere Unternehmen in den Bereichen KI, IT und Cybersecurity. Festpreise, klare Deliverables, regional aus Weimar in Thüringen — remote und vor Ort.',
    telephone: '+49 30 754 23942',
    email: 'kontakt@xkmu.de',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Weimar',
      postalCode: '99423',
      addressRegion: 'TH',
      addressCountry: 'DE',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 50.9795,
      longitude: 11.3235,
    },
    areaServed: [
      { '@type': 'State', name: 'Thüringen' },
      { '@type': 'Country', name: 'Deutschland' },
    ],
    knowsAbout: [
      'KI-Beratung',
      'KI-Automatisierung',
      'IT-Beratung',
      'IT-Infrastruktur',
      'Cloud-Migration',
      'Microsoft 365',
      'Cybersecurity-Beratung',
      'NIS-2 Compliance',
      'NIS2UmsuCG',
      'IT-Grundschutz',
      'DSGVO',
      'Incident Response',
    ],
    priceRange: 'ab 490 €',
    founder: {
      '@type': 'Person',
      '@id': `${baseUrl}/#founder`,
    },
    sameAs: [
      'https://www.linkedin.com/company/xkmu',
    ],
  }

  if (absoluteLogoUrl) {
    localBusiness.logo = absoluteLogoUrl
    localBusiness.image = absoluteLogoUrl
  }

  // 2) Person — Gruender mit Credentials (E-E-A-T)
  const founder: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${baseUrl}/#founder`,
    name: 'Tino Stenzel',
    jobTitle: 'Gründer & Geschäftsführer',
    description:
      'Seit dem Jahr 2000 in der IT — über 25 Jahre Erfahrung in IT-Infrastruktur, Cloud-Migrationen und Cybersecurity für mittelständische Unternehmen. Schwerpunkte heute: pragmatische KI-Einführung für KMU, NIS-2-Compliance und Modernisierung gewachsener IT-Landschaften.',
    worksFor: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
    },
    knowsAbout: [
      'IT-Infrastruktur',
      'Cybersecurity',
      'Künstliche Intelligenz',
      'NIS-2',
      'BSI IT-Grundschutz',
      'Cloud-Migration',
    ],
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'certification',
      name: 'IT-Grundschutz-Praktiker',
      recognizedBy: {
        '@type': 'Organization',
        name: 'Bundesamt für Sicherheit in der Informationstechnik (BSI)',
      },
    },
    url: `${baseUrl}/ueber-uns`,
  }

  // 3) WebSite — fuer Sitelinks-Search-Box (Google)
  const website: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    url: baseUrl,
    name: 'xKMU',
    publisher: { '@id': `${baseUrl}/#organization` },
    inLanguage: 'de-DE',
  }

  return [localBusiness, founder, website]
}
