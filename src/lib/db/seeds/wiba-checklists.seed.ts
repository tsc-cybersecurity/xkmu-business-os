/**
 * BSI WiBA (Weg in die Basis-Absicherung) Seed Data
 * 19 Checklisten mit Prueffragen basierend auf BSI-Dokumentation
 */

export interface WibaChecklistSeed {
  id: number
  slug: string
  name: string
  description: string
  priority: number
  sortOrder: number
  groupTag: string | null
  basedOnBausteine: string | null
  questionCount: number
}

export interface WibaPrueffrageSeed {
  id: number
  checklistId: number
  questionNumber: number
  questionText: string
  hilfsmittel: string | null
  aufwandKategorie: number | null
  grundschutzRef: string | null
}

export const wibaChecklistsSeedData: WibaChecklistSeed[] = [
  // === Prioritaet 1 ===
  {
    id: 1,
    slug: 'backup',
    name: 'Backup',
    description: 'Sicherstellung der Datensicherung und Wiederherstellbarkeit von Daten und Systemen.',
    priority: 1,
    sortOrder: 1,
    groupTag: null,
    basedOnBausteine: 'CON.3 Datensicherungskonzept',
    questionCount: 8,
  },
  {
    id: 2,
    slug: 'it-administration',
    name: 'IT-Administration',
    description: 'Sicherstellung einer ordnungsgemaessen IT-Administration mit klaren Verantwortlichkeiten.',
    priority: 1,
    sortOrder: 2,
    groupTag: null,
    basedOnBausteine: 'OPS.1.1.2 Ordnungsgemaesse IT-Administration',
    questionCount: 10,
  },
  {
    id: 3,
    slug: 'organisation-personal',
    name: 'Organisation und Personal',
    description: 'Organisatorische Regelungen und Sensibilisierung der Mitarbeiter fuer IT-Sicherheit.',
    priority: 1,
    sortOrder: 3,
    groupTag: null,
    basedOnBausteine: 'ISMS.1 Sicherheitsmanagement, ORP.1 Organisation, ORP.2 Personal',
    questionCount: 10,
  },
  {
    id: 4,
    slug: 'rollen-berechtigungen',
    name: 'Rollen / Berechtigungen / Authentisierung',
    description: 'Verwaltung von Zugriffsrechten, Rollen und sicherer Authentisierung.',
    priority: 1,
    sortOrder: 4,
    groupTag: null,
    basedOnBausteine: 'ORP.4 Identitaets- und Berechtigungsmanagement',
    questionCount: 10,
  },
  {
    id: 5,
    slug: 'vorbereitung-sicherheitsvorfaelle',
    name: 'Vorbereitung fuer Sicherheitsvorfaelle',
    description: 'Vorbereitung auf IT-Sicherheitsvorfaelle und Etablierung eines Notfallmanagements.',
    priority: 1,
    sortOrder: 5,
    groupTag: null,
    basedOnBausteine: 'DER.2.1 Behandlung von Sicherheitsvorfaellen',
    questionCount: 8,
  },

  // === Prioritaet 2 ===
  {
    id: 6,
    slug: 'buerosoftware',
    name: 'Buerosoftware',
    description: 'Sichere Konfiguration und Nutzung von Bueroanwendungen.',
    priority: 2,
    sortOrder: 6,
    groupTag: 'client-group',
    basedOnBausteine: 'APP.1.1 Office-Produkte',
    questionCount: 6,
  },
  {
    id: 7,
    slug: 'client',
    name: 'Client',
    description: 'Absicherung von Arbeitsplatzrechnern und deren Betriebssystemen.',
    priority: 2,
    sortOrder: 7,
    groupTag: 'client-group',
    basedOnBausteine: 'SYS.2.1 Allgemeiner Client',
    questionCount: 10,
  },
  {
    id: 8,
    slug: 'netze',
    name: 'Netze',
    description: 'Absicherung der Netzwerkinfrastruktur und Netzwerkkommunikation.',
    priority: 2,
    sortOrder: 8,
    groupTag: null,
    basedOnBausteine: 'NET.1.1 Netzarchitektur und -design, NET.3.1 Router und Switches',
    questionCount: 8,
  },
  {
    id: 9,
    slug: 'serversysteme',
    name: 'Serversysteme',
    description: 'Absicherung von Serversystemen und deren Diensten.',
    priority: 2,
    sortOrder: 9,
    groupTag: null,
    basedOnBausteine: 'SYS.1.1 Allgemeiner Server',
    questionCount: 10,
  },
  {
    id: 10,
    slug: 'serverraum-datentraeger',
    name: 'Serverraum und Datentraegerarchiv',
    description: 'Physische Sicherheit von Serverraeumen und Datentraegerarchiven.',
    priority: 2,
    sortOrder: 10,
    groupTag: null,
    basedOnBausteine: 'INF.5 Raum sowie Schrank fuer technische Infrastruktur',
    questionCount: 6,
  },
  {
    id: 11,
    slug: 'sicherheitsmechanismen',
    name: 'Sicherheitsmechanismen',
    description: 'Einsatz und Konfiguration von Sicherheitsmechanismen wie Firewall, Virenschutz und Verschluesselung.',
    priority: 2,
    sortOrder: 11,
    groupTag: null,
    basedOnBausteine: 'OPS.1.1.4 Schutz vor Schadprogrammen, NET.3.2 Firewall',
    questionCount: 8,
  },
  {
    id: 12,
    slug: 'webserver-webanwendungen',
    name: 'Webserver und Webanwendungen',
    description: 'Sichere Konfiguration und Betrieb von Webservern und Webanwendungen.',
    priority: 2,
    sortOrder: 12,
    groupTag: null,
    basedOnBausteine: 'APP.3.1 Webanwendungen und Webservices, APP.3.2 Webserver',
    questionCount: 8,
  },

  // === Prioritaet 3 ===
  {
    id: 13,
    slug: 'arbeit-ausserhalb',
    name: 'Arbeit ausserhalb der Institution',
    description: 'Absicherung von Heimarbeitsplaetzen und mobilem Arbeiten.',
    priority: 3,
    sortOrder: 13,
    groupTag: null,
    basedOnBausteine: 'INF.9 Mobiler Arbeitsplatz, OPS.1.2.4 Telearbeit',
    questionCount: 8,
  },
  {
    id: 14,
    slug: 'arbeit-innerhalb-haustechnik',
    name: 'Arbeit innerhalb der Institution / Haustechnik',
    description: 'Physische Sicherheit innerhalb des Gebaeudes und der Haustechnik.',
    priority: 3,
    sortOrder: 14,
    groupTag: null,
    basedOnBausteine: 'INF.1 Allgemeines Gebaeude',
    questionCount: 6,
  },
  {
    id: 15,
    slug: 'mobile-endgeraete',
    name: 'Mobile Endgeraete',
    description: 'Absicherung von Smartphones, Tablets und anderen mobilen Geraeten.',
    priority: 3,
    sortOrder: 15,
    groupTag: null,
    basedOnBausteine: 'SYS.3.2.1 Allgemeine Smartphones und Tablets',
    questionCount: 8,
  },
  {
    id: 16,
    slug: 'outsourcing-cloud',
    name: 'Outsourcing und Cloud',
    description: 'Sicherer Einsatz von Cloud-Diensten und Steuerung von Outsourcing-Dienstleistern.',
    priority: 3,
    sortOrder: 16,
    groupTag: null,
    basedOnBausteine: 'OPS.2.2 Cloud-Nutzung',
    questionCount: 8,
  },
  {
    id: 17,
    slug: 'umgang-informationen',
    name: 'Umgang mit Informationen',
    description: 'Klassifikation, Kennzeichnung und sicherer Umgang mit Informationen.',
    priority: 3,
    sortOrder: 17,
    groupTag: null,
    basedOnBausteine: 'CON.1 Kryptokonzept, CON.2 Datenschutz',
    questionCount: 6,
  },

  // === Prioritaet 4 ===
  {
    id: 18,
    slug: 'drucker-multifunktionsgeraete',
    name: 'Drucker / Multifunktionsgeraete',
    description: 'Sichere Konfiguration und Nutzung von Druckern und Multifunktionsgeraeten.',
    priority: 4,
    sortOrder: 18,
    groupTag: null,
    basedOnBausteine: 'SYS.4.1 Drucker, Kopierer und Multifunktionsgeraete',
    questionCount: 6,
  },
  {
    id: 19,
    slug: 'telefonie-fax',
    name: 'Telefonie und Fax',
    description: 'Sichere Nutzung von Telefonanlagen, VoIP und Faxgeraeten.',
    priority: 4,
    sortOrder: 19,
    groupTag: null,
    basedOnBausteine: 'NET.4.1 TK-Anlagen, NET.4.2 VoIP',
    questionCount: 5,
  },
]

// Prueffragen IDs start at 1 and increment globally
let prueffrageId = 0
function nextId() {
  return ++prueffrageId
}

export const wibaPrueffragenSeedData: WibaPrueffrageSeed[] = [
  // === Checkliste 1: Backup (8 Fragen) ===
  { id: nextId(), checklistId: 1, questionNumber: 1, questionText: 'Werden regelmaessige Datensicherungen (Backups) aller wichtigen Daten durchgefuehrt?', hilfsmittel: 'Pruefen Sie, ob ein automatisiertes Backup-System eingerichtet ist und alle relevanten Daten abdeckt.', aufwandKategorie: 1, grundschutzRef: 'CON.3.A1' },
  { id: nextId(), checklistId: 1, questionNumber: 2, questionText: 'Ist ein Datensicherungskonzept dokumentiert, das Umfang, Haeufigkeit und Aufbewahrung regelt?', hilfsmittel: 'Ein Datensicherungskonzept sollte mindestens die zu sichernden Daten, Backup-Intervalle, Aufbewahrungsfristen und Verantwortlichkeiten enthalten.', aufwandKategorie: 2, grundschutzRef: 'CON.3.A2' },
  { id: nextId(), checklistId: 1, questionNumber: 3, questionText: 'Werden Backups an einem sicheren, raeumlich getrennten Ort aufbewahrt?', hilfsmittel: 'Backups sollten nicht am selben Ort wie die Originaldaten gelagert werden (Brand-, Wasserschutz).', aufwandKategorie: 2, grundschutzRef: 'CON.3.A4' },
  { id: nextId(), checklistId: 1, questionNumber: 4, questionText: 'Werden Wiederherstellungstests (Restore-Tests) regelmaessig durchgefuehrt?', hilfsmittel: 'Mindestens einmal jaehrlich sollte getestet werden, ob Daten aus Backups erfolgreich wiederhergestellt werden koennen.', aufwandKategorie: 2, grundschutzRef: 'CON.3.A5' },
  { id: nextId(), checklistId: 1, questionNumber: 5, questionText: 'Sind die Backup-Medien bzw. -Speicher vor unberechtigtem Zugriff geschuetzt?', hilfsmittel: 'Pruefen Sie die Zugriffskontrolle auf Backup-Speicher und -Medien.', aufwandKategorie: 1, grundschutzRef: 'CON.3.A4' },
  { id: nextId(), checklistId: 1, questionNumber: 6, questionText: 'Werden Backups verschluesselt, wenn sie extern oder in der Cloud gespeichert werden?', hilfsmittel: 'Verschluesselung ist besonders bei externer Speicherung oder Cloud-Backups wichtig.', aufwandKategorie: 2, grundschutzRef: 'CON.3.A6' },
  { id: nextId(), checklistId: 1, questionNumber: 7, questionText: 'Gibt es eine Uebersicht aller zu sichernden Systeme und Datenbestaende?', hilfsmittel: 'Eine vollstaendige Inventarliste hilft sicherzustellen, dass keine wichtigen Daten vergessen werden.', aufwandKategorie: 1, grundschutzRef: 'CON.3.A1' },
  { id: nextId(), checklistId: 1, questionNumber: 8, questionText: 'Wird die Einhaltung der Backup-Vorgaben regelmaessig kontrolliert?', hilfsmittel: 'Regelmäßige Kontrollen stellen sicher, dass Backups planmaessig durchgefuehrt werden.', aufwandKategorie: 1, grundschutzRef: 'CON.3.A2' },

  // === Checkliste 2: IT-Administration (10 Fragen) ===
  { id: nextId(), checklistId: 2, questionNumber: 1, questionText: 'Sind die Aufgaben und Verantwortlichkeiten der IT-Administration klar definiert und dokumentiert?', hilfsmittel: 'Dokumentierte Zustaendigkeiten vermeiden Luecken in der Verantwortung.', aufwandKategorie: 1, grundschutzRef: 'OPS.1.1.2.A1' },
  { id: nextId(), checklistId: 2, questionNumber: 2, questionText: 'Werden administrative Konten nur fuer Verwaltungsaufgaben genutzt (nicht fuer Alltagsarbeit)?', hilfsmittel: 'Administratoren sollten fuer normale Taetigkeiten Standard-Benutzerkonten verwenden.', aufwandKategorie: 1, grundschutzRef: 'OPS.1.1.2.A2' },
  { id: nextId(), checklistId: 2, questionNumber: 3, questionText: 'Werden Aenderungen an IT-Systemen dokumentiert (z.B. Installationen, Konfigurationsaenderungen)?', hilfsmittel: 'Ein Aenderungsprotokoll erleichtert die Fehlersuche und Nachvollziehbarkeit.', aufwandKategorie: 2, grundschutzRef: 'OPS.1.1.2.A5' },
  { id: nextId(), checklistId: 2, questionNumber: 4, questionText: 'Werden Sicherheitsupdates und Patches zeitnah eingespielt?', hilfsmittel: 'Patches sollten zeitnah nach Veroeffentlichung evaluiert und installiert werden.', aufwandKategorie: 1, grundschutzRef: 'OPS.1.1.2.A3' },
  { id: nextId(), checklistId: 2, questionNumber: 5, questionText: 'Gibt es ein Verfahren zur sicheren Entsorgung oder Aussonderung von IT-Geraeten?', hilfsmittel: 'Datentraeger muessen vor der Entsorgung sicher geloescht oder zerstoert werden.', aufwandKategorie: 2, grundschutzRef: 'OPS.1.1.2.A8' },
  { id: nextId(), checklistId: 2, questionNumber: 6, questionText: 'Existiert eine aktuelle Dokumentation der IT-Infrastruktur (Netzplan, Systemuebersicht)?', hilfsmittel: 'Eine aktuelle Dokumentation ist Grundlage fuer Fehleranalyse und Sicherheitsbewertungen.', aufwandKategorie: 2, grundschutzRef: 'OPS.1.1.2.A4' },
  { id: nextId(), checklistId: 2, questionNumber: 7, questionText: 'Werden Protokolldaten (Logs) der IT-Systeme regelmaessig ausgewertet?', hilfsmittel: 'Logdaten koennen fruehzeitig auf Sicherheitsvorfaelle hinweisen.', aufwandKategorie: 3, grundschutzRef: 'OPS.1.1.2.A6' },
  { id: nextId(), checklistId: 2, questionNumber: 8, questionText: 'Wird der Fernzugriff (Remote Access) auf IT-Systeme abgesichert?', hilfsmittel: 'VPN, Zwei-Faktor-Authentifizierung und verschluesselte Verbindungen sind empfohlen.', aufwandKategorie: 2, grundschutzRef: 'OPS.1.1.2.A7' },
  { id: nextId(), checklistId: 2, questionNumber: 9, questionText: 'Werden nicht mehr benoetigte Benutzerkonten zeitnah deaktiviert oder geloescht?', hilfsmittel: 'Beim Austritt von Mitarbeitern muessen deren Zugangsrechte sofort entzogen werden.', aufwandKategorie: 1, grundschutzRef: 'OPS.1.1.2.A2' },
  { id: nextId(), checklistId: 2, questionNumber: 10, questionText: 'Gibt es einen definierten Prozess fuer die Einrichtung neuer IT-Systeme und Anwendungen?', hilfsmittel: 'Standardisierte Prozesse erhoehen die Sicherheit und Konsistenz.', aufwandKategorie: 2, grundschutzRef: 'OPS.1.1.2.A5' },

  // === Checkliste 3: Organisation und Personal (10 Fragen) ===
  { id: nextId(), checklistId: 3, questionNumber: 1, questionText: 'Gibt es eine benannte Person, die fuer IT-Sicherheit verantwortlich ist?', hilfsmittel: 'Auch in kleinen Unternehmen muss es eine klare Verantwortlichkeit fuer IT-Sicherheit geben.', aufwandKategorie: 1, grundschutzRef: 'ISMS.1.A1' },
  { id: nextId(), checklistId: 3, questionNumber: 2, questionText: 'Werden Mitarbeiter regelmaessig zu IT-Sicherheitsthemen geschult oder sensibilisiert?', hilfsmittel: 'Awareness-Schulungen sollten mindestens jaehrlich stattfinden.', aufwandKategorie: 2, grundschutzRef: 'ORP.1.A2' },
  { id: nextId(), checklistId: 3, questionNumber: 3, questionText: 'Existieren verbindliche Sicherheitsrichtlinien oder -regelungen fuer Mitarbeiter?', hilfsmittel: 'Richtlinien zur Nutzung von IT-Systemen, Passwoertern, E-Mail und Internet.', aufwandKategorie: 2, grundschutzRef: 'ORP.1.A1' },
  { id: nextId(), checklistId: 3, questionNumber: 4, questionText: 'Gibt es Vertretungsregelungen fuer IT-relevante Aufgaben?', hilfsmittel: 'Stellen Sie sicher, dass bei Abwesenheit kritische IT-Aufgaben weiterhin erledigt werden.', aufwandKategorie: 1, grundschutzRef: 'ORP.1.A3' },
  { id: nextId(), checklistId: 3, questionNumber: 5, questionText: 'Werden neue Mitarbeiter in die geltenden IT-Sicherheitsregelungen eingewiesen?', hilfsmittel: 'Onboarding sollte eine IT-Sicherheitsunterweisung beinhalten.', aufwandKategorie: 1, grundschutzRef: 'ORP.2.A1' },
  { id: nextId(), checklistId: 3, questionNumber: 6, questionText: 'Gibt es einen geregelten Prozess beim Ausscheiden von Mitarbeitern (Offboarding)?', hilfsmittel: 'Zugangsrechte muessen entzogen, Geraete zurueckgegeben und Daten gesichert werden.', aufwandKategorie: 1, grundschutzRef: 'ORP.2.A3' },
  { id: nextId(), checklistId: 3, questionNumber: 7, questionText: 'Werden externe Dienstleister auf IT-Sicherheitsanforderungen verpflichtet?', hilfsmittel: 'Vertragliche Regelungen zur Geheimhaltung und IT-Sicherheit fuer externe Partner.', aufwandKategorie: 2, grundschutzRef: 'ORP.2.A5' },
  { id: nextId(), checklistId: 3, questionNumber: 8, questionText: 'Ist geregelt, wie mit privaten IT-Geraeten am Arbeitsplatz (BYOD) umgegangen wird?', hilfsmittel: 'BYOD-Richtlinien sollten Nutzung, Sicherheitsanforderungen und Haftung regeln.', aufwandKategorie: 2, grundschutzRef: 'ORP.1.A4' },
  { id: nextId(), checklistId: 3, questionNumber: 9, questionText: 'Werden IT-Sicherheitsvorgaben regelmaessig ueberprueft und aktualisiert?', hilfsmittel: 'Mindestens jaehrlich sollten Richtlinien auf Aktualitaet geprueft werden.', aufwandKategorie: 2, grundschutzRef: 'ISMS.1.A2' },
  { id: nextId(), checklistId: 3, questionNumber: 10, questionText: 'Ist die Geschaeftsfuehrung in IT-Sicherheitsentscheidungen eingebunden?', hilfsmittel: 'Die Geschaeftsfuehrung traegt die Gesamtverantwortung fuer IT-Sicherheit.', aufwandKategorie: 1, grundschutzRef: 'ISMS.1.A1' },

  // === Checkliste 4: Rollen / Berechtigungen / Authentisierung (10 Fragen) ===
  { id: nextId(), checklistId: 4, questionNumber: 1, questionText: 'Werden Zugriffsrechte nach dem Minimalprinzip (need-to-know) vergeben?', hilfsmittel: 'Benutzer sollten nur die Rechte erhalten, die sie fuer ihre Taetigkeit benoetigen.', aufwandKategorie: 1, grundschutzRef: 'ORP.4.A1' },
  { id: nextId(), checklistId: 4, questionNumber: 2, questionText: 'Gibt es ein dokumentiertes Berechtigungskonzept?', hilfsmittel: 'Ein Berechtigungskonzept definiert, welche Rollen welche Zugriffsrechte haben.', aufwandKategorie: 2, grundschutzRef: 'ORP.4.A2' },
  { id: nextId(), checklistId: 4, questionNumber: 3, questionText: 'Werden Passwoerter nach definierten Mindestanforderungen vergeben?', hilfsmittel: 'Mindestlaenge, Komplexitaet und regelmaessiger Wechsel sollten definiert sein.', aufwandKategorie: 1, grundschutzRef: 'ORP.4.A3' },
  { id: nextId(), checklistId: 4, questionNumber: 4, questionText: 'Wird Zwei-Faktor-Authentifizierung (2FA) fuer kritische Systeme eingesetzt?', hilfsmittel: 'Besonders fuer Admin-Zugaenge, VPN und Cloud-Dienste empfohlen.', aufwandKategorie: 2, grundschutzRef: 'ORP.4.A4' },
  { id: nextId(), checklistId: 4, questionNumber: 5, questionText: 'Werden Berechtigungen regelmaessig ueberprueft (Berechtigungs-Review)?', hilfsmittel: 'Mindestens halbjaehrlich sollten Zugriffsrechte auf Aktualitaet geprueft werden.', aufwandKategorie: 2, grundschutzRef: 'ORP.4.A5' },
  { id: nextId(), checklistId: 4, questionNumber: 6, questionText: 'Gibt es eine Richtlinie zum sicheren Umgang mit Passwoertern?', hilfsmittel: 'Keine gemeinsame Nutzung, kein Notieren, Einsatz eines Passwort-Managers empfohlen.', aufwandKategorie: 1, grundschutzRef: 'ORP.4.A3' },
  { id: nextId(), checklistId: 4, questionNumber: 7, questionText: 'Werden privilegierte Konten (Admin-Accounts) besonders geschuetzt?', hilfsmittel: 'Separate Konten, staerkere Authentisierung und Protokollierung fuer Admin-Zugaenge.', aufwandKategorie: 2, grundschutzRef: 'ORP.4.A6' },
  { id: nextId(), checklistId: 4, questionNumber: 8, questionText: 'Werden Standard-Passwoerter bei Inbetriebnahme neuer Systeme geaendert?', hilfsmittel: 'Default-Passwoerter von Herstellern muessen sofort geaendert werden.', aufwandKategorie: 1, grundschutzRef: 'ORP.4.A3' },
  { id: nextId(), checklistId: 4, questionNumber: 9, questionText: 'Wird bei Fehlversuchen eine automatische Kontosperre ausgeloest?', hilfsmittel: 'Nach einer definierten Anzahl fehlerhafter Anmeldeversuche sollte das Konto gesperrt werden.', aufwandKategorie: 1, grundschutzRef: 'ORP.4.A7' },
  { id: nextId(), checklistId: 4, questionNumber: 10, questionText: 'Werden freigegebene Verzeichnisse und Netzlaufwerke mit angemessenen Berechtigungen versehen?', hilfsmittel: 'Netzwerkfreigaben sollten nur fuer berechtigte Benutzergruppen zugaenglich sein.', aufwandKategorie: 1, grundschutzRef: 'ORP.4.A2' },

  // === Checkliste 5: Vorbereitung fuer Sicherheitsvorfaelle (8 Fragen) ===
  { id: nextId(), checklistId: 5, questionNumber: 1, questionText: 'Gibt es einen Notfallplan oder eine Notfallkarte fuer IT-Sicherheitsvorfaelle?', hilfsmittel: 'Ein einfacher Notfallplan mit Ansprechpartnern und ersten Schritten ist essentiell.', aufwandKategorie: 2, grundschutzRef: 'DER.2.1.A1' },
  { id: nextId(), checklistId: 5, questionNumber: 2, questionText: 'Sind Ansprechpartner und Eskalationswege fuer IT-Sicherheitsvorfaelle bekannt?', hilfsmittel: 'Alle Mitarbeiter sollten wissen, wen sie bei einem Vorfall kontaktieren muessen.', aufwandKategorie: 1, grundschutzRef: 'DER.2.1.A2' },
  { id: nextId(), checklistId: 5, questionNumber: 3, questionText: 'Werden IT-Sicherheitsvorfaelle dokumentiert und ausgewertet?', hilfsmittel: 'Eine strukturierte Dokumentation hilft, aus Vorfaellen zu lernen.', aufwandKategorie: 2, grundschutzRef: 'DER.2.1.A3' },
  { id: nextId(), checklistId: 5, questionNumber: 4, questionText: 'Wurden kritische Geschaeftsprozesse und deren IT-Abhaengigkeiten identifiziert?', hilfsmittel: 'Eine Business-Impact-Analyse zeigt, welche Systeme besonders schuetzenswert sind.', aufwandKategorie: 3, grundschutzRef: 'DER.2.1.A4' },
  { id: nextId(), checklistId: 5, questionNumber: 5, questionText: 'Gibt es Kontaktdaten externer Ansprechpartner (IT-Dienstleister, BSI, Polizei)?', hilfsmittel: 'Wichtige Notfallkontakte sollten offline verfuegbar und aktuell sein.', aufwandKategorie: 1, grundschutzRef: 'DER.2.1.A2' },
  { id: nextId(), checklistId: 5, questionNumber: 6, questionText: 'Wird das Verhalten bei einem Ransomware-Angriff geuebt oder besprochen?', hilfsmittel: 'Regelmaessige Uebungen erhoehen die Handlungsfaehigkeit im Ernstfall.', aufwandKategorie: 3, grundschutzRef: 'DER.2.1.A5' },
  { id: nextId(), checklistId: 5, questionNumber: 7, questionText: 'Koennen IT-Systeme im Notfall schnell isoliert werden (Netzwerktrennung)?', hilfsmittel: 'Die Moeglichkeit zur schnellen Netzwerktrennung begrenzt den Schaden bei Angriffen.', aufwandKategorie: 2, grundschutzRef: 'DER.2.1.A6' },
  { id: nextId(), checklistId: 5, questionNumber: 8, questionText: 'Ist geregelt, ab wann und wie externe Stellen (BSI, Datenschutzbehoerde) informiert werden?', hilfsmittel: 'Meldepflichten bei Datenpannen (DSGVO Art. 33) beachten.', aufwandKategorie: 2, grundschutzRef: 'DER.2.1.A7' },

  // === Checkliste 6: Buerosoftware (6 Fragen) ===
  { id: nextId(), checklistId: 6, questionNumber: 1, questionText: 'Werden Bueroanwendungen (Office-Programme) regelmaessig aktualisiert?', hilfsmittel: 'Automatische Updates sollten aktiviert oder ein Update-Prozess etabliert sein.', aufwandKategorie: 1, grundschutzRef: 'APP.1.1.A1' },
  { id: nextId(), checklistId: 6, questionNumber: 2, questionText: 'Ist die Ausfuehrung von Makros in Office-Dokumenten eingeschraenkt?', hilfsmittel: 'Makros sind ein haeufiger Angriffsvektor und sollten standardmaessig deaktiviert sein.', aufwandKategorie: 1, grundschutzRef: 'APP.1.1.A2' },
  { id: nextId(), checklistId: 6, questionNumber: 3, questionText: 'Werden E-Mail-Anhaenge und Downloads vor dem Oeffnen auf Schadsoftware geprueft?', hilfsmittel: 'Automatische Virenscans fuer Downloads und E-Mail-Anhaenge einrichten.', aufwandKategorie: 1, grundschutzRef: 'APP.1.1.A3' },
  { id: nextId(), checklistId: 6, questionNumber: 4, questionText: 'Ist die automatische Ausfuehrung von Inhalten (ActiveX, Skripte) in Office-Anwendungen deaktiviert?', hilfsmittel: 'Aktive Inhalte sollten nur bei Bedarf und nach Pruefung aktiviert werden.', aufwandKategorie: 1, grundschutzRef: 'APP.1.1.A2' },
  { id: nextId(), checklistId: 6, questionNumber: 5, questionText: 'Werden nur lizenzierte und unterstuetzte Softwareversionen eingesetzt?', hilfsmittel: 'Nicht mehr unterstuetzte Software erhaelt keine Sicherheitsupdates mehr.', aufwandKategorie: 1, grundschutzRef: 'APP.1.1.A4' },
  { id: nextId(), checklistId: 6, questionNumber: 6, questionText: 'Gibt es Regelungen fuer den Umgang mit vertraulichen Dokumenten in Bueroanwendungen?', hilfsmittel: 'Vertrauliche Dokumente sollten verschluesselt und zugriffsgeschuetzt gespeichert werden.', aufwandKategorie: 2, grundschutzRef: 'APP.1.1.A5' },

  // === Checkliste 7: Client (10 Fragen) ===
  { id: nextId(), checklistId: 7, questionNumber: 1, questionText: 'Sind alle Arbeitsplatzrechner mit einem aktuellen Betriebssystem ausgestattet?', hilfsmittel: 'Aeltere, nicht mehr unterstuetzte Betriebssysteme erhalten keine Sicherheitsupdates.', aufwandKategorie: 1, grundschutzRef: 'SYS.2.1.A1' },
  { id: nextId(), checklistId: 7, questionNumber: 2, questionText: 'Werden Betriebssystem-Updates automatisch oder zeitnah eingespielt?', hilfsmittel: 'Automatische Updates oder ein woechtentlicher Update-Zyklus wird empfohlen.', aufwandKategorie: 1, grundschutzRef: 'SYS.2.1.A2' },
  { id: nextId(), checklistId: 7, questionNumber: 3, questionText: 'Ist auf allen Clients eine aktuelle Antivirensoftware installiert und aktiviert?', hilfsmittel: 'Virenscanner sollten mit aktuellen Signaturen arbeiten und Echtzeitschutz bieten.', aufwandKategorie: 1, grundschutzRef: 'SYS.2.1.A3' },
  { id: nextId(), checklistId: 7, questionNumber: 4, questionText: 'Ist die lokale Firewall auf allen Clients aktiviert?', hilfsmittel: 'Die Windows-Firewall oder ein vergleichbarer Schutz sollte aktiv sein.', aufwandKategorie: 1, grundschutzRef: 'SYS.2.1.A4' },
  { id: nextId(), checklistId: 7, questionNumber: 5, questionText: 'Werden Bildschirmsperren bei Inaktivitaet automatisch aktiviert?', hilfsmittel: 'Nach maximal 10 Minuten Inaktivitaet sollte der Bildschirm gesperrt werden.', aufwandKategorie: 1, grundschutzRef: 'SYS.2.1.A5' },
  { id: nextId(), checklistId: 7, questionNumber: 6, questionText: 'Ist die Installation von Software durch Benutzer eingeschraenkt?', hilfsmittel: 'Nur autorisierte Personen sollten Software installieren duerfen.', aufwandKategorie: 2, grundschutzRef: 'SYS.2.1.A6' },
  { id: nextId(), checklistId: 7, questionNumber: 7, questionText: 'Sind nicht benoetigte Dienste und Ports auf den Clients deaktiviert?', hilfsmittel: 'Reduzieren Sie die Angriffsflaeche durch Deaktivierung ungenutzter Dienste.', aufwandKategorie: 2, grundschutzRef: 'SYS.2.1.A7' },
  { id: nextId(), checklistId: 7, questionNumber: 8, questionText: 'Werden USB-Ports und externe Schnittstellen kontrolliert?', hilfsmittel: 'Richtlinien fuer USB-Geraete und ggf. Device-Control-Software einsetzen.', aufwandKategorie: 2, grundschutzRef: 'SYS.2.1.A8' },
  { id: nextId(), checklistId: 7, questionNumber: 9, questionText: 'Sind alle Clients mit einer Festplattenverschluesselung ausgestattet?', hilfsmittel: 'BitLocker (Windows) oder FileVault (macOS) schuetzen bei Diebstahl/Verlust.', aufwandKategorie: 2, grundschutzRef: 'SYS.2.1.A9' },
  { id: nextId(), checklistId: 7, questionNumber: 10, questionText: 'Gibt es ein Inventarverzeichnis aller eingesetzten Clients?', hilfsmittel: 'Eine aktuelle Liste aller Arbeitsplatzrechner mit Betriebssystem und Softwarestand.', aufwandKategorie: 1, grundschutzRef: 'SYS.2.1.A10' },

  // === Checkliste 8: Netze (8 Fragen) ===
  { id: nextId(), checklistId: 8, questionNumber: 1, questionText: 'Existiert ein aktueller Netzplan, der alle Komponenten und Verbindungen zeigt?', hilfsmittel: 'Ein Netzplan ist Grundlage fuer Sicherheitsbewertungen und Fehleranalyse.', aufwandKategorie: 2, grundschutzRef: 'NET.1.1.A1' },
  { id: nextId(), checklistId: 8, questionNumber: 2, questionText: 'Ist das interne Netzwerk in Segmente unterteilt (z.B. Server, Clients, Gaeste-WLAN)?', hilfsmittel: 'Netzwerksegmentierung begrenzt den Schaden bei einem Sicherheitsvorfall.', aufwandKategorie: 3, grundschutzRef: 'NET.1.1.A2' },
  { id: nextId(), checklistId: 8, questionNumber: 3, questionText: 'Ist das WLAN mit WPA3 oder mindestens WPA2 verschluesselt?', hilfsmittel: 'WEP und offene WLANs sind unsicher und sollten nicht mehr verwendet werden.', aufwandKategorie: 1, grundschutzRef: 'NET.1.1.A3' },
  { id: nextId(), checklistId: 8, questionNumber: 4, questionText: 'Gibt es ein separates Gaeste-WLAN, das vom internen Netzwerk getrennt ist?', hilfsmittel: 'Gaeste sollten keinen Zugriff auf interne Ressourcen erhalten.', aufwandKategorie: 2, grundschutzRef: 'NET.1.1.A4' },
  { id: nextId(), checklistId: 8, questionNumber: 5, questionText: 'Werden Standard-Passwoerter an Netzwerkgeraeten (Router, Switches) geaendert?', hilfsmittel: 'Default-Credentials sind oeffentlich bekannt und muessen geaendert werden.', aufwandKategorie: 1, grundschutzRef: 'NET.3.1.A1' },
  { id: nextId(), checklistId: 8, questionNumber: 6, questionText: 'Wird die Firmware von Netzwerkgeraeten regelmaessig aktualisiert?', hilfsmittel: 'Firmware-Updates schliessen Sicherheitsluecken in Routern und Switches.', aufwandKategorie: 2, grundschutzRef: 'NET.3.1.A2' },
  { id: nextId(), checklistId: 8, questionNumber: 7, questionText: 'Sind ungenutzte Netzwerk-Ports (physisch und logisch) deaktiviert?', hilfsmittel: 'Nicht benoetigte Ports sollten aus Sicherheitsgruenden deaktiviert werden.', aufwandKategorie: 2, grundschutzRef: 'NET.3.1.A3' },
  { id: nextId(), checklistId: 8, questionNumber: 8, questionText: 'Wird der Netzwerkverkehr ueberwacht oder protokolliert?', hilfsmittel: 'Monitoring hilft, ungewoehnliche Aktivitaeten fruehzeitig zu erkennen.', aufwandKategorie: 3, grundschutzRef: 'NET.1.1.A5' },

  // === Checkliste 9: Serversysteme (10 Fragen) ===
  { id: nextId(), checklistId: 9, questionNumber: 1, questionText: 'Werden alle Server mit aktuellen und unterstuetzten Betriebssystemen betrieben?', hilfsmittel: 'End-of-Life-Betriebssysteme erhalten keine Sicherheitsupdates mehr.', aufwandKategorie: 1, grundschutzRef: 'SYS.1.1.A1' },
  { id: nextId(), checklistId: 9, questionNumber: 2, questionText: 'Werden Sicherheitsupdates fuer Server zeitnah eingespielt?', hilfsmittel: 'Kritische Patches sollten innerhalb weniger Tage installiert werden.', aufwandKategorie: 1, grundschutzRef: 'SYS.1.1.A2' },
  { id: nextId(), checklistId: 9, questionNumber: 3, questionText: 'Sind nicht benoetigte Dienste und Ports auf den Servern deaktiviert?', hilfsmittel: 'Minimieren Sie die Angriffsflaeche durch Deaktivierung ungenutzter Dienste.', aufwandKategorie: 2, grundschutzRef: 'SYS.1.1.A3' },
  { id: nextId(), checklistId: 9, questionNumber: 4, questionText: 'Wird der Zugang zu Servern auf autorisierte Personen beschraenkt?', hilfsmittel: 'Sowohl physischer als auch logischer Zugang sollte kontrolliert werden.', aufwandKategorie: 1, grundschutzRef: 'SYS.1.1.A4' },
  { id: nextId(), checklistId: 9, questionNumber: 5, questionText: 'Werden Server-Logdaten regelmaessig ausgewertet?', hilfsmittel: 'Loganalyse hilft bei der Erkennung von Angriffen und Fehlkonfigurationen.', aufwandKategorie: 3, grundschutzRef: 'SYS.1.1.A5' },
  { id: nextId(), checklistId: 9, questionNumber: 6, questionText: 'Gibt es eine Haertungskonfiguration fuer Server (Hardening)?', hilfsmittel: 'CIS Benchmarks oder Herstellerempfehlungen als Grundlage fuer Haertung nutzen.', aufwandKategorie: 3, grundschutzRef: 'SYS.1.1.A6' },
  { id: nextId(), checklistId: 9, questionNumber: 7, questionText: 'Sind virtuelle Server genauso abgesichert wie physische Server?', hilfsmittel: 'Virtualisierungsumgebungen benoetigen zusaetzliche Sicherheitsmassnahmen.', aufwandKategorie: 2, grundschutzRef: 'SYS.1.1.A7' },
  { id: nextId(), checklistId: 9, questionNumber: 8, questionText: 'Werden Server-Zertifikate regelmaessig erneuert und verwaltet?', hilfsmittel: 'Abgelaufene Zertifikate koennen zu Sicherheitsluecken und Ausfaellen fuehren.', aufwandKategorie: 2, grundschutzRef: 'SYS.1.1.A8' },
  { id: nextId(), checklistId: 9, questionNumber: 9, questionText: 'Gibt es eine unterbrechungsfreie Stromversorgung (USV) fuer kritische Server?', hilfsmittel: 'USV schuetzt vor Datenverlust bei Stromausfaellen.', aufwandKategorie: 2, grundschutzRef: 'SYS.1.1.A9' },
  { id: nextId(), checklistId: 9, questionNumber: 10, questionText: 'Wird eine Kapazitaetsplanung fuer Serversysteme durchgefuehrt?', hilfsmittel: 'Rechtzeitige Erweiterung vermeidet Ausfaelle durch Ressourcenengpaesse.', aufwandKategorie: 2, grundschutzRef: 'SYS.1.1.A10' },

  // === Checkliste 10: Serverraum und Datentraegerarchiv (6 Fragen) ===
  { id: nextId(), checklistId: 10, questionNumber: 1, questionText: 'Ist der Serverraum vor unbefugtem Zutritt geschuetzt (Schluessel/Zutrittskontrolle)?', hilfsmittel: 'Nur autorisierte Personen sollten Zugang zum Serverraum haben.', aufwandKategorie: 1, grundschutzRef: 'INF.5.A1' },
  { id: nextId(), checklistId: 10, questionNumber: 2, questionText: 'Ist der Serverraum klimatisiert und die Temperatur ueberwacht?', hilfsmittel: 'Zu hohe Temperaturen koennen zu Hardwareausfaellen fuehren.', aufwandKategorie: 2, grundschutzRef: 'INF.5.A2' },
  { id: nextId(), checklistId: 10, questionNumber: 3, questionText: 'Gibt es einen Brandschutz im Serverraum (Rauchmelder, Feuerloescher)?', hilfsmittel: 'Brandfrueherkennung und geeignete Loeschmittel (CO2, kein Wasser) verwenden.', aufwandKategorie: 2, grundschutzRef: 'INF.5.A3' },
  { id: nextId(), checklistId: 10, questionNumber: 4, questionText: 'Ist der Serverraum gegen Wasserschaeden geschuetzt?', hilfsmittel: 'Wassermelder installieren und Leitungen ueberpruefen.', aufwandKategorie: 2, grundschutzRef: 'INF.5.A4' },
  { id: nextId(), checklistId: 10, questionNumber: 5, questionText: 'Werden Datentraeger sicher gelagert und der Zugriff kontrolliert?', hilfsmittel: 'Verschlossene Schraenke und Zugangsprotokollierung fuer Datentraeger.', aufwandKategorie: 1, grundschutzRef: 'INF.5.A5' },
  { id: nextId(), checklistId: 10, questionNumber: 6, questionText: 'Werden nicht mehr benoetigte Datentraeger sicher vernichtet?', hilfsmittel: 'Zertifizierte Vernichtung nach DIN 66399 fuer sensible Datentraeger.', aufwandKategorie: 1, grundschutzRef: 'INF.5.A6' },

  // === Checkliste 11: Sicherheitsmechanismen (8 Fragen) ===
  { id: nextId(), checklistId: 11, questionNumber: 1, questionText: 'Ist eine Firewall am Internet-Uebergang installiert und konfiguriert?', hilfsmittel: 'Die Firewall sollte nur notwendige Verbindungen zulassen.', aufwandKategorie: 1, grundschutzRef: 'NET.3.2.A1' },
  { id: nextId(), checklistId: 11, questionNumber: 2, questionText: 'Werden Firewall-Regeln regelmaessig ueberprueft und aktualisiert?', hilfsmittel: 'Veraltete Regeln erhoehen die Angriffsflaeche.', aufwandKategorie: 2, grundschutzRef: 'NET.3.2.A2' },
  { id: nextId(), checklistId: 11, questionNumber: 3, questionText: 'Ist ein zentraler Virenschutz fuer alle Systeme implementiert?', hilfsmittel: 'Zentrales Management ermoeglicht einheitliche Konfiguration und Ueberwachung.', aufwandKategorie: 2, grundschutzRef: 'OPS.1.1.4.A1' },
  { id: nextId(), checklistId: 11, questionNumber: 4, questionText: 'Werden E-Mails auf Spam und Schadsoftware gefiltert?', hilfsmittel: 'E-Mail-Gateway oder Spam-Filter einsetzen.', aufwandKategorie: 1, grundschutzRef: 'OPS.1.1.4.A2' },
  { id: nextId(), checklistId: 11, questionNumber: 5, questionText: 'Wird verschluesselte Kommunikation (HTTPS, VPN) fuer sensible Daten verwendet?', hilfsmittel: 'Unverschluesselte Uebertragung sensibler Daten vermeiden.', aufwandKategorie: 1, grundschutzRef: 'OPS.1.1.4.A3' },
  { id: nextId(), checklistId: 11, questionNumber: 6, questionText: 'Werden Sicherheitsereignisse (SIEM) zentral erfasst und ausgewertet?', hilfsmittel: 'Zentrales Logging erleichtert die Erkennung von Sicherheitsvorfaellen.', aufwandKategorie: 3, grundschutzRef: 'OPS.1.1.4.A4' },
  { id: nextId(), checklistId: 11, questionNumber: 7, questionText: 'Gibt es einen Prozess zur Bewertung und Behebung von Schwachstellen?', hilfsmittel: 'Regelmaessige Schwachstellenscans und strukturierte Behebung.', aufwandKategorie: 3, grundschutzRef: 'OPS.1.1.4.A5' },
  { id: nextId(), checklistId: 11, questionNumber: 8, questionText: 'Werden Sicherheitsmechanismen regelmaessig getestet (z.B. Penetrationstest)?', hilfsmittel: 'Externe oder interne Tests pruefen die Wirksamkeit der Schutzmassnahmen.', aufwandKategorie: 4, grundschutzRef: 'OPS.1.1.4.A6' },

  // === Checkliste 12: Webserver und Webanwendungen (8 Fragen) ===
  { id: nextId(), checklistId: 12, questionNumber: 1, questionText: 'Werden Webserver und Webanwendungen regelmaessig aktualisiert?', hilfsmittel: 'Patches fuer Webserver, CMS und Frameworks zeitnah einspielen.', aufwandKategorie: 1, grundschutzRef: 'APP.3.2.A1' },
  { id: nextId(), checklistId: 12, questionNumber: 2, questionText: 'Werden HTTPS-Zertifikate fuer alle oeffentlichen Webseiten verwendet?', hilfsmittel: 'SSL/TLS-Zertifikate fuer verschluesselte Verbindungen sind Pflicht.', aufwandKategorie: 1, grundschutzRef: 'APP.3.2.A2' },
  { id: nextId(), checklistId: 12, questionNumber: 3, questionText: 'Sind Webanwendungen gegen gaengige Angriffe geschuetzt (SQL Injection, XSS)?', hilfsmittel: 'OWASP Top 10 als Checkliste fuer Webanwendungssicherheit nutzen.', aufwandKategorie: 3, grundschutzRef: 'APP.3.1.A1' },
  { id: nextId(), checklistId: 12, questionNumber: 4, questionText: 'Werden Eingaben in Webanwendungen validiert und bereinigt?', hilfsmittel: 'Input-Validierung ist die wichtigste Massnahme gegen Injection-Angriffe.', aufwandKategorie: 2, grundschutzRef: 'APP.3.1.A2' },
  { id: nextId(), checklistId: 12, questionNumber: 5, questionText: 'Ist der Zugriff auf die Webserver-Administration eingeschraenkt?', hilfsmittel: 'Admin-Interfaces sollten nicht oeffentlich erreichbar sein.', aufwandKategorie: 1, grundschutzRef: 'APP.3.2.A3' },
  { id: nextId(), checklistId: 12, questionNumber: 6, questionText: 'Werden Webserver-Logdateien regelmaessig ausgewertet?', hilfsmittel: 'Zugriffsprotokolle helfen bei der Erkennung von Angriffen.', aufwandKategorie: 2, grundschutzRef: 'APP.3.2.A4' },
  { id: nextId(), checklistId: 12, questionNumber: 7, questionText: 'Werden Security-Header (CSP, HSTS, X-Frame-Options) konfiguriert?', hilfsmittel: 'HTTP-Security-Header erhoehen die Sicherheit der Webanwendung.', aufwandKategorie: 2, grundschutzRef: 'APP.3.2.A5' },
  { id: nextId(), checklistId: 12, questionNumber: 8, questionText: 'Werden nicht benoetigte Webserver-Module und Beispielseiten entfernt?', hilfsmittel: 'Minimale Installation reduziert die Angriffsflaeche.', aufwandKategorie: 1, grundschutzRef: 'APP.3.2.A6' },

  // === Checkliste 13: Arbeit ausserhalb der Institution (8 Fragen) ===
  { id: nextId(), checklistId: 13, questionNumber: 1, questionText: 'Gibt es eine Richtlinie fuer mobiles Arbeiten und Homeoffice?', hilfsmittel: 'Regelungen zu Datenschutz, Geraetenutzung und Kommunikation im Homeoffice.', aufwandKategorie: 2, grundschutzRef: 'INF.9.A1' },
  { id: nextId(), checklistId: 13, questionNumber: 2, questionText: 'Wird fuer den Fernzugriff eine VPN-Verbindung genutzt?', hilfsmittel: 'VPN verschluesselt die Verbindung zum Unternehmensnetzwerk.', aufwandKategorie: 1, grundschutzRef: 'INF.9.A2' },
  { id: nextId(), checklistId: 13, questionNumber: 3, questionText: 'Sind Geraete fuer mobiles Arbeiten mit Festplattenverschluesselung ausgestattet?', hilfsmittel: 'Verschluesselung schuetzt bei Verlust oder Diebstahl des Geraets.', aufwandKategorie: 2, grundschutzRef: 'INF.9.A3' },
  { id: nextId(), checklistId: 13, questionNumber: 4, questionText: 'Wird Sichtschutz (Blickschutzfolie) bei mobilem Arbeiten verwendet?', hilfsmittel: 'Privacy-Filter verhindern das Mitlesen durch unbefugte Dritte.', aufwandKategorie: 1, grundschutzRef: 'INF.9.A4' },
  { id: nextId(), checklistId: 13, questionNumber: 5, questionText: 'Ist geregelt, wie sensible Unterlagen im Homeoffice aufbewahrt werden?', hilfsmittel: 'Verschlossene Schraenke und Aktenvernichter fuer sensible Dokumente.', aufwandKategorie: 1, grundschutzRef: 'INF.9.A5' },
  { id: nextId(), checklistId: 13, questionNumber: 6, questionText: 'Werden private und dienstliche Nutzung auf mobilen Geraeten getrennt?', hilfsmittel: 'Container-Loesungen oder separate Geraete fuer dienstliche Nutzung.', aufwandKategorie: 2, grundschutzRef: 'INF.9.A6' },
  { id: nextId(), checklistId: 13, questionNumber: 7, questionText: 'Koennen mobile Geraete bei Verlust ferngeloescht werden?', hilfsmittel: 'Mobile Device Management (MDM) ermoeglicht Remote-Wipe.', aufwandKategorie: 2, grundschutzRef: 'INF.9.A7' },
  { id: nextId(), checklistId: 13, questionNumber: 8, questionText: 'Werden oeffentliche WLANs gemieden oder nur mit VPN genutzt?', hilfsmittel: 'Oeffentliche WLANs sind unsicher und sollten nur mit VPN verwendet werden.', aufwandKategorie: 1, grundschutzRef: 'INF.9.A8' },

  // === Checkliste 14: Arbeit innerhalb der Institution / Haustechnik (6 Fragen) ===
  { id: nextId(), checklistId: 14, questionNumber: 1, questionText: 'Ist der Zutritt zum Gebaeude geregelt und kontrolliert?', hilfsmittel: 'Schliessanlage, Besucherregelung und Zutrittsprotokollierung.', aufwandKategorie: 1, grundschutzRef: 'INF.1.A1' },
  { id: nextId(), checklistId: 14, questionNumber: 2, questionText: 'Werden Besucher begleitet und erhalten keinen unbeaufsichtigten Zugang zu IT-Bereichen?', hilfsmittel: 'Besucherrichtlinie mit Anmeldung und Begleitung durch Mitarbeiter.', aufwandKategorie: 1, grundschutzRef: 'INF.1.A2' },
  { id: nextId(), checklistId: 14, questionNumber: 3, questionText: 'Sind Verkabelung und IT-Infrastruktur gegen physische Beschaedigung geschuetzt?', hilfsmittel: 'Kabelkanaele, Leerrohre und zugangsbeschraenkte Verteilerschraenke.', aufwandKategorie: 2, grundschutzRef: 'INF.1.A3' },
  { id: nextId(), checklistId: 14, questionNumber: 4, questionText: 'Gibt es einen Brandschutzplan und werden Brandschutzuebungen durchgefuehrt?', hilfsmittel: 'Fluchtplaene, Brandschutzbeauftragte und regelmaessige Uebungen.', aufwandKategorie: 2, grundschutzRef: 'INF.1.A4' },
  { id: nextId(), checklistId: 14, questionNumber: 5, questionText: 'Ist die Stromversorgung fuer kritische IT-Systeme abgesichert?', hilfsmittel: 'USV und Notstromaggregat fuer geschaeftskritische Systeme.', aufwandKategorie: 3, grundschutzRef: 'INF.1.A5' },
  { id: nextId(), checklistId: 14, questionNumber: 6, questionText: 'Wird die Clean-Desk-Policy eingehalten (aufgeraeumter Arbeitsplatz)?', hilfsmittel: 'Sensible Unterlagen werden bei Abwesenheit weggeschlossen.', aufwandKategorie: 1, grundschutzRef: 'INF.1.A6' },

  // === Checkliste 15: Mobile Endgeraete (8 Fragen) ===
  { id: nextId(), checklistId: 15, questionNumber: 1, questionText: 'Werden mobile Endgeraete zentral verwaltet (MDM/EMM)?', hilfsmittel: 'Mobile Device Management ermoeglicht zentrale Konfiguration und Sicherheit.', aufwandKategorie: 3, grundschutzRef: 'SYS.3.2.1.A1' },
  { id: nextId(), checklistId: 15, questionNumber: 2, questionText: 'Sind alle mobilen Geraete mit einer PIN/Passwort-Sperre geschuetzt?', hilfsmittel: 'Mindestens 6-stellige PIN oder biometrische Authentifizierung.', aufwandKategorie: 1, grundschutzRef: 'SYS.3.2.1.A2' },
  { id: nextId(), checklistId: 15, questionNumber: 3, questionText: 'Werden Betriebssystem-Updates auf mobilen Geraeten zeitnah installiert?', hilfsmittel: 'Automatische Updates aktivieren und Geraete mit Herstellerunterstuetzung einsetzen.', aufwandKategorie: 1, grundschutzRef: 'SYS.3.2.1.A3' },
  { id: nextId(), checklistId: 15, questionNumber: 4, questionText: 'Ist die Installation von Apps auf dienstlichen Geraeten eingeschraenkt?', hilfsmittel: 'Nur freigegebene Apps aus offiziellen Stores zulassen.', aufwandKategorie: 2, grundschutzRef: 'SYS.3.2.1.A4' },
  { id: nextId(), checklistId: 15, questionNumber: 5, questionText: 'Sind mobile Geraete verschluesselt (Geraeteverschluesselung)?', hilfsmittel: 'Moderne Smartphones bieten standardmaessig Verschluesselung, die aktiviert sein muss.', aufwandKategorie: 1, grundschutzRef: 'SYS.3.2.1.A5' },
  { id: nextId(), checklistId: 15, questionNumber: 6, questionText: 'Koennen verlorene oder gestohlene Geraete ferngesperrt und ferngeloescht werden?', hilfsmittel: 'Remote-Lock und Remote-Wipe ueber MDM oder Hersteller-Dienste.', aufwandKategorie: 2, grundschutzRef: 'SYS.3.2.1.A6' },
  { id: nextId(), checklistId: 15, questionNumber: 7, questionText: 'Gibt es Regelungen fuer die Nutzung von Cloud-Diensten auf mobilen Geraeten?', hilfsmittel: 'Cloud-Speicher und -Dienste fuer dienstliche Daten regulieren.', aufwandKategorie: 2, grundschutzRef: 'SYS.3.2.1.A7' },
  { id: nextId(), checklistId: 15, questionNumber: 8, questionText: 'Werden mobile Geraete bei Verlust oder Diebstahl gemeldet und gesperrt?', hilfsmittel: 'Ein Meldeprozess mit sofortiger Sperre sollte etabliert sein.', aufwandKategorie: 1, grundschutzRef: 'SYS.3.2.1.A8' },

  // === Checkliste 16: Outsourcing und Cloud (8 Fragen) ===
  { id: nextId(), checklistId: 16, questionNumber: 1, questionText: 'Werden Cloud-Dienste nur nach vorheriger Sicherheitsbewertung eingesetzt?', hilfsmittel: 'Bewertung nach Datenschutz, Sicherheit, Verfuegbarkeit und Standort.', aufwandKategorie: 2, grundschutzRef: 'OPS.2.2.A1' },
  { id: nextId(), checklistId: 16, questionNumber: 2, questionText: 'Ist vertraglich geregelt, wie der Cloud-Anbieter mit Ihren Daten umgeht?', hilfsmittel: 'Auftragsverarbeitungsvertrag (AVV) und SLA vereinbaren.', aufwandKategorie: 2, grundschutzRef: 'OPS.2.2.A2' },
  { id: nextId(), checklistId: 16, questionNumber: 3, questionText: 'Werden Daten in der Cloud verschluesselt gespeichert?', hilfsmittel: 'Verschluesselung at rest und in transit sicherstellen.', aufwandKategorie: 2, grundschutzRef: 'OPS.2.2.A3' },
  { id: nextId(), checklistId: 16, questionNumber: 4, questionText: 'Ist bekannt, in welchem Land die Cloud-Daten gespeichert werden?', hilfsmittel: 'EU-Standorte bevorzugen fuer DSGVO-Konformitaet.', aufwandKategorie: 1, grundschutzRef: 'OPS.2.2.A4' },
  { id: nextId(), checklistId: 16, questionNumber: 5, questionText: 'Gibt es eine Exit-Strategie fuer den Wechsel des Cloud-Anbieters?', hilfsmittel: 'Datenportabilitaet und Kuendigungsfristen beruecksichtigen.', aufwandKategorie: 3, grundschutzRef: 'OPS.2.2.A5' },
  { id: nextId(), checklistId: 16, questionNumber: 6, questionText: 'Werden Zugriffsrechte auf Cloud-Dienste regelmaessig ueberprueft?', hilfsmittel: 'Berechtigungsreviews auch fuer Cloud-Konten durchfuehren.', aufwandKategorie: 2, grundschutzRef: 'OPS.2.2.A6' },
  { id: nextId(), checklistId: 16, questionNumber: 7, questionText: 'Ist Multi-Faktor-Authentifizierung fuer Cloud-Dienste aktiviert?', hilfsmittel: 'MFA reduziert das Risiko von Kontouebernahmen erheblich.', aufwandKategorie: 1, grundschutzRef: 'OPS.2.2.A7' },
  { id: nextId(), checklistId: 16, questionNumber: 8, questionText: 'Werden IT-Dienstleister und Outsourcing-Partner regelmaessig auditiert?', hilfsmittel: 'Jaehrliche Ueberpruefung der Dienstleisterqualitaet und Sicherheit.', aufwandKategorie: 3, grundschutzRef: 'OPS.2.2.A8' },

  // === Checkliste 17: Umgang mit Informationen (6 Fragen) ===
  { id: nextId(), checklistId: 17, questionNumber: 1, questionText: 'Gibt es eine Klassifizierung von Informationen nach Schutzbedarf?', hilfsmittel: 'Einteilung in oeffentlich, intern, vertraulich, streng vertraulich.', aufwandKategorie: 2, grundschutzRef: 'CON.1.A1' },
  { id: nextId(), checklistId: 17, questionNumber: 2, questionText: 'Werden vertrauliche Informationen verschluesselt uebertragen und gespeichert?', hilfsmittel: 'E-Mail-Verschluesselung, verschluesselte Dateiablage und sichere Messenger.', aufwandKategorie: 2, grundschutzRef: 'CON.1.A2' },
  { id: nextId(), checklistId: 17, questionNumber: 3, questionText: 'Werden Datenschutzvorgaben (DSGVO) bei der Verarbeitung personenbezogener Daten eingehalten?', hilfsmittel: 'Verarbeitungsverzeichnis, Datenschutzbeauftragter und Loeschkonzept.', aufwandKategorie: 2, grundschutzRef: 'CON.2.A1' },
  { id: nextId(), checklistId: 17, questionNumber: 4, questionText: 'Werden Daten am Ende ihres Lebenszyklus sicher geloescht?', hilfsmittel: 'Sichere Loeschverfahren und Nachweis der Loeschung.', aufwandKategorie: 2, grundschutzRef: 'CON.1.A3' },
  { id: nextId(), checklistId: 17, questionNumber: 5, questionText: 'Ist geregelt, welche Informationen ueber welche Kanaele geteilt werden duerfen?', hilfsmittel: 'Kommunikationsrichtlinie fuer E-Mail, Messenger, Social Media.', aufwandKategorie: 2, grundschutzRef: 'CON.1.A4' },
  { id: nextId(), checklistId: 17, questionNumber: 6, questionText: 'Werden Mitarbeiter zum sicheren Umgang mit sensiblen Informationen geschult?', hilfsmittel: 'Regelmaessige Schulungen zu Datenschutz und Informationssicherheit.', aufwandKategorie: 2, grundschutzRef: 'CON.2.A2' },

  // === Checkliste 18: Drucker / Multifunktionsgeraete (6 Fragen) ===
  { id: nextId(), checklistId: 18, questionNumber: 1, questionText: 'Werden Standard-Passwoerter bei Druckern und Multifunktionsgeraeten geaendert?', hilfsmittel: 'Default-Passwoerter der Hersteller sind oeffentlich bekannt.', aufwandKategorie: 1, grundschutzRef: 'SYS.4.1.A1' },
  { id: nextId(), checklistId: 18, questionNumber: 2, questionText: 'Ist der Netzwerkzugriff auf Drucker eingeschraenkt?', hilfsmittel: 'Drucker sollten nicht direkt aus dem Internet erreichbar sein.', aufwandKategorie: 1, grundschutzRef: 'SYS.4.1.A2' },
  { id: nextId(), checklistId: 18, questionNumber: 3, questionText: 'Wird die Firmware von Druckern regelmaessig aktualisiert?', hilfsmittel: 'Firmware-Updates schliessen Sicherheitsluecken in Druckern.', aufwandKategorie: 2, grundschutzRef: 'SYS.4.1.A3' },
  { id: nextId(), checklistId: 18, questionNumber: 4, questionText: 'Werden ausgedruckte vertrauliche Dokumente nicht offen im Drucker liegen gelassen?', hilfsmittel: 'Pull-Printing oder abgesichertes Drucken (Ausdruck erst nach Authentifizierung).', aufwandKategorie: 1, grundschutzRef: 'SYS.4.1.A4' },
  { id: nextId(), checklistId: 18, questionNumber: 5, questionText: 'Werden Festplatten in Druckern/Kopierern bei Entsorgung sicher geloescht?', hilfsmittel: 'Viele moderne Drucker haben interne Speicher, die Druckauftraege vorhalten.', aufwandKategorie: 2, grundschutzRef: 'SYS.4.1.A5' },
  { id: nextId(), checklistId: 18, questionNumber: 6, questionText: 'Sind nicht benoetigte Funktionen (Fax, WLAN, USB) am Drucker deaktiviert?', hilfsmittel: 'Deaktivieren Sie Schnittstellen und Protokolle, die nicht gebraucht werden.', aufwandKategorie: 1, grundschutzRef: 'SYS.4.1.A6' },

  // === Checkliste 19: Telefonie und Fax (5 Fragen) ===
  { id: nextId(), checklistId: 19, questionNumber: 1, questionText: 'Werden Standard-Passwoerter an Telefonanlagen geaendert?', hilfsmittel: 'Default-Passwoerter bei TK-Anlagen und VoIP-Telefonen aendern.', aufwandKategorie: 1, grundschutzRef: 'NET.4.1.A1' },
  { id: nextId(), checklistId: 19, questionNumber: 2, questionText: 'Ist die Telefonanlage gegen unbefugten Zugriff geschuetzt?', hilfsmittel: 'Administrativer Zugang nur fuer autorisierte Personen.', aufwandKategorie: 1, grundschutzRef: 'NET.4.1.A2' },
  { id: nextId(), checklistId: 19, questionNumber: 3, questionText: 'Werden VoIP-Gespraeche verschluesselt (SRTP/TLS)?', hilfsmittel: 'Unverschluesselte VoIP-Gespraeche koennen abgehoert werden.', aufwandKategorie: 2, grundschutzRef: 'NET.4.2.A1' },
  { id: nextId(), checklistId: 19, questionNumber: 4, questionText: 'Ist die VoIP-Infrastruktur vom restlichen Netzwerk getrennt (VLAN)?', hilfsmittel: 'Netzwerksegmentierung schuetzt die Sprachkommunikation.', aufwandKategorie: 2, grundschutzRef: 'NET.4.2.A2' },
  { id: nextId(), checklistId: 19, questionNumber: 5, questionText: 'Werden Faxnachrichten mit sensiblen Inhalten zeitnah aus dem Geraet entnommen?', hilfsmittel: 'Faxe nicht unbeaufsichtigt im Ausgabefach liegen lassen.', aufwandKategorie: 1, grundschutzRef: 'NET.4.1.A3' },
]
