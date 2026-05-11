import type { ApiService } from './types'

// Auth & Users
import { authService } from './services/auth'
import { usersService } from './services/users'
import { rolesService } from './services/roles'
import { userGroupsService } from './services/user-groups'
import { apiKeysService } from './services/api-keys'
import { adminService } from './services/admin'

// CRM
import { companiesService } from './services/companies'
import { personsService } from './services/persons'
import { leadsService } from './services/leads'
import { opportunitiesService } from './services/opportunities'
import { activitiesService } from './services/activities'
import { organizationService } from './services/organization'

// Finanzen & Vertrag
import { documentsService } from './services/documents'
import { contractTemplatesService } from './services/contract-templates'
import { contractClausesService } from './services/contract-clauses'
import { documentTemplatesService } from './services/document-templates'
import { receiptsService } from './services/receipts'

// Katalog & Zeit
import { productsService } from './services/products'
import { productCategoriesService } from './services/product-categories'
import { timeEntriesService } from './services/time-entries'
import { projectsService } from './services/projects'

// Management & Prozesse
import { processesService } from './services/processes'
import { sopsService } from './services/sops'
import { deliverablesService } from './services/deliverables'
import { ideasService } from './services/ideas'
import { cockpitService } from './services/cockpit'
import { eosService } from './services/eos'
import { okrService } from './services/okr'

// Compliance
import { dinService } from './services/din'
import { wibaService } from './services/wiba'
import { grundschutzService } from './services/grundschutz'
import { irPlaybookService } from './services/ir-playbook'

// Booking & Calendar
import { appointmentsService } from './services/appointments'
import { availabilityService } from './services/availability'
import { slotTypesService } from './services/slot-types'
import { bookingPageService } from './services/booking-page'
import { calendarAccountService } from './services/calendar-account'

// Courses & Portal
import { coursesService } from './services/courses'
import { elearningService } from './services/elearning'
import { portalService } from './services/portal'
import { portalDocumentCategoriesService } from './services/portal-document-categories'

// Email
import { emailService } from './services/email'
import { emailAccountsService } from './services/email-accounts'
import { emailTemplatesService } from './services/email-templates'
import { emailsService } from './services/emails'

// Content & Marketing
import { blogService } from './services/blog'
import { blogCategoriesService } from './services/blog-categories'
import { cmsService } from './services/cms'
import { marketingService } from './services/marketing'
import { socialMediaService } from './services/social-media'
import { newsletterService } from './services/newsletter'
import { newsService } from './services/news'
import { seoService } from './services/seo'

// AI & Automation
import { aiService } from './services/ai'
import { aiLogsService } from './services/ai-logs'
import { aiPromptTemplatesService } from './services/ai-prompt-templates'
import { aiProvidersService } from './services/ai-providers'
import { customPromptsService } from './services/custom-prompts'
import { kieService } from './services/kie'
import { chatService } from './services/chat'
import { n8nService } from './services/n8n'
import { workflowsService } from './services/workflows'
import { taskQueueService } from './services/task-queue'
import { cronJobsService } from './services/cron-jobs'
import { executionLogsService } from './services/execution-logs'
import { integrationsService } from './services/integrations'
import { socialService } from './services/social'

// BI & Dashboard
import { dashboardService } from './services/dashboard'
import { businessIntelligenceService } from './services/business-intelligence'
import { kpiService } from './services/kpi'

// Media
import { imagesService } from './services/images'
import { mediaService } from './services/media'

// Sonstiges
import { webhooksService } from './services/webhooks'
import { ordersService } from './services/orders'
import { feedbackService } from './services/feedback'
import { importService } from './services/import'

/** Ordered list of all API services for display */
export const apiServices: ApiService[] = [
  // Auth & Users
  authService, usersService, rolesService, userGroupsService, apiKeysService, adminService,
  // CRM
  companiesService, personsService, leadsService, opportunitiesService, activitiesService, organizationService,
  // Finanzen & Vertrag
  documentsService, contractTemplatesService, contractClausesService, documentTemplatesService, receiptsService,
  // Katalog & Zeit
  productsService, productCategoriesService, timeEntriesService, projectsService,
  // Management & Prozesse
  processesService, sopsService, deliverablesService, ideasService, cockpitService, eosService, okrService,
  // Compliance
  dinService, wibaService, grundschutzService, irPlaybookService,
  // Booking & Calendar
  appointmentsService, availabilityService, slotTypesService, bookingPageService, calendarAccountService,
  // Courses & Portal
  coursesService, elearningService, portalService, portalDocumentCategoriesService,
  // Email
  emailService, emailAccountsService, emailTemplatesService, emailsService,
  // Content & Marketing
  blogService, blogCategoriesService, cmsService, marketingService, socialMediaService, newsletterService, newsService, seoService,
  // AI & Automation
  aiService, aiLogsService, aiPromptTemplatesService, aiProvidersService, customPromptsService, kieService,
  chatService, n8nService, workflowsService, taskQueueService, cronJobsService, executionLogsService, integrationsService, socialService,
  // BI & Dashboard
  dashboardService, businessIntelligenceService, kpiService,
  // Media
  imagesService, mediaService,
  // Sonstiges
  webhooksService, ordersService, feedbackService, importService,
]
