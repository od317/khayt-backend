# خيط — Flows

> The sequences that make the system work.
> Each flow lists: who acts, what changes, and what the system does.

---

## How to read this

A flow is a sequence with a start and an end. Every arrow is either:

- **an action** — someone does something
- **a state change** — something becomes different
- **a system event** — the platform acts on its own

Flows are numbered so code and tests can reference them.

---

## F1 — Warehouse order (the main flow)

The most important flow in the system. A store orders stock that خيط holds.

**Actors:** store, system, inventory staff, delivery staff
**Starts:** store taps "اطلب الآن" on a warehouse product
**Ends:** delivered, inventory decremented, factory owes tracked

### Steps

Store browses and finds a product with inWarehouse = true

Store adds products to a cart
→ cart is client state, not persisted

Store reviews the cart and places the order
→ Order created, status = review
→ OrderLine rows created, each with unitPrice locked
→ Supply.remaining is NOT changed yet
→ System notifies inventory staff

Inventory staff reviews the order in the dashboard
→ either approves → status = preparing
→ or cancels → status = cancelled (flow ends, stock released)

Order enters the picking queue

Picker picks each line in the dashboard
→ OrderLine.picked set to true, one at a time

All lines picked
→ status = ready
→ System notifies the delivery team

Delivery staff creates a Delivery
→ Delivery created, status = unassigned
→ Order linked to the delivery

Delivery staff assigns a driver
→ driverId set

Driver picks up and starts the route
→ status = in_transit (both order and delivery)
→ System notifies the store

Driver arrives
→ either delivered → status = delivered
→ or failed → status = failed

On delivered:
→ Supply.remaining decremented for each line
→ Order archived
→ System notifies the store and the factory
→ The factory's balance owed by خيط is now calculable

text

### What can go wrong

| At step | Problem                                | Handling                                          |
| ------- | -------------------------------------- | ------------------------------------------------- |
| 4       | Stock ran out between order and review | Cancel, notify store                              |
| 7       | Item missing from shelf                | Partial fulfillment — a flow we have not designed |
| 11      | Store closed, nobody there             | `failed`, reattempt or return to warehouse        |
| 12      | Damaged in transit                     | **No flow exists.** See open question 1.          |

### Key rules exercised

- **R1** — only warehouse products can be ordered
- **R3** — status transitions are constrained
- **R4** — a delivery can't start without a driver
- **R9** — stock decrements on delivery, not on order

---

## F2 — Receiving (stock arrives)

How products get into the warehouse. **Currently manual and offline.**

**Actors:** factory, inventory staff, system
**Starts:** a factory phones خيط
**Ends:** stock is in the warehouse, a bill exists

### Steps

Factory calls خيط and says what they want to send
→ no system involvement yet

Inventory staff logs the arrival in the dashboard
→ they pick the factory
→ they pick products and enter quantities
→ they enter the unit price for each line

Inventory staff chooses the payment type
→ cash → خيط pays now
→ credit → خيط owes the factory

Inventory staff confirms
→ Receiving created, number generated (RCV-####)
→ ReceivingLine rows created
→ Bill created automatically, number generated (BILL-####)
→ BillLine rows copied from ReceivingLine
→ Supply rows created or increased
→ Product.inWarehouse set to true if it was false
→ System notifies the factory that stock is live

text

### What this means

**The factory has no screen for this.** They phone. The inventory staff
enters everything. If the factory later needs to submit shipments in the
app, that's a new flow — see open question 2.

**A bill always exists after receiving.** The factory can be paid
immediately (cash) or later (credit). Either way, there's a record.

---

## F3 — Direct contact (showcase)

A store wants a product that isn't in the warehouse.

**Actors:** store, factory
**Starts:** store sees a product with `inWarehouse = false`
**Ends:** they talk. خيط is not involved.

### Steps

Store browses the platform

Store finds a factory or a product

Store taps "تواصل الآن"
→ a contact sheet opens
→ factory name, phone, working hours
→ no order is created

Store and factory talk outside the platform

They arrange the order themselves
→ delivery, payment, everything

text

### What the system does

Nothing after step 3. **No record, no tracking, no money.**

This is deliberate. خيط is a directory in this path. Trying to track
off-platform transactions would mean asking users to log things they
have no reason to log.

---

## F4 — Job seeking

An employee looks for work, or a workshop looks for workers.

**Actors:** employee, workshop, system
**Starts:** someone publishes a post
**Ends:** they talk. خيط is not involved.

### Steps

1a. Employee publishes a job_seeking post
→ Post created, type = job_seeking
→ fields: specialty, experience, workType, salary expectation
→ appears in feeds and search for workshops

1b. Or a workshop publishes a job_offering post
→ Post created, type = job_offering
→ fields: specialty, experience, workType, salary
→ appears in feeds and search for employees

The other side finds the post
→ by browsing, searching, or filters

They tap "تواصل الآن"
→ contact sheet opens

They talk outside the platform

text

### Why there's no application flow

A workshop looking for a خياط wants to phone them and hear their voice.
A CV form would slow that down. The contact number _is_ the feature.

**If this changes**, the new flow is: apply → CV → shortlist → interview.
That's a different product.

---

## F5 — Availability toggle

An employee signals whether they're looking.

**Actors:** employee, system
**Starts:** employee toggles availability
**Ends:** their posts and profile reflect it

### Steps

Employee sets availableForWork = true
→ their job_seeking posts appear in search
→ their profile is marked as available

Employee sets availableForWork = false
→ posts still exist, but are flagged as inactive
→ search deprioritizes them
→ their profile shows "غير متوفر حالياً"

text

**Why this matters:** without it, every job-seeking post looks current.
An employee who found work six months ago still shows as available.

---

## F6 — Order cancellation

**Actors:** store, inventory staff, system
**Starts:** someone cancels an order
**Ends:** stock is released, both sides notified

### Steps

Cancellation can happen at any point before in_transit
→ store can cancel while status = review
→ inventory staff can cancel at review or preparing
→ nobody can cancel after it's on a truck

On cancel:
→ status = cancelled
→ reserved stock released (Supply.remaining unchanged,
because it never decremented)
→ System notifies the other side

text

**The rule:** once a delivery is in transit, cancellation is not possible.
The goods are physically moving.

---

## F7 — Payment recording

**Actors:** inventory staff, system
**Starts:** خيط pays a factory for received stock
**Ends:** the bill reflects it

### Steps

Inventory staff opens a bill in the dashboard

Staff taps "تسجيل دفعة"
→ dialog opens
→ maximum is the remaining balance

Staff enters the amount
→ Payment row created
→ Bill.paid increased
→ Bill.status recomputed

If paid >= total
→ status = paid
→ no further payments possible

text

### Why payments are a table

A 10-million-pound bill might be paid in four instalments over three
months. Each one needs a date and a person. A single number can't hold
that history.

---

## F8 — Notification

**Actors:** system
**Starts:** something happens that someone should know about
**Ends:** they see it

### Triggers

| Event                    | Notified              |
| ------------------------ | --------------------- |
| Order placed             | inventory staff       |
| Order status changed     | store                 |
| Order delivered          | store, factory        |
| Order cancelled          | the other side        |
| New comment on your post | post author           |
| New like on your post    | post author (batched) |
| Bill becomes due         | inventory staff       |
| Stock below threshold    | inventory staff       |
| Receiving confirmed      | factory               |

### Steps

Event occurs

System creates a Notification row
→ one per recipient

Recipient opens the app or dashboard

Bell shows an unread count

Opening the notification marks it read

text

**Batching:** likes are batched. "3 people liked your post" is one
notification, not three. Comments are not batched — each is its own.

---

## F9 — Publishing a post

**Actors:** any external user, system
**Starts:** user taps the create button
**Ends:** the post is visible

### Steps

User picks a type
→ job_seeking, service_offering, product_offering,
material_offering, material_requesting, job_offering

User fills the form for that type
→ fields differ per type
→ some fields depend on earlier ones
(e.g. skills depend on specialty)

User previews

User publishes
→ Post created
→ categories attached
→ appears in feeds
→ System notifies matching users (optional, per rules)

text

### What's missing

**Moderation.** Any post goes live immediately. There's no review queue,
no report button, no auto-flagging. For a real launch this needs a flow.

---

## F10 — Browsing and discovery

**Actors:** any external user
**Starts:** user opens the app
**Ends:** they find something or they don't

### The three discovery paths

Path A — role-shaped home
user's role determines what leads
store → warehouse products first
workshop → job seekers, tools
employee → job postings

Path B — categories and filters
Discover screen
filter chips narrow the feed
sections ordered by role

Path C — search
free text across posts, businesses, products, shipping
results grouped by type

text

**Not documented:** the ranking algorithm. There isn't one. For the real
build, this is a decision — chronological, by proximity, by engagement,
or by payment.

---

## F11 — What happens when things go wrong

Flows that are **not** designed, listed so they're not forgotten.

| Situation                    | Current state                                                        |
| ---------------------------- | -------------------------------------------------------------------- |
| Store receives damaged goods | No flow. No return, no credit note, no dispute.                      |
| Factory sends wrong products | No flow. Inventory staff could reject, but rejection isn't modelled. |
| Driver can't reach the store | `failed` status exists. Reattempt flow does not.                     |
| Payment dispute              | No flow. Payments are recorded, never contested.                     |
| Order partially fulfilled    | No flow. Either all lines are picked, or the order sits.             |
| Stock discrepancy at picking | No flow. Picker finds fewer items than the system says.              |

**These are the gaps.** Each one is a real operational scenario that will
happen in the first month. They need design before launch, but not before
the first build.

---

## 6. Flow summary

| Flow               | Actors                     | System writes                      |
| ------------------ | -------------------------- | ---------------------------------- |
| F1 Warehouse order | store, inventory, delivery | Order, OrderLine, Delivery, Supply |
| F2 Receiving       | inventory                  | Receiving, Bill, Supply, Product   |
| F3 Direct contact  | store, factory             | nothing                            |
| F4 Job seeking     | employee, workshop         | Post                               |
| F5 Availability    | employee                   | User                               |
| F6 Cancellation    | store, inventory           | Order                              |
| F7 Payment         | inventory                  | Payment, Bill                      |
| F8 Notification    | system                     | Notification                       |
| F9 Publishing      | any user                   | Post, PostCategory                 |
| F10 Discovery      | any user                   | nothing                            |
