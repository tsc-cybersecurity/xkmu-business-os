-- Phase: cleanup — remove hardcoded Grußformeln from email_templates.body_html.
-- EmailService.send appends each account's signature on top, so templates
-- ending with "Mit freundlichen Grüßen / Bis bald" produced double sign-offs.
--
-- Idempotent: REPLACE on a string that's already gone is a no-op.

-- Common Grußformeln across templates (email-template.service.ts defaults)
UPDATE email_templates
SET body_html = REPLACE(body_html, E'\n<p>Mit freundlichen Grüßen<br>{{absender}}</p>', '')
WHERE body_html LIKE '%Mit freundlichen Grüßen<br>{{absender}}%';

UPDATE email_templates
SET body_html = REPLACE(body_html, E'\n<p>Mit freundlichen Gruessen<br>{{absender}}</p>', '')
WHERE body_html LIKE '%Mit freundlichen Gruessen<br>{{absender}}%';

-- Appointment templates (appointment-mail.defaults.ts)
UPDATE email_templates
SET body_html = REPLACE(body_html, E'\n<p>Bis bald,<br>{{org.name}}</p>', '')
WHERE body_html LIKE '%Bis bald,<br>{{org.name}}%';

UPDATE email_templates
SET body_html = REPLACE(body_html, E'\n<p>Bis morgen,<br>{{org.name}}</p>', '')
WHERE body_html LIKE '%Bis morgen,<br>{{org.name}}%';

UPDATE email_templates
SET body_html = REPLACE(body_html, E'\n<p>Bis gleich,<br>{{org.name}}</p>', '')
WHERE body_html LIKE '%Bis gleich,<br>{{org.name}}%';

UPDATE email_templates
SET body_html = REPLACE(body_html, E'\n<p>Viele Grüße,<br>{{org.name}}</p>', '')
WHERE body_html LIKE '%Viele Grüße,<br>{{org.name}}%';

-- Bestätigungstemplate aus migration 0045 enthält "Viele Grüße<br/>{{org.name}}" am Ende
UPDATE email_templates
SET body_html = REPLACE(body_html, E'\n<p>Viele Grüße<br/>{{org.name}}</p>', '')
WHERE body_html LIKE '%Viele Grüße<br/>{{org.name}}%';

-- Bestätigungstemplate aus migration 0045 enthält zusätzlich einen Hinweissatz
-- "Bei Fragen können Sie sich jederzeit unter dieser E-Mail-Adresse melden."
-- der ebenfalls in die Account-Signatur überleitet — bleibt drin (informativ),
-- nur die Grußformel danach wird entfernt.
