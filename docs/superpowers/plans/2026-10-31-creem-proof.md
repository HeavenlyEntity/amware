# Creem license checks

Run in Creem test mode on 2026-10-31, as Task 1 of [the licensing plan](2026-10-31-warekit-licensing.md). Tasks 5 and 11 read this file. Keys, names and emails below are redacted.

Setup: the kit is `prod_2QrpIYVW2oNli1u8ZytKj1` (Next Pro, $499.00), with a **New license key** delivery item and no activation limit or expiry. The upgrade is `prod_smRyWTQmAU7bIweHg8J2v` ($500.00) with no delivery item. Webhooks were forwarded with `creem listen`.

## Results

| Check                                                     | Result                                                    |
| --------------------------------------------------------- | --------------------------------------------------------- |
| 1. Key issued, no expiry, present in `checkout.completed` | Pass                                                      |
| 2. Three activations with different instance names        | Pass                                                      |
| 2. Creem's purchase email against ours                    | **Not checked.** Confirm at the first live sale (Task 19) |
| 3. Refund payload, full and partial                       | Pass, with the caveats below                              |
| 4. Upgrade webhook returns our metadata                   | Pass                                                      |
| 4. `success_url` keeps `r` and `s`                        | Pass                                                      |

The stop rule doesn't apply, so Creem's key stays the license key.

## Fields to use

### `checkout.completed`

- The key is `object.license_keys[0].key`, and its id is `object.license_keys[0].id`. It also appears at `object.feature.license_key`.
- `expires_at` and `activation_limit` are null. The status is `inactive` until the first activation.
- Our metadata is `object.metadata`, as strings.
- The order id is `object.order.id`, and the transaction id is `object.order.transaction`.
- A product with no delivery item omits `license_keys` and `feature` entirely, so read them defensively.

**Read `object.metadata`, never `object.customer.metadata`.** Creem copies metadata onto the customer and overwrites it on the next checkout. After the upgrade, the customer's metadata had `upgrade: 'team'`.

### `refund.created`

- `object.order.id` matches `creemOrderId`.
- `object.checkout.metadata` carries our metadata.
- The amount is `object.refund_amount`, and the amount paid is `object.transaction.amount_paid`.
- **A refund is full when `refund_amount >= transaction.amount_paid`.** Partial refunds send the same shape.

**The status fields inside the payload are stale.** On both the full and the partial refund, `object.order.status` and `object.transaction.status` still said `paid`, and `object.transaction.refunded_amount` was null. Don't use them. Fetching the transaction afterwards shows `refunded` or `partialRefund`, with `refundedAmount` set.

Several partial refunds on one order would each arrive separately, so a total needs summing. That case wasn't tested.

### Redirect

`success_url` kept `r=abc` and `s=def`. Creem appended `request_id`, `checkout_id`, `order_id`, `customer_id`, `product_id` and `signature`.

## Behaviour the build must handle

- **Refunds don't touch the key.** After a full refund, the key still validated as `active`. After a partial refund, it still activated a new instance. Revoking access is entirely our job.
- **Creem doesn't merge activations.** Activating `1234567` a second time created a new instance and took the count to 4. Check our own table before calling Creem, or the count drifts from real accounts.
- **A repeat purchase issues a different key.** The same customer bought the kit twice and got two keys. The second key belongs to a duplicate purchase, not a new license.
- **Delivery is applied when the payment completes.** A checkout created before the key delivery was added still issued a key.
- **One email is one Creem customer.** All three orders share a customer id, so it can't identify a license.

## Refund limits

The refund API (`POST /v1/refunds`) is full only. Partial refunds are dashboard only.

The first API refund failed with `400 Insufficient balance. Please wait for incoming payments before requesting this refund.` A full dashboard refund on the same payment succeeded about two minutes later, after a second payment had come in. The cause isn't established. Before promising the 14-day refund in live mode, check how a refund behaves with a low store balance, especially on the first sale.

## Payloads

### Kit `checkout.completed`

```json
{
  "eventType": "checkout.completed",
  "object": {
    "id": "ch_3tSHEqQH1PkFkcLkwxFzWp",
    "object": "checkout",
    "request_id": "proof-kit-keyed-1",
    "order": {
      "object": "order",
      "id": "ord_47ROTib8WK9yZq91ln1BiI",
      "customer": "cust_5BIImjPUTgc8HemHJCea52",
      "product": "prod_2QrpIYVW2oNli1u8ZytKj1",
      "amount": 49900,
      "currency": "USD",
      "sub_total": 49900,
      "tax_amount": 0,
      "amount_due": 49900,
      "amount_paid": 49900,
      "status": "paid",
      "type": "onetime",
      "transaction": "tran_6AWDehJjirMQD41iLbj9hG",
      "created_at": "2026-11-01T01:49:38.998Z",
      "updated_at": "2026-11-01T01:52:26.638Z",
      "mode": "test"
    },
    "product": {
      "id": "prod_2QrpIYVW2oNli1u8ZytKj1",
      "object": "product",
      "name": "Test name",
      "description": "Redacted description",
      "price": 49900,
      "currency": "USD",
      "billing_type": "onetime",
      "billing_period": "once",
      "recurring_interval": null,
      "recurring_interval_count": null,
      "trial_period_days": null,
      "trial_price": null,
      "status": "active",
      "tax_mode": "inclusive",
      "business_net_pricing": false,
      "tax_category": "saas",
      "default_success_url": null,
      "created_at": "2026-09-11T19:26:32.603Z",
      "updated_at": "2026-11-01T01:49:13.499Z",
      "mode": "test"
    },
    "units": 1,
    "success_url": "https://www.amware.dev/?r=abc&s=def",
    "customer": {
      "id": "cust_5BIImjPUTgc8HemHJCea52",
      "object": "customer",
      "email": "buyer@example.com",
      "name": "Test name",
      "metadata": {
        "itemId": "1",
        "itemType": "product",
        "licenseId": "1"
      },
      "country": "US",
      "external_id": null,
      "created_at": "2026-11-01T01:52:22.928Z",
      "updated_at": "2026-11-01T01:52:22.928Z",
      "mode": "test"
    },
    "license_keys": [
      {
        "object": "license",
        "id": "lk_6NU1eBGmNcqbAvCMJbGLFK",
        "product_id": "prod_2QrpIYVW2oNli1u8ZytKj1",
        "status": "inactive",
        "key": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
        "activation": 0,
        "activation_limit": null,
        "expires_at": null,
        "created_at": "2026-11-01T01:52:26.783Z",
        "instance": null,
        "mode": "test"
      }
    ],
    "feature": {
      "type": "licenseKey",
      "license_key": {
        "object": "license",
        "id": "lk_6NU1eBGmNcqbAvCMJbGLFK",
        "product_id": "prod_2QrpIYVW2oNli1u8ZytKj1",
        "status": "inactive",
        "key": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
        "activation": 0,
        "activation_limit": null,
        "expires_at": null,
        "created_at": "2026-11-01T01:52:26.783Z",
        "instance": null,
        "mode": "test"
      },
      "license": {
        "object": "license",
        "id": "lk_6NU1eBGmNcqbAvCMJbGLFK",
        "product_id": "prod_2QrpIYVW2oNli1u8ZytKj1",
        "status": "inactive",
        "key": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
        "activation": 0,
        "activation_limit": null,
        "expires_at": null,
        "created_at": "2026-11-01T01:52:26.783Z",
        "instance": null,
        "mode": "test"
      }
    },
    "status": "completed",
    "metadata": {
      "itemId": "1",
      "itemType": "product",
      "licenseId": "1"
    },
    "mode": "test"
  },
  "id": "evt_3TvpCvmqyqIDE37T6muC2b",
  "created_at": 1793497947980
}
```

### Upgrade `checkout.completed`

```json
{
  "eventType": "checkout.completed",
  "object": {
    "id": "ch_2YZgsosFuCaIbGnI04egjU",
    "object": "checkout",
    "request_id": "proof-upgrade-1793473916",
    "order": {
      "object": "order",
      "id": "ord_7EWPQqSAjH8LFGDaq58npe",
      "customer": "cust_5BIImjPUTgc8HemHJCea52",
      "product": "prod_smRyWTQmAU7bIweHg8J2v",
      "amount": 50000,
      "currency": "USD",
      "sub_total": 50000,
      "tax_amount": 0,
      "amount_due": 50000,
      "amount_paid": 50000,
      "status": "paid",
      "type": "onetime",
      "transaction": "tran_4KDt2mXTEKwylkVUqZiJSk",
      "created_at": "2026-11-01T01:56:56.716Z",
      "updated_at": "2026-11-01T01:59:15.224Z",
      "mode": "test"
    },
    "product": {
      "id": "prod_smRyWTQmAU7bIweHg8J2v",
      "object": "product",
      "name": "Test name",
      "description": "Redacted description",
      "price": 50000,
      "currency": "USD",
      "billing_type": "onetime",
      "billing_period": "once",
      "recurring_interval": null,
      "recurring_interval_count": null,
      "trial_period_days": null,
      "trial_price": null,
      "status": "active",
      "tax_mode": "inclusive",
      "business_net_pricing": false,
      "tax_category": "saas",
      "default_success_url": null,
      "created_at": "2026-10-31T19:11:48.131Z",
      "updated_at": "2026-10-31T19:11:48.131Z",
      "mode": "test"
    },
    "units": 1,
    "success_url": "https://www.amware.dev/?r=abc&s=def",
    "customer": {
      "id": "cust_5BIImjPUTgc8HemHJCea52",
      "object": "customer",
      "email": "buyer@example.com",
      "name": "Test name",
      "metadata": {
        "itemId": "1",
        "upgrade": "team",
        "itemType": "product",
        "licenseId": "1"
      },
      "country": "US",
      "external_id": null,
      "created_at": "2026-11-01T01:52:22.928Z",
      "updated_at": "2026-11-01T01:59:11.203Z",
      "mode": "test"
    },
    "status": "completed",
    "metadata": {
      "itemId": "1",
      "upgrade": "team",
      "itemType": "product",
      "licenseId": "1"
    },
    "mode": "test"
  },
  "id": "evt_5AIPVlYwW3lObk7fKl5Yn6",
  "created_at": 1793498356932
}
```

### Full `refund.created`, $499.00

```json
{
  "eventType": "refund.created",
  "object": {
    "id": "ref_1y5PWxrEwdPEvmfwAsP86A",
    "object": "refund",
    "status": "succeeded",
    "refund_amount": 49900,
    "refund_currency": "USD",
    "reason": "requested_by_customer",
    "transaction": {
      "id": "tran_6AWDehJjirMQD41iLbj9hG",
      "object": "transaction",
      "amount": 49900,
      "amount_paid": 49900,
      "currency": "USD",
      "type": "payment",
      "tax_country": "US",
      "tax_amount": 0,
      "status": "paid",
      "refunded_amount": null,
      "order": "ord_47ROTib8WK9yZq91ln1BiI",
      "customer": "cust_5BIImjPUTgc8HemHJCea52",
      "description": "Redacted description",
      "created_at": 1793497946866,
      "mode": "test"
    },
    "checkout": {
      "id": "ch_3tSHEqQH1PkFkcLkwxFzWp",
      "object": "checkout",
      "request_id": "proof-kit-keyed-1",
      "product": "prod_2QrpIYVW2oNli1u8ZytKj1",
      "units": 1,
      "success_url": "https://www.amware.dev/?r=abc&s=def",
      "status": "completed",
      "metadata": {
        "itemId": "1",
        "itemType": "product",
        "licenseId": "1"
      },
      "mode": "test"
    },
    "order": {
      "object": "order",
      "id": "ord_47ROTib8WK9yZq91ln1BiI",
      "customer": "cust_5BIImjPUTgc8HemHJCea52",
      "product": "prod_2QrpIYVW2oNli1u8ZytKj1",
      "amount": 49900,
      "currency": "USD",
      "sub_total": 49900,
      "tax_amount": 0,
      "amount_due": 49900,
      "amount_paid": 49900,
      "status": "paid",
      "type": "onetime",
      "transaction": "tran_6AWDehJjirMQD41iLbj9hG",
      "created_at": "2026-11-01T01:49:38.998Z",
      "updated_at": "2026-11-01T01:52:26.638Z",
      "mode": "test"
    },
    "customer": {
      "id": "cust_5BIImjPUTgc8HemHJCea52",
      "object": "customer",
      "email": "buyer@example.com",
      "name": "Test name",
      "metadata": {
        "itemId": "1",
        "itemType": "product",
        "licenseId": "1"
      },
      "country": "US",
      "external_id": null,
      "created_at": "2026-11-01T01:52:22.928Z",
      "updated_at": "2026-11-01T01:54:57.355Z",
      "mode": "test"
    },
    "created_at": 1793498116821,
    "mode": "test"
  },
  "id": "evt_5DDZu5wR4FoHMzxAxp6edr",
  "created_at": 1793498116981
}
```

### Partial `refund.created`, $100.00

```json
{
  "eventType": "refund.created",
  "object": {
    "id": "ref_2TvYPvuHxi7HEj8yEZ3xv5",
    "object": "refund",
    "status": "succeeded",
    "refund_amount": 10000,
    "refund_currency": "USD",
    "reason": "requested_by_customer",
    "transaction": {
      "id": "tran_5WTKAcVtDlcHB6wXoA9KmF",
      "object": "transaction",
      "amount": 49900,
      "amount_paid": 49900,
      "currency": "USD",
      "type": "payment",
      "tax_country": "US",
      "tax_amount": 0,
      "status": "paid",
      "refunded_amount": null,
      "order": "ord_4z3aBq7B75bbL5oLSvE4Yr",
      "customer": "cust_5BIImjPUTgc8HemHJCea52",
      "description": "Redacted description",
      "created_at": 1793498102094,
      "mode": "test"
    },
    "checkout": {
      "id": "ch_3WIck671dpnPcwziHbB8yo",
      "object": "checkout",
      "request_id": "proof-kit-1793473916",
      "product": "prod_2QrpIYVW2oNli1u8ZytKj1",
      "units": 1,
      "success_url": "https://www.amware.dev/?r=abc&s=def",
      "status": "completed",
      "metadata": {
        "itemId": "1",
        "itemType": "product",
        "licenseId": "1"
      },
      "mode": "test"
    },
    "order": {
      "object": "order",
      "id": "ord_4z3aBq7B75bbL5oLSvE4Yr",
      "customer": "cust_5BIImjPUTgc8HemHJCea52",
      "product": "prod_2QrpIYVW2oNli1u8ZytKj1",
      "amount": 49900,
      "currency": "USD",
      "sub_total": 49900,
      "tax_amount": 0,
      "amount_due": 49900,
      "amount_paid": 49900,
      "status": "paid",
      "type": "onetime",
      "transaction": "tran_5WTKAcVtDlcHB6wXoA9KmF",
      "created_at": "2026-11-01T01:10:18.573Z",
      "updated_at": "2026-11-01T01:55:01.186Z",
      "mode": "test"
    },
    "customer": {
      "id": "cust_5BIImjPUTgc8HemHJCea52",
      "object": "customer",
      "email": "buyer@example.com",
      "name": "Test name",
      "metadata": {
        "itemId": "1",
        "itemType": "product",
        "licenseId": "1"
      },
      "country": "US",
      "external_id": null,
      "created_at": "2026-11-01T01:52:22.928Z",
      "updated_at": "2026-11-01T01:54:57.355Z",
      "mode": "test"
    },
    "created_at": 1793498184943,
    "mode": "test"
  },
  "id": "evt_A2jROAcUcT0nWPtQLkTfx",
  "created_at": 1793498185077
}
```
