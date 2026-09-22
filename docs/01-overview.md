# خيط — System Overview

> **Status:** This document describes the system as it should be built.
> The current prototype is a design reference, not the specification.
> Where the prototype differs, this document wins.

---

## 1. Purpose

خيط is two connected businesses serving the Syrian clothing industry.

**It is a marketplace.**
It connects the people who make clothes with the people who sell them,
and the people who want to work with the people who hire.
Factories and institutes publish what they offer. Stores, workers, and
marketers find them. Contact happens on the platform; the transaction
happens off it.

**It is a warehouse operation.**
Factories place stock in خيط's warehouse. That stock becomes orderable
directly through the platform. خيط holds it, picks it, delivers it, and
bills the factory for the service.

Both exist at once. A factory can sell directly _and_ place stock. A store
can browse for a supplier _and_ order from the warehouse. The two paths
have different rules, different flows, and different screens.

---

## 2. Actors

An actor is anything that interacts with the system — including internal
staff and the system itself.

### External actors (use the mobile app)

| Actor                | Arabic             | What they want                                                    |
| -------------------- | ------------------ | ----------------------------------------------------------------- |
| Business — workshop  | مشغل / مصنع / معمل | Sell products, place warehouse stock, hire workers, find services |
| Business — institute | معهد               | Advertise courses, reach students                                 |
| Store                | متجر               | Buy wholesale, find suppliers, place orders                       |
| Employee             | موظف               | Find work, offer services, sell tools                             |

### Directory actors (no account — created by admin)

These appear in the platform and can be contacted, but cannot log in.
An admin maintains their information.

| Actor            | Arabic   | Why no account                                      |
| ---------------- | -------- | --------------------------------------------------- |
| Shipping company | شركة شحن | Listed for reference; contracts are handled offline |
| Marketer         | مسوق     | Promoted by admin; may gain accounts later          |

### Internal actors (use the dashboard)

| Actor           | Arabic      | What they can do                                              |
| --------------- | ----------- | ------------------------------------------------------------- |
| Super admin     | مدير عام    | Everything, including creating admins                         |
| Admin           | مدير        | Everything except creating admins and managing payments/bills |
| Inventory staff | موظف مستودع | Manage warehouse inventory, log arrivals, manage bills        |
| Delivery staff  | موظف توصيل  | Update order and delivery status, complete deliveries         |

### Non-human actors

| Actor      | What it does                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------- |
| **System** | Creates bills on receiving, sends notifications, updates statuses on schedule, flags low stock |

---

## 3. Capabilities

Capabilities are what an actor can _do_, independent of which screen they
do it on.

### مشغل / مصنع

- Publish a product to their public catalog
- Place stock in the خيط warehouse
- See what they have in the warehouse: sent, remaining, sold
- See what they are owed
- Publish a job posting
- Search for employees
- Search for services (tailoring, printing, finishing)
- Search for tools and materials
- Receive and manage orders for warehouse stock
- Interact with posts (like, comment)

### معهد

- Publish courses
- Publish a job posting
- Search for employees
- Interact with posts

### متجر

- Browse products across the platform
- Search for workshops and suppliers
- Contact a workshop directly to arrange an order
- Order warehouse stock directly through the platform
- Track their orders
- Save suppliers and products
- Interact with posts

### موظف

- Publish a job-seeking post
- Publish a service offer
- Publish a tool or material listing
- Search for workshops, institutes, and job postings
- Toggle availability
- Interact with posts

### Admin (all levels)

- Moderate content: hide posts, suspend users
- Manage directory actors (shipping, marketers)
- View all orders, inventory, and bills

### Inventory staff

- Log incoming stock
- Manage inventory records
- Manage bills and record payments

### Delivery staff

- View assigned deliveries
- Update delivery status
- Mark delivered or failed

### System

- Create a bill when stock is received
- Send notifications on order status change
- Flag products below a stock threshold
- Generate receiving numbers, bill numbers, order numbers

---

## 4. The two paths

The system has two ways a store can get products. They must not be
confused — different rules, different screens, different money.

### Path 1 — Direct (showcase)

Factory publishes product
→ product appears in the app
→ store sees it
→ store contacts the factory (phone, WhatsApp, outside the app)
→ they arrange the order themselves
→ خيط is not involved

text

**خيط's role:** visibility only. No transaction, no money, no delivery.

### Path 2 — Warehouse

Factory contacts خيط (phone)
→ inventory staff logs the arrival
→ stock enters the warehouse
→ a bill is created, owed by خيط to the factory
→ product becomes orderable in the app
→ store places an order in the app
→ خيط picks, packs, delivers
→ خيط collects payment from the store
→ خيط pays the factory

text

**خيط's role:** buyer, holder, fulfiller, biller. Full responsibility.

**The rule that follows:** a product is orderable in the app **only if it
is in خيط's warehouse**. Everything else is contact-only.

---

## 5. What this system is not

Worth stating, because these come up.

- **Not a payment processor.** Money moves offline. The platform records
  what is owed and what is paid; it does not move funds.
- **Not a messaging platform.** Contact is a phone number and a button.
  There is no chat.
- **Not a delivery marketplace.** خيط delivers its own warehouse orders.
  Third-party shipping companies are directory listings.
- **Not a job board with applications.** A job post shows a contact.
  There is no apply button, no CV, no hiring workflow.

---

## 6. Products in this system

Three separate products, one system:

| Product           | Users           | Device  | Purpose                             |
| ----------------- | --------------- | ------- | ----------------------------------- |
| **The app (صلة)** | External actors | Phone   | Find, publish, order                |
| **The dashboard** | Internal actors | Desktop | Receive, store, pick, deliver, bill |
| **The API**       | Both            | —       | Shared data and rules               |

They share a domain and a database. They do not share a user interface.

---

## 7. Open questions

Recorded here so they are not lost. None block the build.

1. **Do shipping companies ever get accounts?** Currently directory-only.
   If they need to manage their own listings, that is a new actor type.
2. **Do marketers get accounts?** Same question.
3. **Does the factory submit a shipment in the app, or phone it in?**
   Currently phone-only. If the app should support it, that is a new flow.
4. **Is there a dispute flow?** A store receives damaged goods from the
   warehouse. Nothing handles this today.
5. **Does the factory see the store's identity on warehouse orders?**
   Currently not modelled. May matter for returns.
