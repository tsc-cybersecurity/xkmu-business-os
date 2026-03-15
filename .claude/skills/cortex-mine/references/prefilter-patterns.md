# Pre-filter Patterns

Applied before any AI call. Goal: skip 60–80% of threads at near-zero cost.

## Step 1 — Duplicate check (always first)

```python
# Already in communications.jsonl?
with open(comms_file) as f:
    if f'"source_id":"{thread_id}"' in f.read():
        skip  # already processed
```

## Step 2 — Automated sender patterns

Skip if `from` address matches (case-insensitive):

```
no-reply@, noreply@, do-not-reply@, donotreply@
notifications@, notification@, alerts@, alert@
mailer-daemon@, postmaster@, bounce@
auto-confirm@, automated@, robot@, bot@
newsletter@, newsletters@, marketing@, offers@, promotions@
billing@, invoices@, receipts@, system@
```

Skip if sender domain is a known automated source:
```
xero.com, myob.com, quickbooks.com
stripe.com, paypal.com, square.com
mailchimp.com, hubspot.com, klaviyo.com, brevo.com, sendinblue.com
constantcontact.com, campaignmonitor.com
intercom.io, zendesk.com, freshdesk.com
shopify.com, squarespace.com, wix.com
```

## Step 3 — Subject patterns

Skip if subject contains (case-insensitive):
```
unsubscribe, newsletter
your invoice, invoice #, invoice number
receipt for, your order, order confirmation, order #
delivery notification, shipping notification, your package
password reset, reset your password
verify your email, verification code, confirm your email
account activation, account created
trial started, subscription renewed
payment received, payment failed, payment reminder
automatic reply, auto-reply, auto reply, out of office
do not reply, do not respond
security alert, new sign-in, new device detected
weekly digest, monthly summary, weekly summary
```

## Step 4 — Gmail query (apply at fetch time — free filtering)

```
after:YYYY/MM/DD
-category:promotions
-category:updates
-category:social
-label:newsletters
-from:no-reply
-from:noreply
```

## Tuning

- Too many false negatives (junk getting through)? Add sender domains to the blocked list.
- Useful threads being filtered? Check which pattern matched and remove or narrow it.
- The filter errs aggressive — better to skip a borderline thread than waste an API call.
