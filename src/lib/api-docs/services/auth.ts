import type { ApiService } from '../types'

export const authService: ApiService = {
  name: 'Authentifizierung',
  slug: 'auth',
  description:
    'Benutzer-Authentifizierung und Session-Verwaltung. Login und Registrierung sind oeffentlich zugaenglich, alle anderen Endpunkte erfordern eine aktive Session.',
  basePath: '/api/v1/auth',
  auth: 'public',
  endpoints: [
    {
      method: 'POST',
      path: '/api/v1/auth/login',
      summary: 'Benutzer anmelden',
      description:
        'Authentifiziert einen Benutzer mit E-Mail und Passwort. Setzt ein httpOnly Session-Cookie. Rate-Limit: max 10 Versuche pro Minute pro IP.',
      requestBody: {
        email: 'max@mustermann-gmbh.de',
        password: 'sicheresPasswort123!',
      },
      response: {
        success: true,
        data: {
          user: {
            id: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
            email: 'max@mustermann-gmbh.de',
            firstName: 'Max',
            lastName: 'Mustermann',
            role: 'admin',
            roleId: 'r1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -c cookies.txt \\
  -d '{"email":"max@mustermann-gmbh.de","password":"sicheresPasswort123!"}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/auth/register',
      summary: 'Neues Konto registrieren',
      description:
        'Erstellt einen neuen Tenant (Mandant) mit zugehoeriger Firma, setzt Default-Rollen, seeded strukturelle Daten und erstellt den ersten Admin-Benutzer. Setzt automatisch ein Session-Cookie. Rate-Limit: max 5 Registrierungen pro Minute pro IP.',
      requestBody: {
        email: 'lisa@weber-consulting.de',
        password: 'meinPasswort456!',
        firstName: 'Lisa',
        lastName: 'Weber',
        companyName: 'Weber Consulting GmbH',
      },
      response: {
        success: true,
        data: {
          user: {
            id: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            email: 'lisa@weber-consulting.de',
            firstName: 'Lisa',
            lastName: 'Weber',
            role: 'admin',
            roleId: 'r1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          },
          tenant: {
            id: 't1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'Weber Consulting GmbH',
            slug: 'weber-consulting-gmbh',
          },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -c cookies.txt \\
  -d '{"email":"lisa@weber-consulting.de","password":"meinPasswort456!","firstName":"Lisa","lastName":"Weber","companyName":"Weber Consulting GmbH"}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/auth/logout',
      summary: 'Abmelden',
      description: 'Loescht die aktive Session und das Session-Cookie.',
      response: {
        success: true,
        data: { message: 'Logged out successfully' },
      },
      curl: `curl -X POST https://example.com/api/v1/auth/logout \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/auth/me',
      summary: 'Aktuellen Benutzer abrufen',
      description:
        'Gibt die Daten des aktuell eingeloggten Benutzers zurueck. Erfordert eine aktive Session.',
      response: {
        success: true,
        data: {
          user: {
            id: 'b3f1a2c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
            email: 'max@mustermann-gmbh.de',
            firstName: 'Max',
            lastName: 'Mustermann',
            role: 'admin',
            roleId: 'r1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          },
        },
      },
      curl: `curl https://example.com/api/v1/auth/me \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/auth/permissions',
      summary: 'Berechtigungen abrufen',
      description:
        'Gibt die CRUD-Berechtigungen des aktuellen Benutzers pro Modul zurueck. Owner und Admin erhalten immer vollen Zugriff. Andere Rollen laden Berechtigungen aus der Datenbank oder nutzen Legacy-Fallback-Defaults.',
      response: {
        success: true,
        data: {
          permissions: {
            companies: { create: true, read: true, update: true, delete: true },
            leads: { create: true, read: true, update: true, delete: true },
            documents: { create: true, read: true, update: true, delete: false },
          },
        },
      },
      curl: `curl https://example.com/api/v1/auth/permissions \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/auth/change-password',
      summary: 'Passwort aendern',
      description:
        'Aendert das Passwort des aktuell eingeloggten Benutzers. Das aktuelle Passwort muss zur Verifikation mitgesendet werden.',
      requestBody: {
        currentPassword: 'altesPasswort123!',
        newPassword: 'neuesSicheresPasswort456!',
      },
      response: {
        success: true,
        data: { message: 'Passwort erfolgreich geändert' },
      },
      curl: `curl -X POST https://example.com/api/v1/auth/change-password \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"currentPassword":"altesPasswort123!","newPassword":"neuesSicheresPasswort456!"}'`,
    },
  ],
}
