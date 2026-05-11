import type { ApiService } from '../types'

export const integrationsService: ApiService = {
  name: 'Integrationen',
  slug: 'integrations',
  description:
    'Konfiguration externer Integrationen. Aktuell: Google-Calendar-OAuth-Credentials fuer den Terminbuchungs-Flow. Endpunkte erfordern eine aktive Session, appointments-Berechtigung sowie owner- oder admin-Rolle.',
  basePath: '/api/v1/integrations',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/integrations/google-calendar',
      summary: 'Google-Calendar-Konfiguration abrufen',
      description:
        'Liefert die aktuelle Google-Calendar-OAuth-Konfiguration. Das Client-Secret wird maskiert (nur letzte 4 Zeichen sichtbar). Zusaetzlich wird isConfigured zurueckgegeben. Erfordert appointments.update sowie owner-/admin-Rolle.',
      response: {
        clientId: '1234567890-abcdefgh.apps.googleusercontent.com',
        clientSecretMasked: '••••••••aB12',
        redirectUri: 'https://example.com/api/appointments/oauth/callback',
        appPublicUrl: 'https://example.com',
        isConfigured: true,
      },
      curl: `curl https://example.com/api/v1/integrations/google-calendar \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/integrations/google-calendar',
      summary: 'Google-Calendar-Konfiguration aktualisieren',
      description:
        'Aktualisiert clientId, clientSecret, redirectUri und appPublicUrl. Werte koennen null sein (loescht die Einstellung). Beginnt clientSecret mit dem Masking-Praefix, wird der bestehende Wert beibehalten. Erfordert appointments.update sowie owner-/admin-Rolle.',
      requestBody: {
        clientId: '1234567890-abcdefgh.apps.googleusercontent.com',
        clientSecret: 'GOCSPX-mein-google-client-secret',
        redirectUri: 'https://example.com/api/appointments/oauth/callback',
        appPublicUrl: 'https://example.com',
      },
      response: {
        clientId: '1234567890-abcdefgh.apps.googleusercontent.com',
        clientSecretMasked: '••••••••cret',
        redirectUri: 'https://example.com/api/appointments/oauth/callback',
        appPublicUrl: 'https://example.com',
        isConfigured: true,
      },
      curl: `curl -X PUT https://example.com/api/v1/integrations/google-calendar \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"clientId":"1234567890-abcdefgh.apps.googleusercontent.com","clientSecret":"GOCSPX-mein-google-client-secret","redirectUri":"https://example.com/api/appointments/oauth/callback","appPublicUrl":"https://example.com"}'`,
    },
  ],
}
