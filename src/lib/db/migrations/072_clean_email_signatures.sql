-- ============================================================
-- 072_clean_email_signatures.sql
-- ------------------------------------------------------------
-- Bestehende E-Mail-Signaturen in email_accounts.signature einmalig
-- saeubern: leere Absaetze raus, Mehrfach-<br> einklappen. Das
-- Compose-Frontend kappt Newlines bereits beim Rendern, aber die
-- Quelldaten enthielten Reste aus dem WYSIWYG-Editor (<p>&nbsp;</p>,
-- <p><br></p>, ketten von <br>), die optisch fuer Leerzeilen-Inflation
-- gesorgt haben.
--
-- Idempotent: ein zweiter Lauf macht nichts mehr.
-- ============================================================

UPDATE email_accounts
SET signature = trim(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        signature,
        -- 1) Leere Absaetze: <p>...nur-whitespace-oder-&nbsp;-oder-<br>...</p>
        '<p[^>]*>(\s|&nbsp;|<br\s*/?\s*>)*</p>',
        '',
        'gi'
      ),
      -- 2) Drei oder mehr aufeinanderfolgende <br> → genau zwei
      '(<br\s*/?\s*>\s*){3,}',
      '<br><br>',
      'gi'
    ),
    -- 3) Mehrfach-Whitespace zwischen Tags zusammenfalten (vorsichtig:
    --    NICHT global, nur direkt nach schliessenden Block-Tags)
    '(</(p|div)>)\s+(<(p|div))',
    '\1\3',
    'gi'
  )
),
updated_at = now()
WHERE signature IS NOT NULL
  AND signature <> ''
  AND (
       signature ~* '<p[^>]*>(\s|&nbsp;|<br\s*/?\s*>)*</p>'
    OR signature ~* '(<br\s*/?\s*>\s*){3,}'
  );
