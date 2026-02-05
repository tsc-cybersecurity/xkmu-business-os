Projekt-Übersicht: xKMU Business OS

Das Ziel ist die Entwicklung eines mandantenfähigen Betriebssystems für KMU, das als zentrale Steuerungseinheit für Marketing, Vertrieb und interne Verwaltung dient. Das System muss von Grund auf so konzipiert sein, dass alle Aktionen über eine API steuerbar sind, um eine nahtlose Automatisierung über externe Tools zu ermöglichen.



Kern-Architektur und technische Vorgaben

Die Anwendung wird mit Next.js (App Router) und einer PostgreSQL-Datenbank (lokal via Docker) realisiert. Ein zentrales Merkmal ist die Mandantenfähigkeit: Alle Daten (Benutzer, Firmen, Personen, Leads) müssen strikt nach Mandanten getrennt sein. Das Berechtigungssystem umfasst eine vollständige Benutzer- und Rollenverwaltung.



Funktionsbereiche nach Priorität

Der Ausbau erfolgt stufenweise, beginnend mit dem Fundament (Priorität 1):





Kontakt- und Stammdatenverwaltung (P1): Implementierung einer CRM-Komponente zur Speicherung von Firmen- und Personendaten. Firmen enthalten Adressdaten, Status und Tags. Personen können Firmen zugeordnet werden oder als Privatpersonen existieren. Es müssen mandantenspezifische Felder unterstützt werden.





KI-gestützte Lead-Automatisierung (P1 \& P4): Aufbau eines Systems zur Erfassung von Anfragen und Leads. Neue Anfragen lösen einen automatisierten Workflow aus: Eine KI (vorrangig Gemini oder lokal via Ollama) recherchiert die anfragende Person/Firma, erstellt ein Memo und legt den Kontakt automatisch im CRM an.





Kommunikation und Content (P3 \& P4): Erstellung eines Formulargenerators mit Variablen-Unterstützung sowie eines Systems für Mailvorlagen und automatisierte Mailsequenzen.





Business-Module (P2): Integration von Modulen für Angebote, Rechnungen, Produkte und Dienstleistungen. Zudem Aufbau einer Knowledgebase (öffentlich/intern) und eines LMS.





Spezialisierte Features (P5): Entwicklung eines Tools zur Beratung nach DIN SPEC 27076, inklusive Fragebogen, automatisierter Auswertung und Berichtgenerierung.



Anforderungen an die Umsetzung

Jedes Modul muss über einen Service-Layer verfügen, der die Geschäftslogik kapselt. Diese Services werden sowohl von der Next.js-Oberfläche als auch von REST-API-Endpunkten angesprochen. Die Benutzeroberfläche muss über alle Module hinweg eine konsistente Navigation und ein einheitliches Design aufweisen.

