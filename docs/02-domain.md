# خيط — Domain Model

> The entities, their relationships, and the rules that must always hold.
> This is the file the database schema is designed from.

---

## 1. How to read this

An **entity** is a thing that exists independently. You can point at one
and say "that's one of them." A screen is not an entity. A status value is
not an entity. A report is not an entity.

An **attribute** is a fact about an entity.

A **relationship** is how two entities connect.

A **rule** is something that must always be true. Every rule here becomes
a database constraint, a validation, or a trigger.

---

## 2. Entities

### User

Every person who logs into the app. One table, one `role` field.

| Field            | Type      | Notes                                        |
| ---------------- | --------- | -------------------------------------------- |
| id               | uuid      |                                              |
| role             | enum      | `employee`, `workshop`, `institute`, `store` |
| name             | string    |                                              |
| phone            | string    | unique, used for login                       |
| location         | string    | city + area                                  |
| bio              | text      | optional                                     |
| avatarUrl        | string    | optional                                     |
| availableForWork | boolean   | employee only                                |
| verified         | boolean   | set by admin                                 |
| createdAt        | timestamp |                                              |

**Why one table:** all four roles share the same fields, log in the same
way, and can all publish posts. Splitting them means four login flows and
four post tables.

**What differs by role:** which business they own, and what capabilities
they have. That's logic, not schema.

---

### Business

A workshop, a factory, an institute, or a store — an organization.

**A user owns at most one business.** Enforced by a unique constraint on
`Business.ownerId`. If a user needs a second organization, that's a new
requirement and a schema change.

| Field       | Type      | Notes                            |
| ----------- | --------- | -------------------------------- |
| id          | uuid      |                                  |
| ownerId     | uuid      | → User                           |
| type        | enum      | `workshop`, `institute`, `store` |
| name        | string    |                                  |
| location    | string    |                                  |
| description | text      |                                  |
| verified    | boolean   | set by admin                     |
| phone       | string    |                                  |
| imageUrl    | string    | optional                         |
| createdAt   | timestamp |                                  |

**Type-specific fields** (nullable, only one set is used):

| Field      | Applies to          | Notes                 |
| ---------- | ------------------- | --------------------- |
| capacity   | workshop            | monthly output        |
| equipment  | workshop            |                       |
| minOrder   | workshop            |                       |
| experience | workshop, institute |                       |
| duration   | institute           | typical course length |
| topics     | institute           |                       |

**Why one table:** a workshop and an institute answer the same questions —
where, what, how to contact. They differ in what they offer, which is
handled by nullable fields.

**The line:** split when the _flow_ differs, not when the fields differ.
If institutes ever get scheduling and enrollment, they split.

---

### Supply

### SupplyLine (response shape, not an entity)

What the API returns when a business's warehouse stock is requested.
Not a table. Derived from `Supply` rows, joined with `Product` for the name.

| Field       | Type    | Source                     |
| ----------- | ------- | -------------------------- |
| productId   | uuid    | Supply.productId           |
| productName | string  | Product.name               |
| sent        | integer | Supply.sent                |
| remaining   | integer | Supply.remaining           |
| sold        | integer | computed: sent − remaining |
| unit        | string  | Product.unit               |
| unitPrice   | integer | Supply.unitPrice           |

Named `SupplyLine` because it reads better than `Supply` in a response
body where it represents one line of stock per product. The table is
still `Supply`.

Stock a business has placed in خيط's warehouse.

| Field      | Type      | Notes                  |
| ---------- | --------- | ---------------------- |
| id         | uuid      |                        |
| businessId | uuid      | → Business             |
| productId  | uuid      | → Product              |
| sent       | integer   | total shipped          |
| remaining  | integer   | currently in warehouse |
| unitPrice  | integer   | what خيط pays per unit |
| updatedAt  | timestamp |                        |

**`sold` is computed:** `sent - remaining`. Not stored.

**One row per product per business.** If a factory sends more of the same
product, `sent` increases. If it's a different product, a new row.

---

### Product

A thing a business offers. Can be a garment, a fabric, a machine, a course.

| Field       | Type      | Notes                              |
| ----------- | --------- | ---------------------------------- |
| id          | uuid      |                                    |
| businessId  | uuid      | → Business                         |
| name        | string    |                                    |
| category    | string    |                                    |
| description | text      |                                    |
| images      | string[]  |                                    |
| unit        | string    | قطعة / متر / طقم / دورة            |
| price       | integer   | display price                      |
| inWarehouse | boolean   | **see rule R1**                    |
| available   | boolean   | business-controlled visibility     |
| deletedAt   | timestamp | soft delete marker, null when live |
| createdAt   | timestamp |                                    |

**Two different states, two different fields.**

`available = false` means the owner has hidden the product. It still
exists, it can be shown again, and it may still be referenced by orders.

`deletedAt` is set means the product is gone. It never appears in any
listing, and it cannot be restored through the API.

Do not use one for the other.

**Variants** (only for garments):

| Field     | Type     | Notes                                     |
| --------- | -------- | ----------------------------------------- |
| colors    | jsonb    | `[{ name, hex, image, sizes[] }]`         |
| sizes     | string[] | when colors are absent                    |
| packaging | jsonb    | `{ onlyPackage, unitsPerPackage, label }` |
| saleRule  | jsonb    | Sale mode: `null` free; `locked_axis`; `color_size_pack` (+ sizePack); `color_pair_pack` (+ sizePack, `pairWith` or legacy `allowedPairColors`). Legacy `{ lockedAxis }` = locked_axis |
| discount  | jsonb    | `{ percent, originalPrice }`              |
| offer     | string   | free-text promotion                       |

**Why `colors` is jsonb:** a color is not an entity. It has no id, nothing
references it, and it never exists outside its product. Making it a table
would add joins for no benefit.

---

### Post

Anything a user publishes. One table, one `type` field.

| Field      | Type      | Notes                    |
| ---------- | --------- | ------------------------ |
| id         | uuid      |                          |
| authorId   | uuid      | → User                   |
| businessId | uuid      | optional → Business      |
| type       | enum      | see below                |
| title      | string    |                          |
| body       | text      |                          |
| media      | enum      | `none`, `image`, `video` |
| imageUrls  | string[]  |                          |
| videoUrl   | string    | when media = video       |
| location   | string    |                          |
| active     | boolean   | author can disable       |
| createdAt  | timestamp |                          |

**Types:**

| Type                  | Meaning                            |
| --------------------- | ---------------------------------- |
| `job_seeking`         | I'm looking for work               |
| `job_offering`        | I'm hiring                         |
| `service_offering`    | I offer a service                  |
| `service_requesting`  | I need a service                   |
| `product_offering`    | I'm selling a product              |
| `material_offering`   | I'm selling fabric or machines     |
| `material_requesting` | I'm looking for fabric or machines |

**Reels are not a type.** A reel is a post with `media = video`. A service
offer can be a reel. So can a product. Medium and purpose are different
axes.

**Type-specific fields** (nullable):

| Field      | Applies to                      |
| ---------- | ------------------------------- |
| specialty  | service, material, job_offering |
| experience | service, job_seeking            |
| workType   | job_seeking, job_offering       |
| salary     | job_offering                    |
| pricing    | service                         |
| condition  | material                        |
| price      | product, material               |

---

### Category

A label used to classify posts and products.

| Field     | Type    | Notes                     |
| --------- | ------- | ------------------------- |
| id        | uuid    |                           |
| name      | string  |                           |
| slug      | string  | unique                    |
| appliesTo | enum    | `post`, `product`, `both` |
| sortOrder | integer |                           |

**Why an entity, not a string:** categories are managed by admins, appear
in filters, and need consistent naming. A free-text category field drifts
within a week.

---

### PostCategory (join)

| Field | Type |
| ---------- | ---- | ---------- |
| postId | uuid | → Post |
| categoryId | uuid | → Category |

A post can have several categories. A category applies to many posts.

---

### Comment

| Field     | Type      | Notes  |
| --------- | --------- | ------ |
| id        | uuid      |        |
| postId    | uuid      | → Post |
| authorId  | uuid      | → User |
| body      | text      |        |
| createdAt | timestamp |        |

---

### Like

| Field | Type |
| --------- | --------- | ------ |
| userId | uuid | → User |
| postId | uuid | → Post |
| createdAt | timestamp |

Composite primary key on `(userId, postId)`. A user likes a post once.

---

### Order

A store's order from خيط's warehouse.

| Field     | Type      | Notes                 |
| --------- | --------- | --------------------- |
| id        | uuid      |                       |
| number    | string    | ORD-####              |
| storeId   | uuid      | → User (role = store) |
| status    | enum      | see rule R3           |
| total     | integer   | computed, see R2      |
| pieces    | integer   | computed              |
| createdAt | timestamp |                       |
| updatedAt | timestamp |                       |

**Orders only exist for warehouse stock.** A direct contact between a
store and a factory creates no Order record. There is nothing to track.

---

### OrderLine

| Field      | Type    | Notes                     |
| ---------- | ------- | ------------------------- |
| id         | uuid    |                           |
| orderId    | uuid    | → Order                   |
| productId  | uuid    | → Product                 |
| businessId | uuid    | → Business (the supplier) |
| quantity   | integer |                           |
| unitPrice  | integer | locked at order time      |
| picked     | boolean | set during picking        |

**Why `unitPrice` is stored here:** prices change. An order from last month
must show what it cost then, not what it costs now.

**Why `businessId` is here:** one order can contain products from several
factories. Each line records who supplied it, because خيط owes each
factory separately.

---

### Delivery

| Field       | Type      | Notes                                             |
| ----------- | --------- | ------------------------------------------------- |
| id          | uuid      |                                                   |
| number      | string    | DLV-####                                          |
| driverId    | uuid      | → User (internal, role = delivery)                |
| status      | enum      | `unassigned`, `in_transit`, `delivered`, `failed` |
| area        | string    |                                                   |
| createdAt   | timestamp |                                                   |
| deliveredAt | timestamp |                                                   |

**One delivery can carry several orders.** That's why `orderIds` lives on
the delivery, not `deliveryId` on the order. A driver does one route.

---

### DeliveryOrder (join)

| Field | Type |
| ---------- | ---- | ---------- |
| deliveryId | uuid | → Delivery |
| orderId | uuid | → Order |

---

### Receiving

A record of stock arriving at the warehouse.

| Field       | Type      | Notes                    |
| ----------- | --------- | ------------------------ |
| id          | uuid      |                          |
| number      | string    | RCV-####                 |
| businessId  | uuid      | → Business               |
| receivedAt  | timestamp |                          |
| paymentType | enum      | `cash`, `credit`         |
| createdBy   | uuid      | → User (inventory staff) |

**Every receiving record is something that arrived.** There is no
"expected" state, because the factory phones first — the system records
what showed up.

---

### ReceivingLine

| Field       | Type    | Notes       |
| ----------- | ------- | ----------- |
| id          | uuid    |             |
| receivingId | uuid    | → Receiving |
| productId   | uuid    | → Product   |
| quantity    | integer |             |
| unitPrice   | integer |             |

---

### Bill

What خيط owes a business for stock received.

| Field       | Type      | Notes                       |
| ----------- | --------- | --------------------------- |
| id          | uuid      |                             |
| number      | string    | BILL-####                   |
| businessId  | uuid      | → Business                  |
| receivingId | uuid      | → Receiving                 |
| paymentType | enum      | `cash`, `credit`            |
| status      | enum      | `paid`, `unpaid`, `partial` |
| issuedAt    | timestamp |                             |
| dueAt       | timestamp | only for `credit`           |
| total       | integer   | computed                    |
| paid        | integer   | running total               |

**A bill is created by the system, not by a person.** When stock is
received, the bill exists. That's rule R6.

---

### BillLine

| Field     | Type    | Notes     |
| --------- | ------- | --------- |
| id        | uuid    |           |
| billId    | uuid    | → Bill    |
| productId | uuid    | → Product |
| quantity  | integer |           |
| unitPrice | integer |           |

---

### Payment

| Field      | Type      | Notes  |
| ---------- | --------- | ------ |
| id         | uuid      |        |
| billId     | uuid      | → Bill |
| amount     | integer   |        |
| paidAt     | timestamp |        |
| recordedBy | uuid      | → User |

**Payments are a table, not a number.** A bill can be paid in instalments,
and each one needs a date and a person. `Bill.paid` is the sum of its
payments — stored for speed, derivable for correctness.

---

### Notification

| Field     | Type      | Notes                                                      |
| --------- | --------- | ---------------------------------------------------------- |
| id        | uuid      |                                                            |
| userId    | uuid      | → User                                                     |
| type      | enum      | `order_status`, `new_order`, `comment`, `like`, `bill_due` |
| title     | string    |                                                            |
| body      | text      |                                                            |
| read      | boolean   |                                                            |
| linkTo    | string    | optional route                                             |
| createdAt | timestamp |                                                            |

---

## 3. Relationships

User ── Business one user owns many businesses
User ──< Post one user writes many posts
User ──< Comment
User ──< Like many-to-many with Post
User ──< Order store places many orders
User ──< Delivery driver runs many deliveries

Business ──< Product
Business ──< Supply
Business ──< Receiving
Business ──< Bill

Post >──< Category via PostCategory
Post ──< Comment
Post >──< Like

Product ──< Supply
Product ──< OrderLine
Product ──< ReceivingLine
Product ──< BillLine

Order ──< OrderLine
Order >──< Delivery via DeliveryOrder

Delivery ──< DeliveryOrder

Receiving ──< ReceivingLine
Receiving ── Bill one-to-one

Bill ──< BillLine
Bill ──< Payment

text

**The three join tables:** `PostCategory`, `DeliveryOrder`, `Like`.
Everything else is a straightforward one-to-many.

---

## 4. Rules

Numbered so they can be referenced in code review.

**R1 — Warehouse gating.**
A product is orderable in the app if and only if `Product.inWarehouse`
is true. A product with `inWarehouse = false` can only be contacted about.
This is the single most important rule in the system.

**R2 — Order total.**
`Order.total` equals the sum of `OrderLine.quantity × unitPrice` for its
lines. `Order.pieces` equals the sum of quantities. Both are computed, never
entered.

**R3 — Order status transitions.**
Permitted moves only:
review → preparing | cancelled
preparing → ready | cancelled
ready → in_transit | cancelled
in_transit → delivered | failed
delivered → (terminal)
cancelled → (terminal)
failed → (terminal)

text

Any other transition is rejected.

**R4 — Delivery requires a driver.**
A delivery cannot move from `unassigned` to `in_transit` without a
`driverId`.

**R5 — Bill total.**
`Bill.total` equals the sum of its lines. `Bill.paid` equals the sum of its
payments. Neither is entered directly.

**R6 — Bill on receiving.**
Creating a `Receiving` creates exactly one `Bill`. It cannot be skipped.

**R7 — Bill status.**
Derived from `paid` vs `total`:
paid = 0 → unpaid
0 < paid < total → partial
paid >= total → paid

text

`paid` can never exceed `total`.

**R8 — Stock cannot go negative.**
`Supply.remaining` is never less than zero. An order that would take it
below zero is rejected.

**R9 — Stock decrements on delivery, not on order.**
`Supply.remaining` decreases when an order reaches `delivered`. Not when
it is placed. Stock is reserved at order time, released on failure.

**R10 — Order lines require warehouse stock.**
An `OrderLine` can only reference a product whose `inWarehouse` is true.

**R11 — One review per user per post.**
A user can like a post once. Enforced by the composite key.

**R12 — Payments cannot be edited.**
A payment is recorded or reversed. It is never modified. Corrections are
new payments with a negative amount, with a reason.

**R13 — Business ownership.**
A `Business` always has an `ownerId`. Deleting a user does not delete
their business; it is transferred or archived.

**R14 — Numbers are sequential and unique.**
`ORD-`, `DLV-`, `RCV-`, `BILL-` are generated by the system, unique, and
never reused.

**R15 — Posts are soft-deleted.**
A post is deactivated, not removed. Comments and likes reference it.

---

## 5. What is deliberately not an entity

Worth recording, because these will come up.

| Thing              | Why not                                 |
| ------------------ | --------------------------------------- |
| Order status       | A value, not a thing                    |
| Product color      | jsonb — never referenced independently  |
| Category on a post | A join, not a field                     |
| The dashboard      | A UI, not a domain                      |
| A "report"         | A query, not stored data                |
| Wishlist           | Same shape as Like — reuse it           |
| Cart               | Client-side state until order is placed |

---

## 6. Open questions

<!-- 1. **Can a user own more than one business?** Currently yes by schema.
   May be restricted in practice. -->

2. **Does a store see which factory supplied each line?** Useful for
   returns. Not currently exposed.
3. **Is there a returns or dispute entity?** No. If a store receives
   damaged goods, nothing records it.
4. **Does `Supply` need history?** Right now it's current state only. If
   you need "what was in stock on March 1st," that's an audit table.
