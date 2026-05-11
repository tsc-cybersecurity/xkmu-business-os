import type { ApiService } from '../types'

export const feedbackService: ApiService = {
  name: 'Feedback-Formulare',
  slug: 'feedback',
  description:
    'Verwaltung von Feedback-Formularen (FeedbackForms) und deren Antworten. Listen/Erstellen erfordert Auth (settings-Permission). Das Antwort-Submit ist als OEFFENTLICHER Endpoint ausgelegt — Authentifizierung erfolgt ueber einen Einmal-Token in der URL ({id} = Token), nicht ueber Session/Cookie.',
  basePath: '/api/v1/feedback',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/feedback',
      summary: 'Feedback-Formulare auflisten',
      description: 'Listet alle Feedback-Formulare. Permission: settings.read.',
      response: {
        success: true,
        data: [
          { id: 'f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', title: 'Kundenzufriedenheit Q2', status: 'active', responsesCount: 12 },
        ],
      },
      curl: `curl https://example.com/api/v1/feedback \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/feedback',
      summary: 'Feedback-Formular anlegen',
      description: 'Erstellt ein neues Feedback-Formular mit Fragen-Definition. Permission: settings.create.',
      requestBody: {
        title: 'Projektabschluss-Feedback',
        description: 'Bitte bewerten Sie unser Projekt',
        questions: [
          { type: 'rating', label: 'Wie zufrieden sind Sie?', max: 5 },
          { type: 'text', label: 'Was koennen wir verbessern?' },
        ],
      },
      response: {
        success: true,
        data: { id: 'f2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', title: 'Projektabschluss-Feedback' },
      },
      curl: `curl -X POST https://example.com/api/v1/feedback \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"title":"Projektabschluss-Feedback"}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/feedback/{id}/respond',
      summary: 'Feedback-Antwort einreichen (oeffentlich)',
      description:
        'OEFFENTLICH (kein Login noetig). Der Pfad-Parameter {id} ist ein Einmal-Token, der den Empfaenger eindeutig identifiziert. Liefert 404 bei unbekanntem/abgelaufenem Token. Permission: public.',
      params: [{ name: 'id', in: 'path', required: true, type: 'string', description: 'Einmal-Token aus der Einladungs-Mail' }],
      requestBody: {
        answers: [
          { questionIndex: 0, value: 5 },
          { questionIndex: 1, value: 'Sehr gute Kommunikation.' },
        ],
      },
      response: {
        success: true,
        data: {
          id: 'r1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
          formId: 'f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
          submittedAt: '2026-05-12T10:00:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/feedback/abc123-def456-token/respond \\
  -H "Content-Type: application/json" \\
  -d '{"answers":[{"questionIndex":0,"value":5}]}'`,
    },
  ],
}
