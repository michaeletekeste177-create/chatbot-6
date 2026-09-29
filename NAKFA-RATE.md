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

**Not yet set.** The official Bank of Eritrea peg (1 USD = 15 Nakfa, unchanged
for many years) does not necessarily reflect real purchasing power on the
ground, and using it blindly to settle with people in Eritrea risks doing
them real financial harm. The platform owner will set this after studying
actual conditions during her visit to Eritrea — not before.

Once set, this section will read:

```
1 USD = <rate> Nakfa   (updated <date>)
```

To change it: tell Claude the new rate and date, and ask it to update and
commit this file.
