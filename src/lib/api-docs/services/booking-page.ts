import type { ApiService } from '../types'

export const bookingPageService: ApiService = {
  name: 'Buchungsseite',
  slug: 'booking-page',
  description:
    'Konfiguration der oeffentlichen Buchungsseite eines Mitarbeiters: URL-Slug (z.B. /buchen/max-mustermann) und Aktivierungs-Status. Der Slug muss systemweit eindeutig sein.',
  basePath: '/api/v1/booking-page',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/booking-page',
      summary: 'Buchungsseiten-Konfiguration abrufen',
      description:
        'Gibt den aktuellen Buchungs-Slug und den Aktivierungs-Status des eingeloggten Mitarbeiters zurueck. Liefert {slug:null, active:false} wenn noch nicht konfiguriert. Erfordert Permission appointments.read.',
      response: {
        success: true,
        data: {
          slug: 'max-mustermann',
          active: true,
        },
      },
      curl: `curl https://example.com/api/v1/booking-page \\
  -b cookies.txt`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/booking-page',
      summary: 'Buchungsseite konfigurieren',
      description:
        'Setzt Slug und Aktivierungs-Status der eigenen Buchungsseite. Slug-Format: ^[a-z0-9-]{3,60}$. Slug muss systemweit eindeutig sein (Konflikt -> 409 slug_already_taken). Bei active=true muss ein Slug gesetzt sein (sonst 400 slug_required_for_active). Erfordert Permission appointments.update.',
      requestBody: {
        slug: 'max-mustermann',
        active: true,
      },
      response: {
        success: true,
        data: {
          slug: 'max-mustermann',
          active: true,
        },
      },
      curl: `curl -X PATCH https://example.com/api/v1/booking-page \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"slug":"max-mustermann","active":true}'`,
    },
  ],
}
