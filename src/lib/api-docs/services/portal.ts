import type { ApiService } from '../types'

export const portalService: ApiService = {
  name: 'Kunden-Portal',
  slug: 'portal',
  description:
    'Self-Service-Endpunkte fuer Portal-User (Kunden). Umfasst Firmen-Profil und Aenderungsantraege, Vertraege, Projekte, Auftraege (Orders), Chat mit dem Admin-Team, Dokumenten-Austausch, Kurs-Zertifikate sowie Online-Terminbuchung. Alle Endpunkte unterhalb von /api/v1/portal/me/* werden ueber withPortalAuth abgesichert und sind strikt auf die companyId des eingeloggten Portal-Users eingeschraenkt. Admin-seitige Review-Endpunkte (change-requests, certificate-requests) erfordern Permission users.update.',
  basePath: '/api/v1/portal',
  auth: 'session',
  endpoints: [
    // ---------- Eigene Firma ----------
    {
      method: 'GET',
      path: '/api/v1/portal/me/company',
      summary: 'Eigene Firma laden',
      description:
        'Liefert das Firmen-Profil des eingeloggten Portal-Users (Portal-Safe-Projection ohne interne Felder). Erfordert eine aktive Portal-Session.',
      response: {
        success: true,
        data: {
          id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'Weber Consulting GmbH',
          legalForm: 'GmbH',
          street: 'Musterstrasse',
          houseNumber: '12a',
          postalCode: '10115',
          city: 'Berlin',
          country: 'DE',
          phone: '+49 30 1234567',
          email: 'kontakt@weber-consulting.de',
          website: 'https://weber-consulting.de',
          industry: 'Unternehmensberatung',
          vatId: 'DE123456789',
        },
      },
      curl: `curl https://example.com/api/v1/portal/me/company \\
  -b cookies.txt`,
    },

    // ---------- Aenderungsantraege (Portal-Seite) ----------
    {
      method: 'POST',
      path: '/api/v1/portal/me/company/change-request',
      summary: 'Aenderungsantrag fuer Firmendaten stellen',
      description:
        'Erstellt einen neuen Aenderungsantrag (proposedChanges) auf die eigene Firma. Loest Audit-Log, Activity-Eintrag, Workflow-Trigger portal.change_request_created und Admin-Benachrichtigungsmail aus. Pro Firma darf nur ein offener Antrag existieren (sonst 409 PENDING_EXISTS).',
      requestBody: {
        proposedChanges: {
          street: 'Neue Strasse',
          houseNumber: '7',
          postalCode: '10117',
          city: 'Berlin',
          phone: '+49 30 7654321',
        },
      },
      response: {
        success: true,
        data: {
          id: 'cr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          status: 'pending',
          requestedAt: '2026-05-12T08:30:00.000Z',
          proposedChanges: {
            street: 'Neue Strasse',
            houseNumber: '7',
            postalCode: '10117',
            city: 'Berlin',
            phone: '+49 30 7654321',
          },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/portal/me/company/change-request \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"proposedChanges":{"street":"Neue Strasse","houseNumber":"7","postalCode":"10117","city":"Berlin","phone":"+49 30 7654321"}}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/portal/me/company/change-request/{id}',
      summary: 'Eigenen Aenderungsantrag stornieren',
      description:
        'Storniert einen noch offenen (pending) Aenderungsantrag des eigenen Users. Schreibt Audit-Log portal.company_change_request_cancelled.',
      response: {
        success: true,
        data: { cancelled: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/portal/me/company/change-request/cr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/portal/me/company/change-requests',
      summary: 'Eigene Aenderungsantraege listen',
      description:
        'Listet die letzten 50 Aenderungsantraege, die der eingeloggte Portal-User fuer seine Firma gestellt hat.',
      response: {
        success: true,
        data: [
          {
            id: 'cr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            status: 'pending',
            requestedAt: '2026-05-12T08:30:00.000Z',
            reviewedAt: null,
            reviewComment: null,
          },
        ],
      },
      curl: `curl https://example.com/api/v1/portal/me/company/change-requests \\
  -b cookies.txt`,
    },

    // ---------- Aenderungsantraege (Admin-Seite) ----------
    {
      method: 'GET',
      path: '/api/v1/portal/change-requests',
      summary: 'Alle Aenderungsantraege auflisten (Admin)',
      description:
        'Listet bis zu 200 Aenderungsantraege fuer das Admin-Review. Optionaler Query-Parameter status (pending | approved | rejected). Erfordert Permission users.update.',
      response: {
        success: true,
        data: [
          {
            id: 'cr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            companyId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            requestedBy: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            status: 'pending',
            requestedAt: '2026-05-12T08:30:00.000Z',
          },
        ],
      },
      curl: `curl "https://example.com/api/v1/portal/change-requests?status=pending" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/portal/change-requests/{id}/approve',
      summary: 'Aenderungsantrag genehmigen (Admin)',
      description:
        'Genehmigt einen offenen Aenderungsantrag und uebertraegt proposedChanges auf die Firma. Schreibt Audit-Log admin.company_change_request.approved und versendet Entscheidungs-Mail an den Antragsteller. 409 NOT_PENDING falls Antrag nicht mehr offen.',
      response: {
        success: true,
        data: {
          id: 'cr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          status: 'approved',
          reviewedAt: '2026-05-12T09:15:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/portal/change-requests/cr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/approve \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/portal/change-requests/{id}/reject',
      summary: 'Aenderungsantrag ablehnen (Admin)',
      description:
        'Lehnt einen offenen Aenderungsantrag mit Pflicht-Kommentar (1-1000 Zeichen) ab. Schreibt Audit-Log admin.company_change_request.rejected und versendet Entscheidungs-Mail an den Antragsteller.',
      requestBody: {
        reviewComment: 'Adresse stimmt nicht mit dem Handelsregister überein. Bitte aktuelle Anschrift mit HR-Auszug nachreichen.',
      },
      response: {
        success: true,
        data: {
          id: 'cr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          status: 'rejected',
          reviewComment: 'Adresse stimmt nicht mit dem Handelsregister überein. Bitte aktuelle Anschrift mit HR-Auszug nachreichen.',
          reviewedAt: '2026-05-12T09:20:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/portal/change-requests/cr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/reject \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"reviewComment":"Adresse stimmt nicht mit dem Handelsregister überein."}'`,
    },

    // ---------- Vertraege ----------
    {
      method: 'GET',
      path: '/api/v1/portal/me/contracts',
      summary: 'Eigene Vertraege auflisten',
      description:
        'Listet alle Vertraege (documents.type=contract) der eigenen Firma, sortiert nach Vertragsbeginn (NULLs zuletzt) und Erstelldatum absteigend.',
      response: {
        success: true,
        data: [
          {
            id: 'd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            number: 'V-2026-0042',
            status: 'active',
            contractStartDate: '2026-04-01',
            contractEndDate: '2027-03-31',
            contractRenewalType: 'auto',
            contractRenewalPeriod: 12,
            contractNoticePeriodDays: 90,
            subtotal: '12000.00',
            taxTotal: '2280.00',
            total: '14280.00',
            createdAt: '2026-03-20T10:00:00.000Z',
          },
        ],
      },
      curl: `curl https://example.com/api/v1/portal/me/contracts \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/portal/me/contracts/{id}',
      summary: 'Vertragsdetail laden',
      description:
        'Liefert einen einzelnen Vertrag inkl. sanitiziertem contractBodyHtml und Positionen (documentItems). Cross-Tenant-Schutz: Vertrag muss zur companyId des Portal-Users gehoeren.',
      response: {
        success: true,
        data: {
          id: 'd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          number: 'V-2026-0042',
          status: 'active',
          contractStartDate: '2026-04-01',
          contractEndDate: '2027-03-31',
          contractRenewalType: 'auto',
          contractRenewalPeriod: 12,
          contractNoticePeriodDays: 90,
          subtotal: '12000.00',
          taxTotal: '2280.00',
          total: '14280.00',
          notes: 'SLA: 4h Reaktionszeit werktags 08-18 Uhr.',
          paymentTerms: 'Zahlbar innerhalb 14 Tagen netto.',
          contractBodyHtml: '<p>Vertragstext...</p>',
          createdAt: '2026-03-20T10:00:00.000Z',
          items: [
            {
              id: 'di1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
              position: 1,
              name: 'KI-Beratung Paket A2',
              description: 'Monatliche Beratung, 8 Stunden',
              quantity: '12.00',
              unit: 'Monate',
              unitPrice: '1000.00',
              vatRate: '19.00',
              lineTotal: '12000.00',
            },
          ],
        },
      },
      curl: `curl https://example.com/api/v1/portal/me/contracts/d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },

    // ---------- Projekte ----------
    {
      method: 'GET',
      path: '/api/v1/portal/me/projects',
      summary: 'Eigene Projekte auflisten',
      description:
        'Listet alle nicht-archivierten Projekte der eigenen Firma inkl. taskCount. Sortiert nach Erstelldatum absteigend.',
      response: {
        success: true,
        data: [
          {
            id: 'p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'Website-Relaunch 2026',
            description: 'Neuer Webauftritt inkl. Blog und Kundenportal',
            status: 'active',
            priority: 'high',
            projectType: 'customer',
            startDate: '2026-04-15',
            endDate: '2026-07-31',
            tags: ['web', 'design'],
            color: '#3b82f6',
            createdAt: '2026-04-10T08:00:00.000Z',
            taskCount: 14,
          },
        ],
      },
      curl: `curl https://example.com/api/v1/portal/me/projects \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/portal/me/projects/{id}',
      summary: 'Projektdetail mit Tasks laden',
      description:
        'Liefert ein Projekt inkl. columns und Tasks (sortiert nach columnId und position). Status der Tasks wird abgeleitet (completedAt=null -> open, sonst done). Nur nicht-archivierte Projekte der eigenen Firma.',
      response: {
        success: true,
        data: {
          id: 'p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'Website-Relaunch 2026',
          status: 'active',
          priority: 'high',
          projectType: 'customer',
          startDate: '2026-04-15',
          endDate: '2026-07-31',
          tags: ['web', 'design'],
          color: '#3b82f6',
          columns: [
            { id: 'todo', name: 'To Do' },
            { id: 'inprogress', name: 'In Arbeit' },
            { id: 'done', name: 'Fertig' },
          ],
          createdAt: '2026-04-10T08:00:00.000Z',
          tasks: [
            {
              id: 't1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
              title: 'Wireframes finalisieren',
              description: 'Alle Hauptseiten-Wireframes durchgehen',
              columnId: 'inprogress',
              position: 1,
              priority: 'high',
              startDate: '2026-04-20',
              dueDate: '2026-05-15',
              completedAt: null,
              labels: ['design'],
              status: 'open',
            },
          ],
        },
      },
      curl: `curl https://example.com/api/v1/portal/me/projects/p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },

    // ---------- Auftraege (Orders) ----------
    {
      method: 'POST',
      path: '/api/v1/portal/me/orders',
      summary: 'Auftrag erstellen',
      description:
        'Erstellt einen neuen Auftrag aus dem Portal. Cross-Tenant-Validierung fuer contractId/projectId/categoryId (alle muessen zur eigenen Firma bzw. aktiv sein). Schreibt Audit-Log portal.order_created und stellt Admin-Benachrichtigungsmail in die Queue. Status-Code 201.',
      requestBody: {
        categoryId: 'oc1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        title: 'Login-Fehler im Kunden-Login',
        description: 'Seit gestern können sich zwei unserer Mitarbeiter nicht mehr einloggen. Fehlermeldung: invalid_credentials, Passwort ist aber korrekt.',
        priority: 'hoch',
        projectId: 'p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
      },
      response: {
        success: true,
        data: {
          id: 'o1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          status: 'new',
          title: 'Login-Fehler im Kunden-Login',
          priority: 'hoch',
          createdAt: '2026-05-12T08:45:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/portal/me/orders \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"categoryId":"oc1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6","title":"Login-Fehler im Kunden-Login","description":"Seit gestern können sich zwei unserer Mitarbeiter nicht mehr einloggen.","priority":"hoch"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/portal/me/orders',
      summary: 'Eigene Auftraege listen',
      description:
        'Listet bis zu 100 Auftraege der eigenen Firma (mit Kategorie-Join), sortiert nach Erstelldatum absteigend.',
      response: {
        success: true,
        data: [
          {
            id: 'o1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            title: 'Login-Fehler im Kunden-Login',
            status: 'new',
            priority: 'hoch',
            categoryId: 'oc1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            categoryName: 'Support / Fehlermeldung',
            categoryColor: '#ef4444',
            createdAt: '2026-05-12T08:45:00.000Z',
            acceptedAt: null,
            completedAt: null,
            rejectedAt: null,
            cancelledAt: null,
          },
        ],
      },
      curl: `curl https://example.com/api/v1/portal/me/orders \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/portal/me/orders/{id}',
      summary: 'Auftrag im Detail laden',
      description:
        'Liefert einen Auftrag der eigenen Firma inkl. Kategorie-, Vertrags- und Projekt-Joins.',
      response: {
        success: true,
        data: {
          id: 'o1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          title: 'Login-Fehler im Kunden-Login',
          description: 'Seit gestern können sich zwei unserer Mitarbeiter nicht mehr einloggen.',
          status: 'accepted',
          priority: 'hoch',
          rejectReason: null,
          categoryId: 'oc1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          categoryName: 'Support / Fehlermeldung',
          categoryColor: '#ef4444',
          contractId: null,
          contractNumber: null,
          projectId: 'p1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          projectName: 'Website-Relaunch 2026',
          createdAt: '2026-05-12T08:45:00.000Z',
          acceptedAt: '2026-05-12T09:10:00.000Z',
          startedAt: null,
          completedAt: null,
          rejectedAt: null,
          cancelledAt: null,
        },
      },
      curl: `curl https://example.com/api/v1/portal/me/orders/o1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/portal/me/orders/{id}',
      summary: 'Auftrag stornieren',
      description:
        'Storniert einen eigenen Auftrag (nur in stornierbaren Stati). Schreibt Audit-Log portal.order_cancelled. 404 falls Auftrag nicht existiert oder nicht stornierbar.',
      response: {
        success: true,
        data: { cancelled: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/portal/me/orders/o1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/portal/order-categories',
      summary: 'Auftrags-Kategorien listen',
      description:
        'Liefert alle aktiven Auftrags-Kategorien (Portal-Safe-Projection: id, name, slug, color) zur Auswahl im Auftrags-Formular.',
      response: {
        success: true,
        data: [
          {
            id: 'oc1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'Support / Fehlermeldung',
            slug: 'support-fehler',
            color: '#ef4444',
          },
          {
            id: 'oc2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'Aenderungswunsch',
            slug: 'change-request',
            color: '#3b82f6',
          },
        ],
      },
      curl: `curl https://example.com/api/v1/portal/order-categories \\
  -b cookies.txt`,
    },

    // ---------- Chat ----------
    {
      method: 'GET',
      path: '/api/v1/portal/me/chat/messages',
      summary: 'Chat-Nachrichten laden',
      description:
        'Liefert bis zu 100 Chat-Nachrichten der eigenen Firma. Optionaler Query-Parameter since (ISO-Datum) fuer Incremental-Polling. Ungueltige since-Werte werden ignoriert.',
      response: {
        success: true,
        data: [
          {
            id: 'cm1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            companyId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            senderId: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            senderRole: 'portal_user',
            bodyText: 'Hallo, wann genau startet das Projekt?',
            createdAt: '2026-05-12T07:30:00.000Z',
            readByAdminAt: null,
          },
        ],
      },
      curl: `curl "https://example.com/api/v1/portal/me/chat/messages?since=2026-05-12T00:00:00Z" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/portal/me/chat/messages',
      summary: 'Chat-Nachricht senden',
      description:
        'Sendet eine neue Chat-Nachricht (1-5000 Zeichen) ans Admin-Team. Rate-Limit: 30/min pro IP. Schreibt Audit-Log portal.chat_message_sent (ohne bodyText im Payload). Status 201.',
      requestBody: {
        bodyText: 'Hallo, wann genau startet das Projekt?',
      },
      response: {
        success: true,
        data: {
          id: 'cm1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          companyId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          senderId: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          senderRole: 'portal_user',
          bodyText: 'Hallo, wann genau startet das Projekt?',
          createdAt: '2026-05-12T07:30:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/portal/me/chat/messages \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"bodyText":"Hallo, wann genau startet das Projekt?"}'`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/portal/me/chat/mark-read',
      summary: 'Chat als gelesen markieren',
      description:
        'Markiert alle Admin-Nachrichten der eigenen Firma als vom Portal-User gelesen. Liefert Anzahl der aktualisierten Nachrichten.',
      response: {
        success: true,
        data: { marked: 3 },
      },
      curl: `curl -X PATCH https://example.com/api/v1/portal/me/chat/mark-read \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/portal/me/chat/unread-count',
      summary: 'Ungelesene Chat-Nachrichten zaehlen',
      description:
        'Liefert die Anzahl ungelesener Admin-Nachrichten an den Portal-User der eigenen Firma. Wird typischerweise zur Badge-Anzeige gepollt.',
      response: {
        success: true,
        data: { unread: 2 },
      },
      curl: `curl https://example.com/api/v1/portal/me/chat/unread-count \\
  -b cookies.txt`,
    },

    // ---------- Dokumente ----------
    {
      method: 'GET',
      path: '/api/v1/portal/document-categories',
      summary: 'Portal-Dokumenten-Kategorien (Upload-Richtung) listen',
      description:
        'Liefert die fuer den Portal-Upload nutzbaren Kategorien (direction=portal_to_admin). Optional kann direction-Query gesetzt werden, ein anderer Wert als portal_to_admin liefert 403.',
      response: {
        success: true,
        data: [
          {
            id: 'pdc1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'Vertragsunterlagen',
            direction: 'portal_to_admin',
            sortOrder: 1,
          },
        ],
      },
      curl: `curl "https://example.com/api/v1/portal/document-categories?direction=portal_to_admin" \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/portal/me/documents',
      summary: 'Eigene Portal-Dokumente listen',
      description:
        'Listet Dokumente der eigenen Firma (ohne soft-geloeschte). Optionale Filter: direction (admin_to_portal | portal_to_admin), linkedType (contract | project | order), linkedId.',
      response: {
        success: true,
        data: [
          {
            id: 'pd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            fileName: 'angebot-2026-04.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 245760,
            direction: 'admin_to_portal',
            categoryId: 'pdc1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            linkedType: 'contract',
            linkedId: 'd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            uploadedByUserId: 'u2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            uploaderRole: 'admin',
            note: 'Aktuelles Angebot zur Pruefung',
            createdAt: '2026-05-10T14:30:00.000Z',
          },
        ],
      },
      curl: `curl "https://example.com/api/v1/portal/me/documents?direction=admin_to_portal" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/portal/me/documents',
      summary: 'Portal-Dokument hochladen (Multipart)',
      description:
        'Upload eines Dokuments vom Portal-User Richtung Admin (direction=portal_to_admin fixiert). Multipart-Form mit file (Pflicht), categoryId (Pflicht), note, linkedType (contract|project|order), linkedId. Rate-Limit: 20/h. Schreibt Audit-Log portal_document.uploaded und stellt Benachrichtigungs-Mails an alle internen User in die Queue. 413 bei zu grosser Datei, 415 bei unzulaessigem MIME-Type.',
      requestBody: {
        file: '(binary: vertrag-signiert.pdf)',
        categoryId: 'pdc1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        note: 'Unterschriebener Vertrag — Original folgt per Post',
        linkedType: 'contract',
        linkedId: 'd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
      },
      response: {
        success: true,
        data: {
          id: 'pd2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          fileName: 'vertrag-signiert.pdf',
          sizeBytes: 512000,
          direction: 'portal_to_admin',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/portal/me/documents \\
  -b cookies.txt \\
  -F "file=@vertrag-signiert.pdf" \\
  -F "categoryId=pdc1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6" \\
  -F "note=Unterschriebener Vertrag" \\
  -F "linkedType=contract" \\
  -F "linkedId=d1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6"`,
    },
    {
      method: 'GET',
      path: '/api/v1/portal/me/documents/{id}/download',
      summary: 'Portal-Dokument herunterladen',
      description:
        'Liefert die Datei als Binary-Stream (Content-Disposition: attachment, Cache-Control: private, no-store). Cross-Tenant-Schutz: Dokument muss zur eigenen companyId gehoeren und darf nicht soft-deleted sein.',
      response: {
        success: true,
        data: '(binary file content; Content-Type entspricht dem mimeType des Dokuments)',
      },
      curl: `curl https://example.com/api/v1/portal/me/documents/pd1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/download \\
  -b cookies.txt \\
  -o angebot-2026-04.pdf`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/portal/me/documents/{id}',
      summary: 'Eigenes Portal-Dokument loeschen (Soft-Delete)',
      description:
        'Soft-Delete eines selbst hochgeladenen Dokuments. Rate-Limit: 30/h. Schreibt Audit-Log portal_document.deleted. 403 falls der Portal-User nicht zur Loeschung berechtigt ist (z.B. fremder Uploader).',
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/portal/me/documents/pd2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },

    // ---------- Zertifikate (Portal-Seite) ----------
    {
      method: 'GET',
      path: '/api/v1/portal/courses/{id}/certificate',
      summary: 'Zertifikatsstatus fuer Kurs abrufen',
      description:
        'Liefert den aktuellen Zertifikatsstatus (requested | issued | rejected | revoked oder null) des eingeloggten Users fuer den angegebenen Kurs. Erfordert Permission courses.read.',
      response: {
        success: true,
        data: {
          id: 'cert1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          courseId: 'co1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          userId: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          status: 'issued',
          issuedAt: '2026-05-08T10:00:00.000Z',
        },
      },
      curl: `curl https://example.com/api/v1/portal/courses/co1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/certificate \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/portal/courses/{id}/certificate/request',
      summary: 'Zertifikat fuer abgeschlossenen Kurs beantragen',
      description:
        'Beantragt ein Zertifikat fuer den angegebenen Kurs. Erfordert Permission courses.update und 100% Kursfortschritt — sonst 422 NOT_COMPLETE.',
      response: {
        success: true,
        data: {
          id: 'cert1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          courseId: 'co1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          userId: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          status: 'requested',
          requestedAt: '2026-05-12T08:00:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/portal/courses/co1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/certificate/request \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/portal/courses/{id}/certificate/pdf',
      summary: 'Zertifikats-PDF herunterladen',
      description:
        'Liefert das gerenderte Zertifikats-PDF (Content-Type: application/pdf, Content-Disposition: attachment). Erfordert Permission courses.read; 404 falls noch kein ausgestelltes Zertifikat existiert.',
      response: {
        success: true,
        data: '(binary PDF content; Dateiname: zertifikat-<courseId>.pdf)',
      },
      curl: `curl https://example.com/api/v1/portal/courses/co1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/certificate/pdf \\
  -b cookies.txt \\
  -o zertifikat.pdf`,
    },
    {
      method: 'GET',
      path: '/api/v1/portal/courses/assignments',
      summary: 'Eigene Kurs-Zuweisungen listen',
      description:
        'Liefert alle dem eingeloggten User zugewiesenen Kurse (inkl. Fortschritt). Erfordert eine aktive Session.',
      response: {
        success: true,
        data: [
          {
            assignmentId: 'ca1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            courseId: 'co1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            courseTitle: 'Datenschutz-Grundlagen 2026',
            assignedAt: '2026-04-01T08:00:00.000Z',
            dueAt: '2026-06-30T23:59:59.000Z',
            progressPercent: 100,
            completedAt: '2026-05-08T09:30:00.000Z',
          },
        ],
      },
      curl: `curl https://example.com/api/v1/portal/courses/assignments \\
  -b cookies.txt`,
    },

    // ---------- Zertifikats-Reviews (Admin-Seite) ----------
    {
      method: 'GET',
      path: '/api/v1/portal/certificate-requests',
      summary: 'Zertifikats-Antraege listen (Admin)',
      description:
        'Listet Zertifikats-Eintraege gefiltert nach status (Default: requested). Erlaubte Werte: requested | issued | rejected | revoked. Unbekannte Werte liefern eine leere Liste. Erfordert Permission users.update.',
      response: {
        success: true,
        data: [
          {
            id: 'cert1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            userId: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            courseId: 'co1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            status: 'requested',
            requestedAt: '2026-05-12T08:00:00.000Z',
          },
        ],
      },
      curl: `curl "https://example.com/api/v1/portal/certificate-requests?status=requested" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/portal/certificate-requests/{id}/approve',
      summary: 'Zertifikat ausstellen (Admin)',
      description:
        'Genehmigt einen Zertifikats-Antrag und setzt status=issued. Optionaler reviewComment. Erfordert Permission users.update. 409 BAD_STATE wenn nicht im erwarteten Status, 404 wenn nicht gefunden.',
      requestBody: {
        reviewComment: 'Alle Kursmodule erfolgreich absolviert. Zertifikat ausgestellt.',
      },
      response: {
        success: true,
        data: {
          id: 'cert1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          status: 'issued',
          issuedAt: '2026-05-12T09:00:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/portal/certificate-requests/cert1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/approve \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"reviewComment":"Alle Kursmodule erfolgreich absolviert."}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/portal/certificate-requests/{id}/reject',
      summary: 'Zertifikats-Antrag ablehnen (Admin)',
      description:
        'Lehnt einen offenen Zertifikats-Antrag mit reviewComment ab. Erfordert Permission users.update.',
      requestBody: {
        reviewComment: 'Modul 3 wurde nicht vollständig durchgearbeitet — bitte erneut bearbeiten.',
      },
      response: {
        success: true,
        data: {
          id: 'cert1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          status: 'rejected',
          reviewComment: 'Modul 3 wurde nicht vollständig durchgearbeitet — bitte erneut bearbeiten.',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/portal/certificate-requests/cert1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/reject \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"reviewComment":"Modul 3 wurde nicht vollständig durchgearbeitet."}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/portal/certificate-requests/{id}/revoke',
      summary: 'Ausgestelltes Zertifikat widerrufen (Admin)',
      description:
        'Widerruft ein bereits ausgestelltes Zertifikat (status -> revoked). Optionaler reviewComment dokumentiert den Grund. Erfordert Permission users.update.',
      requestBody: {
        reviewComment: 'Nachträglich festgestellte Unregelmäßigkeit bei der Modulpruefung.',
      },
      response: {
        success: true,
        data: {
          id: 'cert1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          status: 'revoked',
          revokedAt: '2026-05-12T10:00:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/portal/certificate-requests/cert1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/revoke \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"reviewComment":"Nachträglich festgestellte Unregelmäßigkeit."}'`,
    },

    // ---------- Termin-Buchung (legacy /api/portal/termin) ----------
    {
      method: 'GET',
      path: '/api/portal/termin/staff',
      summary: 'Buchbare Mitarbeiter und Slot-Typen listen',
      description:
        'Liefert alle Mitarbeiter mit bookingPageActive=true samt ihrer aktiven slotTypes (Termin-Typen mit Dauer, Ort, Vorlaufzeit). Antwort: { staff: [...] } (kein api-response Envelope).',
      response: {
        staff: [
          {
            id: 'u3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            firstName: 'Max',
            lastName: 'Mustermann',
            bookingSlug: 'max-mustermann',
            bookingPageTitle: 'Termin mit Max',
            bookingPageSubtitle: 'Erstgespraech oder Beratung',
            timezone: 'Europe/Berlin',
            slotTypes: [
              {
                id: 'st1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
                userId: 'u3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
                name: 'Erstgespraech',
                durationMinutes: 30,
                location: 'video',
                locationDetails: 'Google Meet — Link folgt nach Buchung',
                description: 'Kurzes Kennenlern-Gespraech',
                color: '#10b981',
                minNoticeHours: 4,
                maxAdvanceDays: 60,
              },
            ],
          },
        ],
      },
      curl: `curl https://example.com/api/portal/termin/staff \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/portal/termin/availability',
      summary: 'Freie Slots fuer Tag berechnen',
      description:
        'Berechnet die freien Slots fuer userId + slotTypeId an einem bestimmten Datum (YYYY-MM-DD im timezone des Mitarbeiters). Beruecksichtigt availabilityRules, availabilityOverrides, bestehende Termine sowie externalBusy aus angeschlossenen Kalender-Konten. Antwort: { slots: ISOString[] }.',
      response: {
        slots: [
          '2026-05-20T08:00:00.000Z',
          '2026-05-20T08:30:00.000Z',
          '2026-05-20T09:00:00.000Z',
          '2026-05-20T14:00:00.000Z',
        ],
      },
      curl: `curl "https://example.com/api/portal/termin/availability?userId=u3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6&slotTypeId=st1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6&date=2026-05-20" \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/portal/termin/my',
      summary: 'Eigene Termine auflisten',
      description:
        'Listet die Termine der mit dem Portal-User verknuepften Person (persons.portalUserId), sortiert nach startAt absteigend. Erfordert eine aktive Session.',
      response: {
        appointments: [
          {
            id: 'apt1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            startAt: '2026-05-20T08:00:00.000Z',
            endAt: '2026-05-20T08:30:00.000Z',
            status: 'confirmed',
            customerMessage: 'Bitte vorab Unterlagen senden',
            cancelledAt: null,
            cancellationReason: null,
            slotTypeName: 'Erstgespraech',
            slotTypeColor: '#10b981',
            location: 'video',
            locationDetails: 'Google Meet',
            durationMinutes: 30,
            minNoticeHours: 4,
            maxAdvanceDays: 60,
            staffFirstName: 'Max',
            staffLastName: 'Mustermann',
            staffTimezone: 'Europe/Berlin',
            userId: 'u3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            slotTypeId: 'st1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          },
        ],
      },
      curl: `curl https://example.com/api/portal/termin/my \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/portal/termin/book',
      summary: 'Termin buchen',
      description:
        'Bucht einen Termin fuer den Portal-User. Voraussetzung: session.user.role === portal_user. Pruefen die Slot-Verfuegbarkeit und liefert 409 slot_unavailable bei Konflikt. 412 falls Person nicht verknuepft (person_not_linked) oder Person ohne E-Mail (person_missing_email). Schreibt Audit-Log appointment.create.',
      requestBody: {
        userId: 'u3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        slotTypeId: 'st1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        startAtUtc: '2026-05-20T08:00:00.000Z',
        message: 'Bitte vorab Agenda zusenden.',
      },
      response: {
        success: true,
        id: 'apt1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        startAt: '2026-05-20T08:00:00.000Z',
        endAt: '2026-05-20T08:30:00.000Z',
        status: 'confirmed',
      },
      curl: `curl -X POST https://example.com/api/portal/termin/book \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"userId":"u3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6","slotTypeId":"st1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6","startAtUtc":"2026-05-20T08:00:00.000Z","message":"Bitte vorab Agenda zusenden."}'`,
    },
    {
      method: 'POST',
      path: '/api/portal/termin/{id}/reschedule',
      summary: 'Eigenen Termin verschieben',
      description:
        'Verschiebt einen eigenen Termin auf einen neuen startAtUtc. 403 forbidden falls Termin nicht dem Portal-User gehoert, 404 not_found, 410 appointment_cancelled (bereits storniert), 409 slot_unavailable bei Konflikt. Schreibt Audit-Log appointment.reschedule.',
      requestBody: {
        startAtUtc: '2026-05-21T09:30:00.000Z',
      },
      response: {
        success: true,
        startAt: '2026-05-21T09:30:00.000Z',
        endAt: '2026-05-21T10:00:00.000Z',
      },
      curl: `curl -X POST https://example.com/api/portal/termin/apt1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/reschedule \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"startAtUtc":"2026-05-21T09:30:00.000Z"}'`,
    },
    {
      method: 'POST',
      path: '/api/portal/termin/{id}/cancel',
      summary: 'Eigenen Termin stornieren',
      description:
        'Storniert einen eigenen Termin mit optionalem reason (bis 500 Zeichen). Bei bereits stornierten Terminen wird kein erneuter Audit-Log-Eintrag geschrieben (Antwort: alreadyCancelled=true). 403/404 fuer fremde/unbekannte Termine.',
      requestBody: {
        reason: 'Terminkonflikt — Bitte um neuen Vorschlag in der Folgewoche.',
      },
      response: {
        success: true,
        alreadyCancelled: false,
      },
      curl: `curl -X POST https://example.com/api/portal/termin/apt1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/cancel \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"reason":"Terminkonflikt"}'`,
    },
  ],
}
