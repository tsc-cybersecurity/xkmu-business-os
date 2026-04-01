import type { ApiService } from '../types'

export const productsService: ApiService = {
  name: 'Produkte & Kategorien',
  slug: 'products',
  description:
    'Produkt- und Dienstleistungsverwaltung mit hierarchischen Kategorien. Produkte koennen nach Typ, Status, Kategorie und Tags gefiltert werden. Kategorien unterstuetzen Baumstrukturen mit Eltern-Kind-Beziehungen.',
  basePath: '/api/v1/products',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/products',
      summary: 'Produkte auflisten',
      description:
        'Gibt eine paginierte Liste aller Produkte und Dienstleistungen zurueck. Unterstuetzt Filterung nach Typ, Status, Kategorie, Tags und Freitextsuche.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (Standard: 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Eintraege pro Seite (Standard: 25)', example: '25' },
        { name: 'type', in: 'query', required: false, type: 'string', description: 'Produkttyp (z.B. product, service)' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'Filtert nach Status (z.B. active, inactive)' },
        { name: 'categoryId', in: 'query', required: false, type: 'string', description: 'Filtert nach Kategorie (UUID)' },
        { name: 'tags', in: 'query', required: false, type: 'string', description: 'Komma-getrennte Tags', example: 'premium,bestseller' },
        { name: 'search', in: 'query', required: false, type: 'string', description: 'Freitextsuche ueber Name und Beschreibung' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'pr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'Cloud Migration Paket',
            type: 'service',
            status: 'active',
            price: '15000.00',
            unit: 'Pauschal',
            taxRate: '19.00',
          },
        ],
        meta: { page: 1, limit: 25, total: 34 },
      },
      curl: `curl "https://example.com/api/v1/products?type=service&status=active&search=Cloud" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/products',
      summary: 'Produkt erstellen',
      description: 'Erstellt ein neues Produkt oder eine neue Dienstleistung.',
      requestBody: {
        name: 'IT-Sicherheitsaudit',
        type: 'service',
        description: 'Umfassende Pruefung der IT-Sicherheitsinfrastruktur',
        price: 4500,
        unit: 'Pauschal',
        taxRate: 19,
        status: 'active',
        categoryId: 'cat1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        tags: ['security', 'audit'],
      },
      response: {
        success: true,
        data: {
          id: 'pr2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7',
          name: 'IT-Sicherheitsaudit',
          type: 'service',
          status: 'active',
          price: '4500.00',
          unit: 'Pauschal',
          taxRate: '19.00',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/products \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"IT-Sicherheitsaudit","type":"service","description":"Umfassende Pruefung der IT-Sicherheitsinfrastruktur","price":4500,"unit":"Pauschal","taxRate":19,"status":"active","categoryId":"cat1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6","tags":["security","audit"]}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/products/:id',
      summary: 'Produkt abrufen',
      description: 'Gibt die vollstaendigen Daten eines einzelnen Produkts zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Produkts' },
      ],
      response: {
        success: true,
        data: {
          id: 'pr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'Cloud Migration Paket',
          type: 'service',
          description: 'Vollstaendige Migration in die Cloud inkl. Planung, Durchfuehrung und Schulung',
          status: 'active',
          price: '15000.00',
          unit: 'Pauschal',
          taxRate: '19.00',
          categoryId: 'cat1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          tags: ['cloud', 'migration', 'premium'],
        },
      },
      curl: `curl https://example.com/api/v1/products/pr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/products/:id',
      summary: 'Produkt aktualisieren',
      description: 'Aktualisiert die Daten eines Produkts oder einer Dienstleistung.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Produkts' },
      ],
      requestBody: {
        price: 16500,
        description: 'Erweitert um KI-gestuetzte Migrationspruefung',
      },
      response: {
        success: true,
        data: {
          id: 'pr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'Cloud Migration Paket',
          price: '16500.00',
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/products/pr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"price":16500,"description":"Erweitert um KI-gestuetzte Migrationspruefung"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/products/:id',
      summary: 'Produkt loeschen',
      description: 'Loescht ein Produkt permanent.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID des Produkts' },
      ],
      response: {
        success: true,
        data: { message: 'Produkt erfolgreich gelöscht' },
      },
      curl: `curl -X DELETE https://example.com/api/v1/products/pr1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/product-categories',
      summary: 'Kategorien auflisten',
      description:
        'Gibt alle Produktkategorien zurueck. Mit dem Parameter tree=true wird eine hierarchische Baumstruktur zurueckgegeben.',
      params: [
        { name: 'tree', in: 'query', required: false, type: 'string', description: 'Wenn true, wird eine Baumstruktur zurueckgegeben', example: 'true' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'cat1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'IT-Dienstleistungen',
            parentId: null,
            children: [
              {
                id: 'cat2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7',
                name: 'Cloud Services',
                parentId: 'cat1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
              },
            ],
          },
        ],
      },
      curl: `curl "https://example.com/api/v1/product-categories?tree=true" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/product-categories',
      summary: 'Kategorie erstellen',
      description: 'Erstellt eine neue Produktkategorie. Kann als Unterkategorie erstellt werden indem parentId angegeben wird.',
      requestBody: {
        name: 'Managed Services',
        parentId: 'cat1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        description: 'Laufende IT-Betriebsdienstleistungen',
      },
      response: {
        success: true,
        data: {
          id: 'cat3c4d5e6-f7a8-b9c0-d1e2-f3a4b5c6d7e8',
          name: 'Managed Services',
          parentId: 'cat1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/product-categories \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Managed Services","parentId":"cat1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6","description":"Laufende IT-Betriebsdienstleistungen"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/product-categories/:id',
      summary: 'Kategorie abrufen',
      description: 'Gibt die Daten einer einzelnen Produktkategorie zurueck.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Kategorie' },
      ],
      response: {
        success: true,
        data: {
          id: 'cat1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'IT-Dienstleistungen',
          parentId: null,
          description: 'Alle IT-bezogenen Dienstleistungen',
        },
      },
      curl: `curl https://example.com/api/v1/product-categories/cat1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/product-categories/:id',
      summary: 'Kategorie aktualisieren',
      description: 'Aktualisiert die Daten einer Produktkategorie.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Kategorie' },
      ],
      requestBody: {
        name: 'IT-Services & Consulting',
        description: 'Alle IT-bezogenen Dienstleistungen und Beratung',
      },
      response: {
        success: true,
        data: {
          id: 'cat1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'IT-Services & Consulting',
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/product-categories/cat1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"IT-Services & Consulting","description":"Alle IT-bezogenen Dienstleistungen und Beratung"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/product-categories/:id',
      summary: 'Kategorie loeschen',
      description:
        'Loescht eine Produktkategorie. Schlaegt fehl wenn die Kategorie Unterkategorien (409 HAS_CHILDREN) oder verknuepfte Produkte (409 HAS_PRODUCTS) hat.',
      params: [
        { name: 'id', in: 'path', required: true, type: 'string', description: 'UUID der Kategorie' },
      ],
      response: {
        success: true,
        data: { message: 'Kategorie erfolgreich gelöscht' },
      },
      curl: `curl -X DELETE https://example.com/api/v1/product-categories/cat3c4d5e6-f7a8-b9c0-d1e2-f3a4b5c6d7e8 \\
  -b cookies.txt`,
    },
  ],
}
