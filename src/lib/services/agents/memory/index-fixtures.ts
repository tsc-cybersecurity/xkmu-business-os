/**
 * 20 Memory-Fixtures fuer Recall-Tests.
 * Deutsche Inhalte aus xKMU-Domain (CRM, Cybersecurity, KI-Beratung, Marketing).
 */

export const MEMORY_FIXTURES: Array<{ scope: string; body: string; expectedQueries: string[] }> = [
  { scope: 'projects/acme-leadgen', body: '# Acme Lead-Pipeline\nVerantwortlich fuer Outbound-Kampagne und CRM-Pflege bei Acme GmbH. Hauptansprechpartner Lisa Weber.', expectedQueries: ['acme', 'outbound', 'lisa'] },
  { scope: 'projects/cyber-audit-stadtwerke', body: '# Stadtwerke Mustermann\nBSI-Grundschutz-Audit, Asset-Inventar mit 120 Servern, Schwachstellen-Scan-Report.', expectedQueries: ['grundschutz', 'stadtwerke', 'audit'] },
  { scope: 'projects/wiba-handel', body: '# WIBA-Bewertung Handel-Kunde\nWirtschaftlichkeitsbetrachtung KI-Implementation, ROI 18 Monate.', expectedQueries: ['wiba', 'handel', 'roi'] },
  { scope: 'areas/people/lisa-weber', body: '# Lisa Weber (CMO Acme)\nPraeferenz fuer LinkedIn-Outreach. Reagiert auf datengetriebene Pitches.', expectedQueries: ['lisa weber', 'linkedin'] },
  { scope: 'areas/people/max-mustermann', body: '# Max Mustermann (Geschaeftsfuehrer Stadtwerke)\nFokus auf Compliance und Versorgungssicherheit.', expectedQueries: ['mustermann', 'compliance'] },
  { scope: 'areas/companies/acme-gmbh', body: '# Acme GmbH\nMaschinenbau, 250 MA, Standort Hannover, Hauptkontakt Lisa Weber.', expectedQueries: ['acme', 'maschinenbau', 'hannover'] },
  { scope: 'areas/companies/stadtwerke-mustermann', body: '# Stadtwerke Mustermann\nKommunaler Versorger, Wasser/Strom/Gas, ca. 80 MA.', expectedQueries: ['stadtwerke', 'versorger'] },
  { scope: 'areas/topics/dsgvo', body: '# DSGVO-Compliance\nRechtsgrundlagen Art. 6, Auftragsverarbeitung, TOMs nach Art. 32.', expectedQueries: ['dsgvo', 'compliance', 'art 32'] },
  { scope: 'areas/topics/iso-27001', body: '# ISO 27001\nManagement-System fuer Informationssicherheit. Risikoanalyse, SoA.', expectedQueries: ['iso 27001', 'isms', 'risikoanalyse'] },
  { scope: 'areas/topics/social-media', body: '# Social-Media-Strategie\nLinkedIn als B2B-Hauptkanal, Instagram fuer Brand. Posting-Frequenz 3x/Woche.', expectedQueries: ['linkedin', 'instagram', 'b2b'] },
  { scope: 'resources/cold-email-frameworks', body: '# Cold-Email-Frameworks\nAIDA, BAB (Before-After-Bridge), QVC (Question-Value-Close). Subject-Line-Best-Practices.', expectedQueries: ['cold email', 'aida', 'subject line'] },
  { scope: 'resources/lead-scoring', body: '# Lead-Scoring-Modell\nDemographic + Behavioral. Punkteschema 0-100. MQL ab 50, SQL ab 75.', expectedQueries: ['lead scoring', 'mql', 'sql'] },
  { scope: 'resources/bsi-grundschutz-tipps', body: '# BSI-Grundschutz-Praxis\nBaustein-Auswahl je Schichtmodell, Sicherheitskonzept-Erstellung.', expectedQueries: ['grundschutz', 'bsi', 'baustein'] },
  { scope: 'resources/ki-prompt-guide', body: '# KI-Prompt-Guide\nFew-Shot, Chain-of-Thought, ReAct-Pattern. JSON-Mode fuer strukturierte Outputs.', expectedQueries: ['prompt', 'few-shot', 'chain of thought'] },
  { scope: 'resources/crm-pipeline-spec', body: '# CRM-Pipeline\nStufen: Lead -> MQL -> SQL -> Angebot -> Won/Lost. Conversion-Targets je Stufe.', expectedQueries: ['crm', 'pipeline', 'mql'] },
  { scope: 'archives/projects/2025-website-relaunch', body: '# Website-Relaunch 2025\nNext.js 15 + TipTap-CMS-Migration, abgeschlossen Q3 2025.', expectedQueries: ['website', 'relaunch', 'tiptap'] },
  { scope: 'archives/projects/2024-newsletter-tool', body: '# Newsletter-Tool 2024\nSelbstgebautes Mailing-System mit Resend, abgeloest durch Brevo.', expectedQueries: ['newsletter', 'resend', 'brevo'] },
  { scope: 'projects/n8n-automation-rollout', body: '# n8n Automation Rollout\nWorkflow-Engine-Integration mit n8n als externe Backup-Engine.', expectedQueries: ['n8n', 'automation', 'workflow'] },
  { scope: 'projects/social-media-q2', body: '# Social-Media-Plan Q2 2026\nThemen: KI-Beratung Reihe A1-A4, Cybersecurity-Bytes. Wochenlich Mo/Mi/Fr.', expectedQueries: ['social media', 'q2', 'ki-beratung'] },
  { scope: 'areas/topics/ki-beratung', body: '# KI-Beratung-Methodik\nPakete A1 (Audit), A2 (Strategie), A3 (Implementation), A4 (Operate).', expectedQueries: ['ki beratung', 'a1', 'a2'] },
]
