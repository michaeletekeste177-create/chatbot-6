# Nakfa reference exchange rate

Every product on Hibretfamily is priced in USD or EUR (see
`server/routes/seller-products.js`'s `VALID_CURRENCIES`), so `commission_cents`
on every order — Stripe or mNakfa — is always recorded in a stable currency.
This file exists only so the platform owner has a quick, easily-updated
reference for converting a commission figure into Nakfa terms when settling
up with an mNakfa-only seller. **It is not read by any code in this project
and is never shown to buyers or sellers** — purely a note for Claude to read
back when asked "how much is my commission in Nakfa."

## Current rate

```
1 USD = 15 Nakfa   (updated 2026-09-29)
```

This is the **official Bank of Eritrea peg**, unchanged for many years — the
only verified, sourced number available right now. It does **not** necessarily
reflect real purchasing power on the ground, and using it to actually settle
with people in Eritrea could shortchange them. The platform owner plans to
revisit this number after studying real conditions during her visit to
Eritrea, and will tell Claude the updated figure once she has one.

To change it: tell Claude the new rate and date, and ask it to update and
commit this file.
