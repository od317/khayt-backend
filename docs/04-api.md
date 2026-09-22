# خيط — API Surface

> Every request the app and the dashboard make.
> This is a contract, not an implementation. Transport and auth are
> decided separately.

---

## How to read this

**Two consumers:** the app and the dashboard. Some endpoints serve both.
Some serve only one.

**Auth is not specified here.** Assume every request carries a token and
the server knows who's asking. Authorization rules are in the domain doc.

**Naming:** `GET` reads, `POST` creates, `PATCH` updates, `DELETE` removes.

**Pagination is omitted** for clarity. Assume every list endpoint takes
`?page=&limit=` and returns `{ items, total, page }`.

---

## 1. Auth

### POST /auth/request-code

Start login. Sends an SMS code.
body: { phone }
→ 200 { sent: true }

text

### POST /auth/verify

Complete login.
body: { phone, code }
→ 200 { token, user: User }
→ 401 { error: "invalid_code" }

text

### GET /auth/me

The current user, including their role and any business they own.
→ 200 { user: User, business?: Business }

text

### PATCH /auth/me

Update own profile.
body: { name?, location?, bio?, avatarUrl?, availableForWork? }
→ 200 { user: User }

text

---

## 2. Businesses

### GET /businesses

### GET /businesses

**Public.** No token required.
List and search. Used by the app for browsing and the dashboard for
management.
query: { type?, location?, q?, page?, limit? }
→ 200 { items: Business[], total }

text

### GET /businesses/:id

**Public.** No token required.
One business, with its products and supply summary.
`isOwner` is `false` when the request is unauthenticated.
→ 200 {
business: Business,
products: Product[],
supply?: SupplyLine[], // only if it places stock
isOwner: boolean
}

text

### POST /businesses

Create a business. The creator becomes the owner.
body: { type, name, location, description, phone }
→ 201 { business: Business }

text

### PATCH /businesses/:id

Update. Owner or admin only.
body: { name?, location?, description?, phone?, imageUrl? }
→ 200 { business: Business }

text

---

## 3. Products

### GET /products

**Public.** No token required.
Browse. Used by the app's discover and by store search.

Browse. Used by the app's discover and by store search.
query: {
businessId?, category?, q?, location?,
inWarehouse?, // true = orderable only
page?, limit?
}
→ 200 { items: Product[], total }

text

### GET /products/:id

**Public.** No token required.
One product. Includes the business and, if warehouse-stocked, the
available quantity.
Soft-deleted products return 404.
→ 200 {
product: Product,
business: Business,
availableQuantity?: number // when inWarehouse is true
}

text

### POST /products

Create a product. The business owner only.
body: {
businessId, name, category, description,
unit, price, images,
colors?, sizes?, packaging?, discount?, offer?
}
→ 201 { product: Product }

text

### PATCH /products/:id

Update a product.
body: { ...any product field }
→ 200 { product: Product }

text

### DELETE /products/:id

Soft delete. Always returns 200, never 204.

Sets `deletedAt`. The product disappears from every listing.

Soft delete. Fails if the product has been ordered.
→ 204
→ 409 { error: "product_has_orders" }

text

---

## 4. Posts

### GET /posts

The main feed. Role-aware ordering happens server-side.
query: {
type?, // job_seeking, service_offering, ...
categoryId?,
location?,
authorId?,
businessId?,
q?,
page?, limit?
}
→ 200 { items: Post[], total }

text

### GET /posts/:id

One post, with author, business, like count, comment count, and whether
the current user has liked it.
→ 200 {
post: Post,
author: User,
business?: Business,
likes: number,
comments: number,
likedByMe: boolean
}

text

### POST /posts

Publish.
body: {
type, title, body, location,
media, imageUrls?, videoUrl?,
categoryIds,
...type-specific fields
}
→ 201 { post: Post }

text

### PATCH /posts/:id

Update, or toggle `active`.
body: { title?, body?, active?, ... }
→ 200 { post: Post }

text

### DELETE /posts/:id

Soft delete. Author or admin.
→ 204

text

---

## 5. Comments and likes

### GET /posts/:id/comments

→ 200 { items: Comment[], total }

text

### POST /posts/:id/comments

body: { body }
→ 201 { comment: Comment }

text

### DELETE /comments/:id

Author or admin.
→ 204

text

### POST /posts/:id/like

→ 200 { liked: true, likes: number }

text

### DELETE /posts/:id/like

→ 200 { liked: false, likes: number }

text

---

## 6. Categories

### GET /categories

query: { appliesTo? } // post | product | both
→ 200 { items: Category[] }

text

Admin only:

### POST /categories

### PATCH /categories/:id

### DELETE /categories/:id

---

## 7. Orders

### GET /orders

The store's own orders, or all orders for internal staff.
query: { status?, storeId?, q?, page?, limit? }
→ 200 { items: Order[], total }

text

Authorization: a store sees only its own. Internal staff see all.

### GET /orders/:id

One order, with lines, store, and delivery.
→ 200 {
order: Order,
lines: OrderLine[],
store: User,
delivery?: Delivery
}

text

### POST /orders

Place an order. Store only.
body: {
lines: [{ productId, quantity }]
}
→ 201 { order: Order }
→ 400 { error: "not_in_warehouse", productId }
→ 409 { error: "insufficient_stock", productId, available }

text

The server validates R1 and R8 on every line before creating anything.

### PATCH /orders/:id/status

Move the order. Internal staff only.
body: { status }
→ 200 { order: Order }
→ 400 { error: "invalid_transition", from, to }

text

Validates R3.

### PATCH /orders/:id/lines/:lineId

Toggle picked. Inventory staff only.
body: { picked: boolean }
→ 200 { line: OrderLine }

text

---

## 8. Delivery

### GET /deliveries

query: { status?, driverId?, area?, q?, page?, limit? }
→ 200 { items: Delivery[], total }

text

A driver sees only their own.

### GET /deliveries/:id

→ 200 {
delivery: Delivery,
orders: Order[],
driver?: User
}

text

### POST /deliveries

Create a delivery from one or more orders.
body: { orderIds: string[], area }
→ 201 { delivery: Delivery }
→ 400 { error: "order_already_assigned", orderId }

text

### PATCH /deliveries/:id

Assign a driver, or change the area.
body: { driverId?, area? }
→ 200 { delivery: Delivery }

text

### PATCH /deliveries/:id/status

body: { status }
→ 200 { delivery: Delivery }
→ 400 { error: "invalid_transition" }
→ 400 { error: "no_driver_assigned" }

text

Validates R3 and R4.

### GET /drivers

Internal staff only.
→ 200 { items: User[] } // users with role = delivery

text

---

## 9. Inventory

### GET /inventory

Warehouse stock. Internal only.
query: { businessId?, category?, q?, lowStock?, page?, limit? }
→ 200 { items: InventoryItem[], total }

text

### GET /inventory/:id

→ 200 { item: InventoryItem, business: Business, movements: Movement[] }

text

### GET /supply

What each business has in the warehouse.
query: { businessId? }
→ 200 { items: Supply[] }

text

---

## 10. Receiving

### GET /receiving

query: { businessId?, page?, limit? }
→ 200 { items: Receiving[], total }

text

### GET /receiving/:id

→ 200 { receiving: Receiving, lines: ReceivingLine[], bill: Bill }

text

### POST /receiving

Log an arrival. **Inventory staff only.** This is the only way stock
enters the warehouse.
body: {
businessId,
paymentType, // cash | credit
lines: [{ productId, quantity, unitPrice }]
}
→ 201 { receiving: Receiving, bill: Bill }
→ 400 { error: "empty_lines" }

text

**This endpoint does five things atomically:**

1. Creates the `Receiving` and its lines
2. Creates the `Bill` and its lines
3. Creates or updates `Supply` rows
4. Sets `Product.inWarehouse = true` for each product
5. Notifies the business

If any step fails, none happen. This is R6.

---

## 11. Bills and payments

### GET /bills

query: { businessId?, status?, q?, page?, limit? }
→ 200 { items: Bill[], total }

text

### GET /bills/:id

→ 200 {
bill: Bill,
lines: BillLine[],
payments: Payment[],
business: Business,
receiving: Receiving
}

text

### POST /bills/:id/payments

Record a payment. Inventory staff only.
body: { amount }
→ 201 { payment: Payment, bill: Bill }
→ 400 { error: "amount_exceeds_balance", remaining }
→ 400 { error: "amount_not_positive" }

text

Validates R7. The server recomputes `paid` and `status`.

### GET /bills/summary

Totals for the dashboard.
query: { businessId? }
→ 200 { total, paid, remaining, count }

text

---

## 12. Notifications

### GET /notifications

query: { unreadOnly?, page?, limit? }
→ 200 { items: Notification[], total, unreadCount }

text

### PATCH /notifications/:id/read

→ 200 { notification: Notification }

text

### PATCH /notifications/read-all

→ 200 { updated: number }

text

---

## 13. Dashboard

### GET /dashboard/stats

The six numbers on the home screen.
→ 200 {
ordersToday: number,
ordersPending: number,
itemsInStock: number,
lowStock: number,
deliveriesActive: number,
receivingPending: number
}

text

### GET /dashboard/activity

Recent activity for the home screen.
→ 200 {
recentOrders: Order[],
activeDeliveries: Delivery[]
}

text

---

## 14. Admin

### GET /admin/users

query: { role?, verified?, q?, page?, limit? }
→ 200 { items: User[], total }

text

### PATCH /admin/users/:id

Suspend, verify, or change role.
body: { verified?, suspended?, role? }
→ 200 { user: User }

text

### POST /admin/users

Create an internal staff account. Super admin only.
body: { name, phone, role } // role: admin | inventory | delivery
→ 201 { user: User }

text

### GET /admin/shipping

### POST /admin/shipping

### PATCH /admin/shipping/:id

### DELETE /admin/shipping/:id

Same shape for marketers.

---

## 15. Cross-cutting concerns

### Errors

Every error returns:
{ error: "code", message: "human readable", ...context }

text

Codes are stable. Messages are not.

### Validation

Rejected requests return `400` with a `fields` object:
{
error: "validation_failed",
fields: { quantity: "must be positive" }
}

text

### Idempotency

`POST /orders`, `POST /receiving`, and `POST /bills/:id/payments` accept
an `Idempotency-Key` header. Two identical requests with the same key
produce one record.

### Authorization failures

- `401` — no token, or expired
- `403` — valid token, wrong role
- `404` — exists but you can't see it (preferred over 403 for reads,
  to avoid leaking existence)

### Rate limits

Not specified here. Applied at the gateway.

---

## 16. What's missing

Endpoints that will be needed but aren't designed:

| Missing                          | Why                           |
| -------------------------------- | ----------------------------- |
| `POST /orders/:id/partial`       | Partial fulfillment           |
| `POST /returns`                  | Damaged goods                 |
| `POST /disputes`                 | Payment disputes              |
| `POST /posts/:id/report`         | Moderation                    |
| `GET /search`                    | Unified search across types   |
| `GET /uploads/sign`              | Signed upload URLs for images |
| `POST /deliveries/:id/reattempt` | Failed delivery retry         |

Each is a flow that isn't designed yet, listed in `03-flows.md` F11.
