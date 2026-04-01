import type { ApiService } from './types'

import { authService } from './services/auth'
import { usersService } from './services/users'
import { rolesService } from './services/roles'
import { companiesService } from './services/companies'
import { personsService } from './services/persons'
import { leadsService } from './services/leads'
import { opportunitiesService } from './services/opportunities'
import { documentsService } from './services/documents'
import { contractTemplatesService } from './services/contract-templates'
import { contractClausesService } from './services/contract-clauses'
import { productsService } from './services/products'
import { timeEntriesService } from './services/time-entries'
import { receiptsService } from './services/receipts'
import { projectsService } from './services/projects'
import { processesService } from './services/processes'
import { ideasService } from './services/ideas'
import { activitiesService } from './services/activities'
import { cockpitService } from './services/cockpit'
import { dinAuditService } from './services/din-audit'
import { wibaService } from './services/wiba'
import { grundschutzService } from './services/grundschutz'
import { irPlaybookService } from './services/ir-playbook'
import { blogService } from './services/blog'
import { cmsService } from './services/cms'
import { marketingService } from './services/marketing'
import { socialMediaService } from './services/social-media'
import { newsletterService } from './services/newsletter'
import { n8nService } from './services/n8n'
import { aiService } from './services/ai'
import { chatService } from './services/chat'
import { imagesService } from './services/images'
import { mediaService } from './services/media'
import { webhooksService } from './services/webhooks'
import { apiKeysService } from './services/api-keys'
import { adminService } from './services/admin'

/** Ordered list of all API services for display */
export const apiServices: ApiService[] = [
  authService,
  usersService,
  rolesService,
  companiesService,
  personsService,
  leadsService,
  opportunitiesService,
  documentsService,
  contractTemplatesService,
  contractClausesService,
  productsService,
  timeEntriesService,
  receiptsService,
  projectsService,
  processesService,
  ideasService,
  activitiesService,
  cockpitService,
  dinAuditService,
  wibaService,
  grundschutzService,
  irPlaybookService,
  blogService,
  cmsService,
  marketingService,
  socialMediaService,
  newsletterService,
  n8nService,
  aiService,
  chatService,
  imagesService,
  mediaService,
  webhooksService,
  apiKeysService,
  adminService,
]
