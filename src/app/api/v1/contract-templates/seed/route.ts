import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { db } from '@/lib/db'
import { contractTemplates, contractClauses } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// System Templates
// ---------------------------------------------------------------------------

const SYSTEM_TEMPLATES = [
  {
    name: 'IT-Dienstleistungsvertrag',
    category: 'it_service',
    description: 'Vertrag fuer Managed Services, IT-Support und Wartung mit SLA',
    bodyHtml: `<h1>IT-Dienstleistungsvertrag</h1>

<h2>&sect; 1 Praeambel</h2>
<p>Zwischen <strong>{{firmenname_auftraggeber}}</strong> (nachfolgend &bdquo;Auftraggeber&ldquo;) und <strong>{{firmenname_auftragnehmer}}</strong> (nachfolgend &bdquo;Auftragnehmer&ldquo;) wird folgender Vertrag ueber die Erbringung von IT-Dienstleistungen geschlossen. Die Vertragsparteien streben eine langfristige, partnerschaftliche Zusammenarbeit an.</p>

<h2>&sect; 2 Leistungsumfang</h2>
<p>Der Auftragnehmer erbringt fuer den Auftraggeber IT-Dienstleistungen im Bereich Managed Services, IT-Support und Wartung gemaess der in Anlage 1 definierten Leistungsbeschreibung. Der Leistungsumfang umfasst insbesondere die Ueberwachung, Wartung und Instandhaltung der vereinbarten IT-Systeme sowie die Behebung von Stoerungen innerhalb der vereinbarten Reaktionszeiten.</p>

<h2>&sect; 3 Service Level Agreement (SLA)</h2>
<p>Der Auftragnehmer garantiert eine Systemverfuegbarkeit von mindestens 99,5 % pro Kalendermonat. Stoerungen der Prioritaet 1 (Systemausfall) werden innerhalb von 2 Stunden bearbeitet, Stoerungen der Prioritaet 2 (eingeschraenkter Betrieb) innerhalb von 8 Stunden. Die Reaktionszeiten gelten innerhalb der vereinbarten Servicezeiten (Mo-Fr, 08:00-18:00 Uhr).</p>

<h2>&sect; 4 Verguetung</h2>
<p>Der Auftraggeber zahlt dem Auftragnehmer eine monatliche Verguetung in Hoehe von <strong>{{monatliche_verguetung}}</strong> EUR zzgl. gesetzlicher Mehrwertsteuer. Die Zahlung ist jeweils zum 15. des Folgemonats faellig. Zusaetzliche Leistungen ausserhalb des vereinbarten Umfangs werden nach Aufwand zu den in Anlage 2 festgelegten Stundensaetzen abgerechnet.</p>

<h2>&sect; 5 Laufzeit und Kuendigung</h2>
<p>Der Vertrag beginnt am <strong>{{vertragsbeginn}}</strong> und hat eine Mindestlaufzeit von <strong>{{laufzeit_monate}}</strong> Monaten. Er verlaengert sich automatisch um jeweils 12 Monate, sofern er nicht mit einer Frist von <strong>{{kuendigungsfrist_tage}}</strong> Tagen zum Ende der jeweiligen Laufzeit gekuendigt wird. Das Recht zur ausserordentlichen Kuendigung aus wichtigem Grund bleibt unberuehrt.</p>

<h2>&sect; 6 Haftung</h2>
<p>Die Haftung des Auftragnehmers ist auf Vorsatz und grobe Fahrlaessigkeit beschraenkt. Bei leichter Fahrlaessigkeit haftet der Auftragnehmer nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten), begrenzt auf den vertragstypisch vorhersehbaren Schaden, maximal jedoch auf die jaehrliche Nettoauftragssumme.</p>

<h2>&sect; 7 Datenschutz</h2>
<p>Sofern der Auftragnehmer im Rahmen der Leistungserbringung personenbezogene Daten im Auftrag des Auftraggebers verarbeitet, schliessen die Parteien eine gesonderte Vereinbarung zur Auftragsverarbeitung gemaess Art. 28 DSGVO. Der Auftragnehmer verpflichtet sich, die einschlaegigen Datenschutzbestimmungen einzuhalten.</p>

<h2>&sect; 8 Schlussbestimmungen</h2>
<p>Aenderungen und Ergaenzungen dieses Vertrages beduerfen der Schriftform. Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der uebrigen Bestimmungen unberuehrt. Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist der Sitz des Auftraggebers.</p>`,
    placeholders: [
      { key: 'firmenname_auftraggeber', label: 'Auftraggeber', type: 'text', required: true },
      { key: 'firmenname_auftragnehmer', label: 'Auftragnehmer', type: 'text', required: true },
      { key: 'vertragsbeginn', label: 'Vertragsbeginn', type: 'date', required: true },
      { key: 'laufzeit_monate', label: 'Laufzeit (Monate)', type: 'number', required: true },
      { key: 'kuendigungsfrist_tage', label: 'Kuendigungsfrist (Tage)', type: 'number', required: true },
      { key: 'monatliche_verguetung', label: 'Monatliche Verguetung (EUR)', type: 'number', required: true },
    ],
    isSystem: true,
  },
  {
    name: 'Beratungsvertrag',
    category: 'consulting',
    description: 'Vertrag fuer Unternehmensberatung, Consulting und Projektbegleitung auf Stunden- oder Projektbasis',
    bodyHtml: `<h1>Beratungsvertrag</h1>

<h2>&sect; 1 Praeambel</h2>
<p>Zwischen <strong>{{firmenname_auftraggeber}}</strong> (nachfolgend &bdquo;Auftraggeber&ldquo;) und <strong>{{firmenname_berater}}</strong> (nachfolgend &bdquo;Berater&ldquo;) wird folgender Beratungsvertrag geschlossen. Gegenstand ist die Erbringung von Beratungsleistungen im Bereich <strong>{{beratungsbereich}}</strong>.</p>

<h2>&sect; 2 Leistungsbeschreibung</h2>
<p>Der Berater erbringt fuer den Auftraggeber Beratungsleistungen gemaess der in Anlage 1 beschriebenen Aufgabenstellung. Die Leistungen umfassen insbesondere Analyse, Konzeption, Empfehlungen und Begleitung bei der Umsetzung. Der Berater ist in der Gestaltung seiner Arbeitszeit und seines Arbeitsortes frei, soweit die vertraglichen Termine eingehalten werden.</p>

<h2>&sect; 3 Verguetung</h2>
<p>Die Verguetung erfolgt auf Basis eines Stundensatzes von <strong>{{stundensatz}}</strong> EUR zzgl. gesetzlicher Mehrwertsteuer. Der Berater erstellt monatliche Taetigkeitsnachweise, die vom Auftraggeber innerhalb von 5 Werktagen freizugeben sind. Die Rechnungsstellung erfolgt monatlich mit einem Zahlungsziel von <strong>{{zahlungsziel_tage}}</strong> Tagen.</p>

<h2>&sect; 4 Mitwirkungspflichten</h2>
<p>Der Auftraggeber stellt dem Berater alle fuer die Leistungserbringung erforderlichen Unterlagen, Informationen und Zugaenge rechtzeitig und kostenfrei zur Verfuegung. Er benennt einen fachlichen Ansprechpartner, der fuer Rueckfragen und Abstimmungen erreichbar ist. Verstoesse gegen die Mitwirkungspflichten koennen zu Terminverschiebungen fuehren.</p>

<h2>&sect; 5 Vertraulichkeit</h2>
<p>Der Berater verpflichtet sich, alle im Rahmen des Auftrags erlangten vertraulichen Informationen streng vertraulich zu behandeln und nicht an Dritte weiterzugeben. Diese Pflicht besteht auch nach Beendigung des Vertrages fuer einen Zeitraum von 3 Jahren fort. Ausgenommen sind Informationen, die oeffentlich bekannt oder dem Berater bereits vor der Zusammenarbeit bekannt waren.</p>

<h2>&sect; 6 Laufzeit und Kuendigung</h2>
<p>Der Vertrag beginnt am <strong>{{vertragsbeginn}}</strong> und laeuft ueber einen Zeitraum von <strong>{{laufzeit_monate}}</strong> Monaten. Beide Parteien koennen den Vertrag mit einer Frist von <strong>{{kuendigungsfrist_tage}}</strong> Tagen zum Monatsende kuendigen. Bereits erbrachte Leistungen sind in jedem Fall zu vergueten.</p>

<h2>&sect; 7 Haftung und Gewaehrleistung</h2>
<p>Der Berater haftet fuer Schaeden nur bei Vorsatz und grober Fahrlaessigkeit. Die Haftung bei leichter Fahrlaessigkeit ist auf die Hoehe der vereinbarten Verguetung begrenzt. Beratungsergebnisse stellen Empfehlungen dar; die Entscheidung ueber deren Umsetzung obliegt dem Auftraggeber.</p>

<h2>&sect; 8 Schlussbestimmungen</h2>
<p>Nebenabreden und Aenderungen beduerfen der Schriftform. Es gilt deutsches Recht. Gerichtsstand ist der Sitz des Auftraggebers, sofern der Berater Kaufmann ist.</p>`,
    placeholders: [
      { key: 'firmenname_auftraggeber', label: 'Auftraggeber', type: 'text', required: true },
      { key: 'firmenname_berater', label: 'Berater', type: 'text', required: true },
      { key: 'beratungsbereich', label: 'Beratungsbereich', type: 'text', required: true },
      { key: 'vertragsbeginn', label: 'Vertragsbeginn', type: 'date', required: true },
      { key: 'laufzeit_monate', label: 'Laufzeit (Monate)', type: 'number', required: true },
      { key: 'kuendigungsfrist_tage', label: 'Kuendigungsfrist (Tage)', type: 'number', required: true },
      { key: 'stundensatz', label: 'Stundensatz (EUR)', type: 'number', required: true },
      { key: 'zahlungsziel_tage', label: 'Zahlungsziel (Tage)', type: 'number', required: true },
    ],
    isSystem: true,
  },
  {
    name: 'Softwareentwicklungsvertrag',
    category: 'software_dev',
    description: 'Werkvertrag fuer Softwareentwicklung mit agilen Meilensteinen, Abnahme und IP-Rechten',
    bodyHtml: `<h1>Softwareentwicklungsvertrag</h1>

<h2>&sect; 1 Praeambel</h2>
<p>Zwischen <strong>{{firmenname_auftraggeber}}</strong> (nachfolgend &bdquo;Auftraggeber&ldquo;) und <strong>{{firmenname_auftragnehmer}}</strong> (nachfolgend &bdquo;Auftragnehmer&ldquo;) wird folgender Werkvertrag ueber die Entwicklung von Software geschlossen. Die zu entwickelnde Software ist in der Spezifikation (Anlage 1) naeher beschrieben.</p>

<h2>&sect; 2 Leistungsgegenstand</h2>
<p>Der Auftragnehmer entwickelt fuer den Auftraggeber eine Softwareloesung gemaess den in Anlage 1 festgelegten Anforderungen. Die Entwicklung erfolgt in agilen Iterationen (Sprints) mit einer Dauer von jeweils 2 Wochen. Nach jedem Sprint wird dem Auftraggeber ein funktionsfaehiges Inkrement zur Begutachtung vorgestellt.</p>

<h2>&sect; 3 Meilensteine und Zeitplan</h2>
<p>Die Entwicklung gliedert sich in die in Anlage 2 definierten Meilensteine. Der Auftragnehmer informiert den Auftraggeber unverzueglich, wenn absehbar ist, dass ein Meilenstein nicht termingerecht erreicht werden kann. Die Gesamtfertigstellung ist bis zum <strong>{{fertigstellungsdatum}}</strong> vorgesehen.</p>

<h2>&sect; 4 Abnahme</h2>
<p>Nach Fertigstellung der Software fuehrt der Auftraggeber eine Abnahme durch. Er hat die Software innerhalb von <strong>{{abnahmefrist_tage}}</strong> Tagen nach Bereitstellung zu pruefen und etwaige Maengel schriftlich zu ruegen. Die Abnahme gilt als erklaert, wenn der Auftraggeber die Software produktiv einsetzt oder die Abnahmefrist ohne Ruege verstreicht. Wesentliche Maengel berechtigen zur Verweigerung der Abnahme.</p>

<h2>&sect; 5 Verguetung</h2>
<p>Die Gesamtverguetung betraegt <strong>{{gesamtverguetung}}</strong> EUR zzgl. gesetzlicher Mehrwertsteuer. Die Zahlung erfolgt in Teilbetraegen, die an die Erreichung der Meilensteine gemaess Anlage 2 gekoppelt sind. Die Schlusszahlung in Hoehe von 20 % wird nach erfolgter Abnahme faellig.</p>

<h2>&sect; 6 Nutzungsrechte und geistiges Eigentum</h2>
<p>Mit vollstaendiger Bezahlung der Verguetung uebertraegt der Auftragnehmer dem Auftraggeber die ausschliesslichen, zeitlich und raeumlich unbeschraenkten Nutzungsrechte an der entwickelten Software. Vorbestehende Rechte des Auftragnehmers an Bibliotheken und Frameworks bleiben hiervon unberuehrt; an diesen wird ein einfaches Nutzungsrecht eingeraeumt.</p>

<h2>&sect; 7 Gewaehrleistung</h2>
<p>Der Auftragnehmer gewaehrleistet, dass die Software den vereinbarten Spezifikationen entspricht. Die Gewaehrleistungsfrist betraegt 12 Monate ab Abnahme. Maengel werden vom Auftragnehmer im Rahmen der Nacherfuellung kostenfrei beseitigt.</p>

<h2>&sect; 8 Schlussbestimmungen</h2>
<p>Dieser Vertrag unterliegt deutschem Recht. Aenderungen beduerfen der Schriftform. Gerichtsstand ist der Sitz des Auftraggebers. Sollten einzelne Bestimmungen unwirksam sein, wird der Vertrag im Uebrigen hiervon nicht beruehrt.</p>`,
    placeholders: [
      { key: 'firmenname_auftraggeber', label: 'Auftraggeber', type: 'text', required: true },
      { key: 'firmenname_auftragnehmer', label: 'Auftragnehmer', type: 'text', required: true },
      { key: 'fertigstellungsdatum', label: 'Fertigstellungsdatum', type: 'date', required: true },
      { key: 'abnahmefrist_tage', label: 'Abnahmefrist (Tage)', type: 'number', required: true },
      { key: 'gesamtverguetung', label: 'Gesamtverguetung (EUR)', type: 'number', required: true },
    ],
    isSystem: true,
  },
  {
    name: 'Hosting/SaaS-Vertrag',
    category: 'hosting_saas',
    description: 'Vertrag fuer Cloud-Hosting, SaaS-Dienste mit Verfuegbarkeits-SLA, Datenstandort und DSGVO-Konformitaet',
    bodyHtml: `<h1>Hosting/SaaS-Vertrag</h1>

<h2>&sect; 1 Praeambel</h2>
<p>Zwischen <strong>{{firmenname_auftraggeber}}</strong> (nachfolgend &bdquo;Auftraggeber&ldquo;) und <strong>{{firmenname_anbieter}}</strong> (nachfolgend &bdquo;Anbieter&ldquo;) wird folgender Vertrag ueber die Bereitstellung von Cloud-/SaaS-Diensten geschlossen. Der Anbieter betreibt die Plattform <strong>{{plattformname}}</strong> und stellt diese dem Auftraggeber zur Nutzung bereit.</p>

<h2>&sect; 2 Leistungsbeschreibung</h2>
<p>Der Anbieter stellt dem Auftraggeber die in Anlage 1 naeher beschriebenen SaaS-Dienste ueber das Internet zur Verfuegung. Der Zugang erfolgt ueber verschluesselte Verbindungen (TLS 1.2 oder hoeher). Der Anbieter uebernimmt Betrieb, Wartung, Monitoring und regelmaessige Updates der Plattform.</p>

<h2>&sect; 3 Verfuegbarkeit und SLA</h2>
<p>Der Anbieter garantiert eine Verfuegbarkeit der Dienste von mindestens <strong>{{verfuegbarkeit_prozent}}</strong> % pro Kalendermonat, gemessen am Gesamtzeitraum abzueglich geplanter Wartungsfenster. Geplante Wartungen werden mindestens 5 Werktage im Voraus angekuendigt. Bei Unterschreitung der vereinbarten Verfuegbarkeit erhaelt der Auftraggeber Service Credits gemaess Anlage 2.</p>

<h2>&sect; 4 Datenstandort und Datensicherheit</h2>
<p>Saemtliche Daten des Auftraggebers werden ausschliesslich in Rechenzentren innerhalb der Europaeischen Union gespeichert und verarbeitet. Der Anbieter setzt dem Stand der Technik entsprechende technische und organisatorische Massnahmen zum Schutz der Daten ein, insbesondere Verschluesselung, Zugangskontrollen und regelmaessige Sicherheitsaudits.</p>

<h2>&sect; 5 Datenschutz und DSGVO</h2>
<p>Der Anbieter verarbeitet personenbezogene Daten ausschliesslich im Auftrag und auf Weisung des Auftraggebers gemaess Art. 28 DSGVO. Die Parteien schliessen hierzu eine Auftragsverarbeitungsvereinbarung (AVV) gemaess Anlage 3. Der Einsatz von Unterauftragsverarbeitern bedarf der vorherigen schriftlichen Zustimmung des Auftraggebers.</p>

<h2>&sect; 6 Verguetung</h2>
<p>Der Auftraggeber zahlt eine monatliche Nutzungsgebuehr von <strong>{{monatliche_gebuehr}}</strong> EUR zzgl. gesetzlicher Mehrwertsteuer fuer <strong>{{anzahl_nutzer}}</strong> Nutzerlizenzen. Die Abrechnung erfolgt monatlich im Voraus. Preisanpassungen sind mit einer Ankuendigungsfrist von 3 Monaten zum Jahresende zulassig.</p>

<h2>&sect; 7 Laufzeit und Kuendigung</h2>
<p>Der Vertrag beginnt am <strong>{{vertragsbeginn}}</strong> und hat eine Mindestlaufzeit von <strong>{{laufzeit_monate}}</strong> Monaten. Die Kuendigungsfrist betraegt <strong>{{kuendigungsfrist_tage}}</strong> Tage zum Ende der Vertragslaufzeit. Nach Vertragsende stellt der Anbieter dem Auftraggeber saemtliche Daten in einem gaengigen Format zur Verfuegung und loescht diese nach Bestaetigung unwiderruflich.</p>

<h2>&sect; 8 Schlussbestimmungen</h2>
<p>Es gilt das Recht der Bundesrepublik Deutschland. Aenderungen beduerfen der Schriftform. Gerichtsstand ist der Sitz des Auftraggebers. Die Unwirksamkeit einzelner Bestimmungen beruehrt die Wirksamkeit des uebrigen Vertrages nicht.</p>`,
    placeholders: [
      { key: 'firmenname_auftraggeber', label: 'Auftraggeber', type: 'text', required: true },
      { key: 'firmenname_anbieter', label: 'Anbieter', type: 'text', required: true },
      { key: 'plattformname', label: 'Plattformname', type: 'text', required: true },
      { key: 'vertragsbeginn', label: 'Vertragsbeginn', type: 'date', required: true },
      { key: 'laufzeit_monate', label: 'Laufzeit (Monate)', type: 'number', required: true },
      { key: 'kuendigungsfrist_tage', label: 'Kuendigungsfrist (Tage)', type: 'number', required: true },
      { key: 'monatliche_gebuehr', label: 'Monatliche Gebuehr (EUR)', type: 'number', required: true },
      { key: 'anzahl_nutzer', label: 'Anzahl Nutzer', type: 'number', required: true },
      { key: 'verfuegbarkeit_prozent', label: 'Verfuegbarkeit (%)', type: 'number', required: true },
    ],
    isSystem: true,
  },
]

// ---------------------------------------------------------------------------
// System Clauses (3 per category, 8 categories = 24)
// ---------------------------------------------------------------------------

const SYSTEM_CLAUSES = [
  // --- general ---
  { category: 'general', name: 'Praeambel', sortOrder: 1, bodyHtml: '<p>Die nachfolgenden Vertragsparteien schliessen diesen Vertrag in gegenseitigem Einverstaendnis und im Bewusstsein der sich daraus ergebenden Rechte und Pflichten. Dieser Vertrag regelt die Zusammenarbeit der Parteien und bildet die Grundlage fuer alle hieraus resultierenden Leistungsbeziehungen.</p>', isSystem: true },
  { category: 'general', name: 'Vertragsgegenstand', sortOrder: 2, bodyHtml: '<p>Gegenstand dieses Vertrages ist die Erbringung der in der Leistungsbeschreibung (Anlage 1) naeher definierten Leistungen durch den Auftragnehmer. Art, Umfang und Qualitaet der Leistungen ergeben sich aus den vertraglichen Vereinbarungen einschliesslich aller Anlagen.</p>', isSystem: true },
  { category: 'general', name: 'Definitionen', sortOrder: 3, bodyHtml: '<p>Im Sinne dieses Vertrages gelten folgende Definitionen: &bdquo;Vertrauliche Informationen&ldquo; sind alle nicht oeffentlich zugaenglichen Geschaefts- und Betriebsgeheimnisse. &bdquo;Personenbezogene Daten&ldquo; sind Daten im Sinne von Art. 4 Nr. 1 DSGVO. &bdquo;Werktage&ldquo; sind Montag bis Freitag, ausgenommen gesetzliche Feiertage am Erfuellungsort.</p>', isSystem: true },

  // --- liability ---
  { category: 'liability', name: 'Haftungsbegrenzung', sortOrder: 1, bodyHtml: '<p>Die Haftung der Vertragsparteien ist auf Vorsatz und grobe Fahrlaessigkeit beschraenkt. Bei leichter Fahrlaessigkeit haften die Parteien nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten), begrenzt auf den vertragstypisch vorhersehbaren Schaden. Die Haftung fuer Personenschaeden und nach dem Produkthaftungsgesetz bleibt unberuehrt.</p>', isSystem: true },
  { category: 'liability', name: 'Hoehere Gewalt', sortOrder: 2, bodyHtml: '<p>Keine Vertragspartei haftet fuer die Nichterfuellung oder verzoegerte Erfuellung vertraglicher Pflichten, soweit dies auf hoehere Gewalt zurueckzufuehren ist. Als hoehere Gewalt gelten insbesondere Naturkatastrophen, Krieg, Epidemien, behoerdliche Anordnungen sowie Ausfaelle oeffentlicher Kommunikationsnetze. Die betroffene Partei hat die andere Partei unverzueglich zu informieren.</p>', isSystem: true },
  { category: 'liability', name: 'Freistellung', sortOrder: 3, bodyHtml: '<p>Jede Vertragspartei stellt die andere Partei von saemtlichen Anspruechen Dritter frei, die aus einer schuldhaften Verletzung der vertraglichen Pflichten der freistellenden Partei resultieren. Die Freistellung umfasst auch die angemessenen Kosten der Rechtsverteidigung. Die freistellende Partei ist unverzueglich ueber Ansprueche Dritter zu informieren.</p>', isSystem: true },

  // --- termination ---
  { category: 'termination', name: 'Ordentliche Kuendigung', sortOrder: 1, bodyHtml: '<p>Der Vertrag kann von jeder Partei unter Einhaltung der vereinbarten Kuendigungsfrist zum Ende der jeweiligen Vertragslaufzeit ordentlich gekuendigt werden. Die Kuendigung bedarf der Schriftform. Massgeblich fuer die Rechtzeitigkeit ist der Zugang der Kuendigungserklaerung bei der anderen Partei.</p>', isSystem: true },
  { category: 'termination', name: 'Ausserordentliche Kuendigung', sortOrder: 2, bodyHtml: '<p>Das Recht zur ausserordentlichen Kuendigung aus wichtigem Grund bleibt unberuehrt. Ein wichtiger Grund liegt insbesondere vor, wenn eine Partei wesentliche Vertragspflichten trotz schriftlicher Abmahnung und angemessener Nachfristsetzung wiederholt verletzt oder ueber das Vermoegen einer Partei ein Insolvenzverfahren eroeffnet oder mangels Masse abgelehnt wird.</p>', isSystem: true },
  { category: 'termination', name: 'Uebergangsregelungen', sortOrder: 3, bodyHtml: '<p>Bei Beendigung des Vertrages unterstuetzt der Auftragnehmer den Auftraggeber fuer einen Zeitraum von bis zu 3 Monaten bei der Migration auf einen Nachfolgedienst (Transition). Die Verguetung fuer Uebergangsleistungen richtet sich nach den vertraglich vereinbarten Saetzen. Alle Daten und Unterlagen sind innerhalb von 30 Tagen nach Vertragsende herauszugeben.</p>', isSystem: true },

  // --- payment ---
  { category: 'payment', name: 'Verguetung und Faelligkeit', sortOrder: 1, bodyHtml: '<p>Die Verguetung richtet sich nach den vertraglich vereinbarten Konditionen. Rechnungen sind innerhalb von 30 Tagen nach Zugang ohne Abzug zur Zahlung faellig. Der Auftragnehmer ist berechtigt, monatlich Rechnung zu stellen. Die Rechnungen muessen den Anforderungen des &sect; 14 UStG entsprechen.</p>', isSystem: true },
  { category: 'payment', name: 'Verzugszinsen', sortOrder: 2, bodyHtml: '<p>Befindet sich der Auftraggeber mit der Zahlung in Verzug, ist der Auftragnehmer berechtigt, Verzugszinsen in Hoehe von 9 Prozentpunkten ueber dem jeweiligen Basiszinssatz gemaess &sect; 288 Abs. 2 BGB zu verlangen. Die Geltendmachung eines weitergehenden Verzugsschadens bleibt vorbehalten. Der Auftragnehmer kann bei Zahlungsverzug von mehr als 30 Tagen seine Leistungen zurueckhalten.</p>', isSystem: true },
  { category: 'payment', name: 'Preisanpassung', sortOrder: 3, bodyHtml: '<p>Der Auftragnehmer ist berechtigt, die vereinbarten Preise einmal jaehrlich an die Entwicklung der allgemeinen Lebenshaltungskosten anzupassen. Eine Preiserhoehung ist dem Auftraggeber mindestens 3 Monate vor Inkrafttreten schriftlich mitzuteilen. Bei einer Preiserhoehung von mehr als 5 % hat der Auftraggeber ein Sonderkuendigungsrecht zum Zeitpunkt des Inkrafttretens.</p>', isSystem: true },

  // --- confidentiality ---
  { category: 'confidentiality', name: 'Geheimhaltungspflicht', sortOrder: 1, bodyHtml: '<p>Die Vertragsparteien verpflichten sich, alle im Rahmen der Zusammenarbeit erhaltenen vertraulichen Informationen streng vertraulich zu behandeln und nur fuer die Zwecke dieses Vertrages zu verwenden. Vertrauliche Informationen duerfen nur solchen Mitarbeitern zugaenglich gemacht werden, die diese fuer die Vertragserfuellung benoetigen und ihrerseits zur Vertraulichkeit verpflichtet sind.</p>', isSystem: true },
  { category: 'confidentiality', name: 'Vertraulichkeit nach Vertragsende', sortOrder: 2, bodyHtml: '<p>Die Geheimhaltungspflicht besteht ueber die Beendigung des Vertrages hinaus fuer einen Zeitraum von 5 Jahren fort. Nach Vertragsende sind saemtliche vertraulichen Unterlagen und Datentraeger zurueckzugeben oder nachweislich zu vernichten. Elektronische Kopien sind unwiderruflich zu loeschen. Der Nachweis ist auf Verlangen schriftlich zu erbringen.</p>', isSystem: true },
  { category: 'confidentiality', name: 'Vertragsstrafe bei Verstoss', sortOrder: 3, bodyHtml: '<p>Bei schuldhaftem Verstoss gegen die Geheimhaltungspflicht ist die verletzende Partei verpflichtet, eine Vertragsstrafe in Hoehe von 25.000 EUR je Verstoss zu zahlen. Die Geltendmachung eines weitergehenden Schadensersatzanspruchs bleibt vorbehalten, wobei die Vertragsstrafe auf den Schadensersatzanspruch angerechnet wird.</p>', isSystem: true },

  // --- data_protection ---
  { category: 'data_protection', name: 'Auftragsverarbeitung (AVV-Verweis)', sortOrder: 1, bodyHtml: '<p>Soweit der Auftragnehmer im Rahmen der Vertragserfuellung personenbezogene Daten im Auftrag des Auftraggebers verarbeitet, schliessen die Parteien eine Auftragsverarbeitungsvereinbarung (AVV) gemaess Art. 28 DSGVO als gesonderte Anlage zu diesem Vertrag. Die AVV regelt insbesondere Gegenstand, Dauer, Art und Zweck der Verarbeitung sowie die Rechte und Pflichten der Parteien.</p>', isSystem: true },
  { category: 'data_protection', name: 'DSGVO-Konformitaet', sortOrder: 2, bodyHtml: '<p>Beide Vertragsparteien verpflichten sich, die Bestimmungen der Datenschutz-Grundverordnung (DSGVO) und des Bundesdatenschutzgesetzes (BDSG) einzuhalten. Der Auftragnehmer setzt geeignete technische und organisatorische Massnahmen gemaess Art. 32 DSGVO um und weist diese auf Verlangen des Auftraggebers nach. Datenschutzvorfaelle sind unverzueglich, spaetestens innerhalb von 24 Stunden, zu melden.</p>', isSystem: true },
  { category: 'data_protection', name: 'Unterauftragnehmer', sortOrder: 3, bodyHtml: '<p>Der Einsatz von Unterauftragsverarbeitern bedarf der vorherigen schriftlichen Zustimmung des Auftraggebers. Der Auftragnehmer informiert den Auftraggeber ueber beabsichtigte Aenderungen in Bezug auf Unterauftragnehmer. Der Auftragnehmer stellt sicher, dass den Unterauftragsverarbeitern dieselben Datenschutzpflichten auferlegt werden wie dem Auftragnehmer selbst.</p>', isSystem: true },

  // --- sla ---
  { category: 'sla', name: 'Verfuegbarkeit und Reaktionszeiten', sortOrder: 1, bodyHtml: '<p>Der Auftragnehmer gewaehrleistet eine Verfuegbarkeit der vereinbarten Dienste von mindestens 99,5 % im Monatsdurchschnitt. Stoerungen der Kategorie &bdquo;Kritisch&ldquo; werden innerhalb von 1 Stunde bearbeitet, Kategorie &bdquo;Hoch&ldquo; innerhalb von 4 Stunden, Kategorie &bdquo;Normal&ldquo; innerhalb von 8 Stunden. Die Reaktionszeiten gelten innerhalb der Servicezeiten.</p>', isSystem: true },
  { category: 'sla', name: 'Eskalationsstufen', sortOrder: 2, bodyHtml: '<p>Bei nicht fristgerechter Behebung von Stoerungen greift folgendes Eskalationsverfahren: Stufe 1 (nach 2 Stunden) &ndash; Information des Teamleiters; Stufe 2 (nach 4 Stunden) &ndash; Einschaltung der Abteilungsleitung; Stufe 3 (nach 8 Stunden) &ndash; Eskalation an die Geschaeftsfuehrung. Jede Eskalationsstufe ist zu dokumentieren und dem Auftraggeber mitzuteilen.</p>', isSystem: true },
  { category: 'sla', name: 'Service Credits', sortOrder: 3, bodyHtml: '<p>Bei Unterschreitung der vereinbarten Verfuegbarkeit erhaelt der Auftraggeber Service Credits: Bei einer Verfuegbarkeit unter 99,5 % werden 5 % der Monatsverguetung gutgeschrieben, unter 99,0 % werden 10 % gutgeschrieben, unter 98,0 % werden 25 % gutgeschrieben. Service Credits sind auf maximal 30 % der monatlichen Verguetung begrenzt und werden mit der naechsten Rechnung verrechnet.</p>', isSystem: true },

  // --- ip_rights ---
  { category: 'ip_rights', name: 'Nutzungsrechte', sortOrder: 1, bodyHtml: '<p>Der Auftragnehmer raeumt dem Auftraggeber mit vollstaendiger Bezahlung der Verguetung ein ausschliessliches, zeitlich und raeumlich unbeschraenktes Nutzungsrecht an den vertraglich geschuldeten Arbeitsergebnissen ein. Das Nutzungsrecht umfasst die Vervielfaeltigung, Bearbeitung und oeffentliche Zugaenglichmachung fuer eigene geschaeftliche Zwecke des Auftraggebers.</p>', isSystem: true },
  { category: 'ip_rights', name: 'Eigenentwicklungen', sortOrder: 2, bodyHtml: '<p>An vorbestehenden Entwicklungen, Bibliotheken und Werkzeugen des Auftragnehmers, die in die Arbeitsergebnisse einfliessen, verbleibt das geistige Eigentum beim Auftragnehmer. Dem Auftraggeber wird insoweit ein einfaches, zeitlich unbeschraenktes Nutzungsrecht eingeraeumt, das die Nutzung der Arbeitsergebnisse wie vertraglich vorgesehen ermoeglicht.</p>', isSystem: true },
  { category: 'ip_rights', name: 'Open-Source-Komponenten', sortOrder: 3, bodyHtml: '<p>Der Auftragnehmer informiert den Auftraggeber ueber saemtliche in den Arbeitsergebnissen verwendeten Open-Source-Komponenten und deren jeweilige Lizenzbedingungen. Der Einsatz von Open-Source-Software mit Copyleft-Lizenzen (z. B. GPL) bedarf der vorherigen schriftlichen Zustimmung des Auftraggebers. Der Auftragnehmer gewaehrleistet die Vereinbarkeit aller Open-Source-Lizenzen.</p>', isSystem: true },
]

// ---------------------------------------------------------------------------
// POST /api/v1/contract-templates/seed
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  return withPermission(request, 'documents', 'create', async () => {
    // Check if system templates already exist
    const [existing] = await db
      .select({ value: count() })
      .from(contractTemplates)
      .where(eq(contractTemplates.isSystem, true))

    if (existing.value > 0) {
      return apiSuccess({ message: 'Already seeded', templatesCount: existing.value })
    }

    // Insert templates
    const insertedTemplates = await db
      .insert(contractTemplates)
      .values(SYSTEM_TEMPLATES)
      .returning({ id: contractTemplates.id })

    // Insert clauses
    const insertedClauses = await db
      .insert(contractClauses)
      .values(SYSTEM_CLAUSES)
      .returning({ id: contractClauses.id })

    return apiSuccess(
      {
        message: 'Seeded successfully',
        templatesCount: insertedTemplates.length,
        clausesCount: insertedClauses.length,
      },
      undefined,
      201
    )
  })
}
