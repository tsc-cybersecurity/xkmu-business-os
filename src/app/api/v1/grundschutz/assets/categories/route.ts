import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'

const ZIELOBJEKT_KATEGORIEN = [
  // Organisatorisch: Nutzende
  { uuid: '38125c38-8895-493c-ba73-77ac1029d02d', name: 'Nutzende', type: 'Nutzende', category: 'Organisatorisch', parentUuid: null },
  { uuid: '9d0465aa-a31f-465f-99c8-7a383322b2a4', name: 'Mitarbeitende', type: 'Nutzende', category: 'Organisatorisch', parentUuid: '38125c38-8895-493c-ba73-77ac1029d02d' },
  { uuid: '4779a07f-e7fd-4837-a920-7ab9254b0dd5', name: 'Fuehrungskraefte', type: 'Nutzende', category: 'Organisatorisch', parentUuid: '9d0465aa-a31f-465f-99c8-7a383322b2a4' },
  { uuid: 'd3343f0a-974f-43c5-b101-4522403422ce', name: 'Institutionsleitung', type: 'Nutzende', category: 'Organisatorisch', parentUuid: '4779a07f-e7fd-4837-a920-7ab9254b0dd5' },
  { uuid: 'efd76832-f5a1-432a-836d-c8d5c6d212cc', name: 'Administrierende', type: 'Nutzende', category: 'Organisatorisch', parentUuid: '9d0465aa-a31f-465f-99c8-7a383322b2a4' },
  // Organisatorisch: Standorte
  { uuid: 'df3978e8-775d-4aa6-8be7-fd2a6f12315d', name: 'Standorte', type: 'Standorte', category: 'Organisatorisch', parentUuid: null },
  { uuid: '422401b2-2c71-4ea5-a71c-6f386ba16cfc', name: 'Gebaeude', type: 'Standorte', category: 'Organisatorisch', parentUuid: 'df3978e8-775d-4aa6-8be7-fd2a6f12315d' },
  { uuid: '09517106-2c2c-411e-a06c-65736363286f', name: 'Raeume', type: 'Standorte', category: 'Organisatorisch', parentUuid: 'df3978e8-775d-4aa6-8be7-fd2a6f12315d' },
  { uuid: '564530dd-29ce-4988-9192-3b4dbfef061c', name: 'Raeume fuer technische Infrastruktur', type: 'Standorte', category: 'Organisatorisch', parentUuid: '09517106-2c2c-411e-a06c-65736363286f' },
  { uuid: '3a894eaa-7b42-4f59-9961-76c9a3ec2837', name: 'Serverraeume', type: 'Standorte', category: 'Organisatorisch', parentUuid: '564530dd-29ce-4988-9192-3b4dbfef061c' },
  { uuid: 'dfd8e05b-a028-4403-9776-255b968cc4a6', name: 'Datentraegerarchiv', type: 'Standorte', category: 'Organisatorisch', parentUuid: '09517106-2c2c-411e-a06c-65736363286f' },
  // Organisatorisch: Einkaeufe
  { uuid: '5f59b23c-8d18-4d5f-ad96-c02ffad10daf', name: 'Einkaeufe', type: 'Einkaeufe', category: 'Organisatorisch', parentUuid: null },
  { uuid: '23ea0f81-17ed-4b31-be13-955b46b5a905', name: 'IT-Produkte', type: 'Einkaeufe', category: 'Technisch', parentUuid: '5f59b23c-8d18-4d5f-ad96-c02ffad10daf' },
  { uuid: '04d5e0fa-7b1a-48d5-b87c-1ee0060a4c2d', name: 'Dienstleistungen', type: 'Einkaeufe', category: 'Organisatorisch', parentUuid: '5f59b23c-8d18-4d5f-ad96-c02ffad10daf' },
  { uuid: 'ff3b07f0-1d19-44fb-ac2c-dea97010c5b8', name: 'Outsourcing', type: 'Einkaeufe', category: 'Organisatorisch', parentUuid: '04d5e0fa-7b1a-48d5-b87c-1ee0060a4c2d' },
  { uuid: 'd2a23b62-9c66-4f72-98e2-17518d5dbe0f', name: 'Cloud-Dienste', type: 'Einkaeufe', category: 'Technisch', parentUuid: 'ff3b07f0-1d19-44fb-ac2c-dea97010c5b8' },
  // Technisch: IT-Systeme
  { uuid: '427da6dd-d744-4b2b-88b7-f0a695f21e14', name: 'IT-Systeme', type: 'IT-Systeme', category: 'Technisch', parentUuid: null },
  { uuid: '19c946fc-e991-44ee-87c5-7bbe5d5aaf55', name: 'Hostsysteme', type: 'IT-Systeme', category: 'Technisch', parentUuid: '427da6dd-d744-4b2b-88b7-f0a695f21e14' },
  { uuid: '837781a4-7b47-4695-9545-a3310eac7a66', name: 'Endgeraete', type: 'IT-Systeme', category: 'Technisch', parentUuid: '427da6dd-d744-4b2b-88b7-f0a695f21e14' },
  { uuid: '9f9c827a-1933-46fd-a0c6-f990990745df', name: 'Mobiltelefone', type: 'IT-Systeme', category: 'Technisch', parentUuid: '837781a4-7b47-4695-9545-a3310eac7a66' },
  { uuid: '39147c55-a952-4c34-8e2e-b8ac02a2eae7', name: 'Fahrzeuge', type: 'IT-Systeme', category: 'Technisch', parentUuid: '837781a4-7b47-4695-9545-a3310eac7a66' },
  // Technisch: Anwendungen
  { uuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871', name: 'Anwendungen', type: 'Anwendungen', category: 'Technisch', parentUuid: null },
  { uuid: 'b1411d0f-ffd1-45b7-837b-cd97ba4ed9e7', name: 'Webserver', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: '36cb0d6b-2f90-43bc-b625-9870112cf847', name: 'Webanwendungen', type: 'Anwendungen', category: 'Technisch', parentUuid: 'b1411d0f-ffd1-45b7-837b-cd97ba4ed9e7' },
  { uuid: '047aa523-6955-423d-924e-8376fb1d5722', name: 'Interpersonelle Kommunikation', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: '7aa03e0c-a417-4b08-a6d5-b89bd63c6a83', name: 'E-Mail', type: 'Anwendungen', category: 'Technisch', parentUuid: '047aa523-6955-423d-924e-8376fb1d5722' },
  { uuid: 'b5f9e5ce-d90e-4da5-8ee7-32eae4829e55', name: 'Office-Anwendungen', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: 'f88fd07b-f918-45b5-80a5-59fcea43a99c', name: 'DNS-Server', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: 'eb65007a-2247-4346-a258-c242e066a10f', name: 'Dateiserver', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: '7a2b2665-c790-4395-9980-867c900be347', name: 'Verzeichnisdienste', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: '38167a3c-ee3e-4261-9c44-994c15a31d2c', name: 'Virtualisierungsloesungen', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: '67f74abf-162d-4e47-a24a-6ff53e9b124d', name: 'TK-Anwendungen', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: 'e0f11cba-1d72-4c30-a1e9-e33f794cdfb6', name: 'VK-Anwendungen', type: 'Anwendungen', category: 'Technisch', parentUuid: '67f74abf-162d-4e47-a24a-6ff53e9b124d' },
  { uuid: '05df1662-903f-41ff-ba88-0fbe86050550', name: 'Faxe', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  { uuid: '8b64663c-8388-40bc-a68b-473e753ae4d0', name: 'Webbrowser', type: 'Anwendungen', category: 'Technisch', parentUuid: '7e41ecf5-1831-4691-ad0c-4fc7bbc1b871' },
  // Technisch: Netze
  { uuid: '1a4fb57d-1648-4111-979d-6a5f4f848620', name: 'Netze', type: 'Netze', category: 'Technisch', parentUuid: null },
  { uuid: '8ef347e7-ea3f-4624-b0f3-2af728443301', name: 'Interne Netzsegmente', type: 'Netze', category: 'Technisch', parentUuid: '1a4fb57d-1648-4111-979d-6a5f4f848620' },
  { uuid: '82a399a2-2fa7-4dd2-9850-89a7ee0505ea', name: 'WLANs', type: 'Netze', category: 'Technisch', parentUuid: '8ef347e7-ea3f-4624-b0f3-2af728443301' },
  { uuid: 'a9521914-ccf9-4c20-8eef-2dd912fb815d', name: 'Externe Netzanschluesse', type: 'Netze', category: 'Technisch', parentUuid: '1a4fb57d-1648-4111-979d-6a5f4f848620' },
  // Informationen
  { uuid: '5a5eceda-172c-4500-a19d-956dbb5de4a4', name: 'Informationen', type: 'Informationen', category: 'Informationen', parentUuid: null },
  { uuid: '69d48234-d4c2-463d-9b76-c3a1580edd85', name: 'Daten', type: 'Informationen', category: 'Informationen', parentUuid: '5a5eceda-172c-4500-a19d-956dbb5de4a4' },
] as const

type KategorieItem = (typeof ZIELOBJEKT_KATEGORIEN)[number]

interface CategoryNode {
  uuid: string
  name: string
  type: string
  category: string
  parentUuid: string | null
  children: CategoryNode[]
}

function buildCategoryTree(): CategoryNode[] {
  const rootItems = ZIELOBJEKT_KATEGORIEN.filter(k => !k.parentUuid)

  function getChildren(parentUuid: string): readonly KategorieItem[] {
    return ZIELOBJEKT_KATEGORIEN.filter(k => k.parentUuid === parentUuid)
  }

  function buildNode(item: KategorieItem): CategoryNode {
    const children = getChildren(item.uuid)
    return {
      uuid: item.uuid,
      name: item.name,
      type: item.type,
      category: item.category,
      parentUuid: item.parentUuid,
      children: children.map(buildNode),
    }
  }

  return rootItems.map(buildNode)
}

export async function GET(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'read', async () => {
    return apiSuccess({
      flat: ZIELOBJEKT_KATEGORIEN,
      tree: buildCategoryTree(),
    })
  })
}
