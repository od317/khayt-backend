# خيط — Screen Inventory

> Every screen in both products, with its route, entry points, and what
> it reads from the API.
>
> Two products: **the app** (phone, external users) and **the dashboard**
> (desktop, internal staff).

---

## How to read this

**Route** — where it lives.

**Reached from** — how a user gets there. If nothing points at a screen,
it's unreachable — which is a bug, not a feature.

**Reads** — which API endpoints it calls.

**Writes** — which endpoints it calls that change data.

---

# Part 1 — The App (صلة)

Phone-only. Arabic RTL. Four external roles.

---

## Onboarding

### S1 — Onboarding

**Route:** shown before anything else, when no session exists
**Reached from:** first launch
**Reads:** —
**Writes:** `PATCH /auth/me` (role, location)
**Steps:** welcome → role → location → confirm

---

## Tabs

The tab bar changes by role:

| Role        | Tabs                                          |
| ----------- | --------------------------------------------- |
| متجر        | الرئيسية · اكتشف · الطلبات · حسابي            |
| مصنع / معهد | الرئيسية · اكتشف · الطلبات · إعلاناتي · حسابي |
| موظف        | الرئيسية · اكتشف · إعلاناتي · حسابي           |

---

### S2 — Home

**Route:** `/` (tab)
**Reached from:** tab bar, app launch
**Reads:** `GET /posts`, `GET /products`, `GET /orders`, `GET /dashboard/activity` (app variant)
**Role variants:**

- **متجر** — orders summary at top, mixed feed of products and posts
- **مصنع** — incoming orders needing action, job seekers section
- **موظف** — availability toggle, job postings section

Sections per role are ordered differently. No content is hidden.

---

### S3 — Discover

**Route:** `/discover` (tab)
**Reached from:** tab bar
**Reads:** `GET /posts`, `GET /products`, `GET /businesses`, `GET /categories`
**Filters:** الكل · منتجات · مشاغل · معاهد · وظائف · خدمات · مسوقين · أدوات ومعدات · شحن
**Behaviour:** sections ordered by role. Choosing a filter narrows to that section only.

---

### S4 — Orders

**Route:** `/orders` (tab)
**Reached from:** tab bar
**Reads:** `GET /orders`
**Shows:** the store's own orders, or a factory's incoming orders
**Tabs:** طلباتي · الطلبات الواردة (owner only)

---

### S5 — My posts (إعلاناتي)

**Route:** `/my-posts` (tab, مصنع and موظف only)
**Reached from:** tab bar
**Reads:** `GET /posts?authorId=me`
**Shows:** the user's posts grouped by type, each with an active toggle and interactions
**Writes:** `PATCH /posts/:id` (toggle active)

---

### S6 — Account

**Route:** `/account` (tab)
**Reached from:** tab bar
**Reads:** `GET /auth/me`, `GET /orders`, `GET /posts?authorId=me`
**Shows:** profile, stats, links to saved items, notifications, availability toggle (employee)

---

## Detail screens (pushed, no tab bar)

### S7 — Advertisement detail

**Route:** `/ad/:id`
**Reached from:** a post in the feed with no author and no business
**Reads:** `GET /posts/:id`
**Notes:** rarely used — most posts route elsewhere

---

### S8 — Job detail

**Route:** `/job/:id`
**Reached from:** a `job_offering` post
**Reads:** `GET /posts/:id`
**Shows:** employer, work type, salary, skills, benefits
**Writes:** `POST /posts/:id/like` (save)

---

### S9 — Offer / request detail

**Route:** `/offer/:id`
**Reached from:** a `service_offering` or `service_requesting` post
**Reads:** `GET /posts/:id`
**Shows:** publisher, contact, description, price

---

### S10 — Product detail

**Route:** `/product/:id`
**Reached from:** a product card
**Reads:** `GET /products/:id`
**Shows:**

- Colors (switching changes the image and the available sizes)
- Discount, offer, packaging
- Factory info as text
- Similar products
  **Notes:** if `inWarehouse` is true, the add-to-cart button is enabled. If false, `تواصل الآن`.

---

### S11 — Business profile

**Route:** `/business/:id`
**Reached from:** a business card, a post header, a product's factory row
**Reads:** `GET /businesses/:id`
**Shows:**

- Identity, verified badge, services
- Details in a collapsible section
- Products split into **متوفر في المستودع** and **للتواصل مع المعمل**
- Related posts and jobs
- Similar businesses (a slider)

**Writes:** cart state (client only), `POST /orders` on checkout

---

### S12 — Product screen (from business)

**Route:** `/business/:id/product/:productId`
**Reached from:** a product row on the business profile
**Reads:** `GET /products/:id`
**Notes:** same as S10 but scoped to the business context

---

### S13 — Person profile

**Route:** `/person/:id`
**Reached from:** a post whose author is a person, not a business
**Reads:** `GET /users/:id`, `GET /posts?authorId=:id`
**Shows:** bio, experience, availability, skills, work type, their posts
**Notes:** no verified badge. People are never verified.

---

### S14 — Marketer profile

**Route:** `/marketer/:id`
**Reached from:** a marketer card
**Reads:** `GET /marketers/:id`
**Shows:** label `مسوق مستقل`, a calm unverified notice, promoted products, channels, areas
**Notes:** the label and the absence of verification are enforced in code, not convention

---

### S15 — Shipping profile

**Route:** `/shipping/:id`
**Reached from:** a shipping card
**Reads:** `GET /shipping/:id`
**Shows:** coverage areas, delivery time, pricing, fleet, contact

---

### S16 — Order detail

**Route:** `/orders/:id`
**Reached from:** an order row
**Reads:** `GET /orders/:id`
**Shows:** status timeline, product lines, summary, actions
**Writes:** `PATCH /orders/:id/status` (cancel)

---

### S17 — Search

**Route:** `/search`
**Reached from:** the search box on Home and Discover
**Reads:** `GET /search?q=`
**Shows:** results grouped by type — marketers, businesses, institutes, ads, shipping
**Notes:** suggestions differ by role

---

### S18 — Notifications

**Route:** `/notifications`
**Reached from:** the bell in the top bar
**Reads:** `GET /notifications`
**Writes:** `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`

---

### S19 — Saved hub

**Route:** `/saved`
**Reached from:** account links
**Shows:** three rows — saved posts, saved businesses, saved marketers

---

### S20 — Saved posts

**Route:** `/saved/posts`
**Reads:** `GET /posts?savedBy=me`

---

### S21 — Saved businesses

**Route:** `/saved/businesses`
**Reads:** `GET /businesses?savedBy=me`

---

### S22 — Saved marketers

**Route:** `/saved/marketers`
**Reads:** `GET /marketers?savedBy=me`

---

### S23 — My grid (منشوراتي)

**Route:** `/my-grid`
**Reached from:** account
**Reads:** `GET /posts?authorId=me`
**Shows:** a three-column thumbnail grid

---

### S24 — Edit profile

**Route:** `/account/edit`
**Reached from:** account
**Reads:** `GET /auth/me`
**Writes:** `PATCH /auth/me`
**Fields:** name, phone, location, bio
**Notes:** avatar edit is present but disabled

---

### S25 — All products (منتجاتي)

**Route:** `/my-products`
**Reached from:** account
**Reads:** `GET /products?businessId=me`
**Shows:** a flat list of the user's products

---

### S26 — Add product

**Route:** `/products/new`
**Reached from:** account, or the business profile
**Writes:** `POST /products`
**Fields:** name, category, images, description, colors with per-color sizes, price, unit, min order, order method, packaging, discount

---

### S27 — Warehouse stock (مخزوني)

**Route:** `/warehouse-stock`
**Reached from:** account (مصنع only)
**Reads:** `GET /supply?businessId=me`, `GET /bills?businessId=me`
**Shows:** sent, remaining, sold per product, plus what's owed

---

### S28 — Reels

**Route:** full-screen overlay
**Reached from:** the reels row on Home
**Reads:** `GET /posts?media=video`
**Shows:** vertical full-screen video, like, comment, share

---

### S29 — Publish flow

**Route:** `/create`
**Reached from:** the top bar button
**Writes:** `POST /posts`
**Steps:** type picker → form → preview → success
**Types offered:** ابحث عن موظف · عرض خدمة · عرض منتج · عرض مواد ومكنات · أبحث عن مواد ومكنات

---

## Overlays (not screens)

| Overlay         | Used by                          |
| --------------- | -------------------------------- |
| Contact sheet   | Product, business, person, offer |
| Comment sheet   | Any post                         |
| Role sheet      | Home                             |
| Location sheet  | Home, edit profile               |
| Location picker | Publish form                     |
| Confirm dialog  | Delete post, cancel order        |
| Toast           | Everywhere                       |

---

# Part 2 — The Dashboard

Desktop. Arabic RTL. Internal staff.

---

## Layout

A right-side sidebar, a top header, and a content area.

**Sidebar groups:**

- المخزون — لوحة التحكم · المخزون · استلام
- الطلبات — الطلبات · التجهيز
- التوصيل — التوصيل
- الفواتير
- المعامل

---

### D1 — Dashboard home

**Route:** `/`
**Reached from:** sidebar
**Reads:** `GET /dashboard/stats`, `GET /dashboard/activity`
**Shows:** six stat cards, recent orders, active deliveries

---

### D2 — Inventory

**Route:** `/inventory`
**Reached from:** sidebar
**Reads:** `GET /inventory`
**Shows:** searchable, filterable table with low-stock colouring
**Filters:** search, business, category, sort

---

### D3 — Inventory item

**Route:** `/inventory/:id`
**Reached from:** an inventory row
**Reads:** `GET /inventory/:id`
**Shows:** four stat cards, movement history, business link
**Writes:** `DELETE /inventory/:id` (remove)

---

### D4 — Orders

**Route:** `/orders`
**Reached from:** sidebar
**Reads:** `GET /orders`
**Tabs:** الكل · قيد المراجعة · قيد التجهيز · جاهز للتسليم · قيد التوصيل · تم التسليم · ملغي

---

### D5 — Order detail

**Route:** `/orders/:id`
**Reached from:** an order row
**Reads:** `GET /orders/:id`
**Writes:** `PATCH /orders/:id/status`

---

### D6 — Picking

**Route:** `/picking`
**Reached from:** sidebar
**Reads:** `GET /orders?status=preparing`
**Shows:** a checklist per order, with checkboxes, shelf pills, progress bars
**Writes:** `PATCH /orders/:id/lines/:lineId`

---

### D7 — Deliveries

**Route:** `/deliveries`
**Reached from:** sidebar
**Reads:** `GET /deliveries`, `GET /drivers`
**Views:** list and board

---

### D8 — Delivery detail

**Route:** `/deliveries/:id`
**Reached from:** a delivery row or card
**Reads:** `GET /deliveries/:id`
**Writes:** `PATCH /deliveries/:id` (assign driver), `PATCH /deliveries/:id/status`

---

### D9 — Businesses

**Route:** `/factories`
**Reached from:** sidebar
**Reads:** `GET /businesses`
**Shows:** computed columns — product count, total stock, pending receiving

---

### D10 — Business detail

**Route:** `/factories/:id`
**Reached from:** a business row
**Reads:** `GET /businesses/:id`, `GET /inventory?businessId=`
**Shows:** stats, products table, receiving history, contact

---

### D11 — Receiving

**Route:** `/receiving`
**Reached from:** sidebar
**Reads:** `GET /receiving`, `GET /bills`
**Tabs:** الكل · نقدي · دين · غير مدفوع

---

### D12 — New receiving

**Route:** `/receiving/new`
**Reached from:** the receiving list
**Writes:** `POST /receiving`
**Steps:** pick business → pick products and quantities → payment type → confirm
**Notes:** this is the only way stock enters the warehouse

---

### D13 — Receiving detail

**Route:** `/receiving/:id`
**Reached from:** a receiving row
**Reads:** `GET /receiving/:id`
**Shows:** lines, total, link to the bill

---

### D14 — Bills

**Route:** `/bills`
**Reached from:** sidebar
**Reads:** `GET /bills`, `GET /bills/summary`
**Tabs:** الكل · غير مدفوع · مدفوع جزئياً · مدفوع

---

### D15 — Bill detail

**Route:** `/bills/:id`
**Reached from:** a bill row
**Reads:** `GET /bills/:id`
**Writes:** `POST /bills/:id/payments`
**Shows:** lines, payment history, remaining balance

---

## Dashboard overlays

| Overlay        | Used by                                  |
| -------------- | ---------------------------------------- |
| Confirm dialog | Cancel order, fail delivery, remove item |
| Payment dialog | Bill detail                              |
| Driver picker  | Delivery detail (inline, not a modal)    |

---

# Part 3 — Cross-product summary

## Screens per product

| Product       | Screens |
| ------------- | ------- |
| The app       | 29      |
| The dashboard | 15      |
| **Total**     | **44**  |

## Overlays

| Overlay        | Both products      |
| -------------- | ------------------ |
| Confirm dialog | Yes — used by both |
| Toast          | Yes                |

## Unreachable screens

Screens that exist but nothing points at:

| Screen          | Problem                                                         |
| --------------- | --------------------------------------------------------------- |
| S7 Ad detail    | Nothing routes there — posts go to business, person, or offer   |
| S9 Offer detail | Only reachable if a post has no author, which no mock post does |

**Both are candidates for removal.** Either wire them or delete them.

---

## Screens missing from the design

Listed in `03-flows.md` F11, repeated here because they'd each need screens:

| Missing                     | Would need                                               |
| --------------------------- | -------------------------------------------------------- |
| Returns                     | A store-facing return request + an admin approval screen |
| Disputes                    | A thread per dispute, with resolution                    |
| Moderation                  | A report queue in the dashboard                          |
| Partial fulfillment         | A way to close an order with fewer items                 |
| Delivery reattempt          | A failed-delivery queue                                  |
| Factory-submitted shipments | A create screen in the app                               |

---

## Route naming

Consistent across both products:

| Pattern                | Meaning |
| ---------------------- | ------- |
| `/{resource}`          | list    |
| `/{resource}/new`      | create  |
| `/{resource}/:id`      | detail  |
| `/{resource}/:id/edit` | edit    |

The app uses shorter routes (`/product/:id`) because it's a phone app
and deep links matter. The dashboard uses plural resources (`/orders/:id`)
because it's an internal tool.
