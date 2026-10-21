# خيط (Khayt) — Landing Page Brief

> **Purpose of this file:** hand this to another chat / designer / copywriter
> to build a marketing landing page. It describes what the product is, who it
> is for, and everything users can do — not API internals.
>
> **Product name:** خيط (Khayt)  
> **Industry:** Syrian clothing & textile trade  
> **Surfaces:** mobile app (external users) + admin dashboard (staff)  
> **Language / UX:** Arabic, RTL

---

## 1. One-line pitch

خيط connects everyone in the Syrian clothing industry — factories, stores,
workers, institutes, marketers, and shipping — and also runs a warehouse where
stores can order stock that خيط holds, picks, and delivers.

---

## 2. What the product is (two businesses in one)

### A) Marketplace (discovery & contact)

People publish what they offer or need (jobs, services, products, materials,
courses, reels). Others discover them by role, location, and category, then
contact on the platform. Many deals still close offline — the app’s job is to
**make the right people find each other**.

### B) Warehouse (order & fulfillment)

Factories place stock with خيط. That stock becomes orderable in-app.
Stores order → خيط inventory reviews & picks → delivery → store receives.
Factories get billed for the warehouse service. This path has real orders,
cart, tracking, and staff workflows.

Both share the same accounts, profiles, products, and notifications.

---

## 3. Who it’s for

| Who | Arabic | Why they use خيط |
| --- | --- | --- |
| Workshop / factory | مشغل / معمل / مصنع | Hire, find materials/services, put stock in the warehouse, get discovered by stores |
| Store | متجر | Find suppliers, browse warehouse catalog, place & track orders, get delivery inside their governorate |
| Employee / worker | موظف | Find jobs, offer skills/services, sell tools, show availability |
| Institute | معهد | Advertise courses and training, reach students and workshops |
| Marketer | مسوق | Get discovered for promotion/marketing work in the textile trade |
| Shipping company | شركة شحن | Listed in a public directory so businesses can find logistics partners |
| Internal staff | مدير / مستودع / توصيل | Run warehouse, deliveries, moderation, billing (dashboard) |

---

## 4. Core value propositions (landing-page friendly)

1. **One network for the whole clothing chain** — not just buyers or just workers.
2. **Discovery that matches your role** — feed and directories prioritize what matters to you (jobs vs suppliers vs courses).
3. **Warehouse you can trust** — order stock خيط already holds; track status from review to delivered.
4. **Local by design** — Syrian governorates/areas, delivery borders so drop-off pins stay inside the user’s region.
5. **Profiles & reputation** — businesses and individuals with photos, bios, services, verification flags.
6. **Always-on signals** — likes, comments/replies, saves, and push/in-app notifications.

---

## 5. What each user can do

### 5.1 Everyone (after phone OTP login)

- Sign in with phone + OTP
- Complete onboarding: choose role + location (city/area)
- View home / discover feeds
- Open posts, products, business profiles, marketer cards, shipping companies
- Like, comment, reply, save posts
- Get notifications (likes, comments, order updates, etc.)
- Manage account: name, bio, avatar, location, availability (where relevant)

### 5.2 Store (متجر)

**Useful for:** wholesale buying without hunting suppliers by WhatsApp alone.

- Browse **warehouse products** (search, category, in-warehouse filter)
- Add to **cart**, checkout, place **orders**
- Set / reuse a **map drop-off pin** (first order requires address + lat/lng)
- Stay inside their **governorate delivery circle** when ordering (geo check)
- Track order status: review → preparing → ready → in transit → delivered
- Discover workshops, institutes, materials, jobs, marketers, shipping
- Save suppliers / posts; contact via profiles and posts
- Own a **store business profile** (name, description, services, image — image/services can be completed later)

### 5.3 Workshop / factory (مشغل)

**Useful for:** selling capacity, hiring, and optionally using خيط as a warehouse partner.

- Public **factory profile** (services, experience, location, categories)
- Publish posts: job offers, materials, products, reels
- Appear in **businesses directory** (`type=workshop`)
- Place / see stock in the خيط warehouse (supply: sent / remaining / sold — staff-managed catalog)
- Get notified when related warehouse activity happens
- Hire via job posts; find workers and service providers in discover
- Interact socially (like / comment / save)

### 5.4 Institute (معهد)

**Useful for:** filling courses and connecting with workshops/students.

- Public institute business profile
- Publish course / training related posts
- Appear in institutes directory
- Search employees and industry posts
- Engage on the feed (like / comment)

### 5.5 Employee (موظف)

**Useful for:** finding work and selling skills/tools.

- Job-seeking posts, service offers, tools/materials listings
- Toggle **available for work**
- Personalized feed (`forMe`) biased toward job offers & service requests
- Browse workshops, institutes, jobs
- Public profile card (name, bio, avatar, location, availability)

### 5.6 Marketer (مسوق)

**Useful for:** getting hired for promotion in the textile space.

- Same individual-style profile as employees (availability, bio, avatar)
- Public **marketers directory** (`GET /marketers`) with search/filters
- Feed tailored like employee (jobs / service requests)
- Posts and engagement like other app users

### 5.7 Shipping company (user role + directory)

**Useful for:** being findable for logistics partnerships.

- **Directory listing** of shipping companies (coverage, delivery time, pricing, fleet, phone, image)
- User role can behave like other individuals on the social/marketplace side
- Contracts remain offline; the app is discovery + contact

---

## 6. Feature map (by product area)

### Accounts & trust

- Phone OTP auth; JWT session
- Role selection at onboarding
- Location tree: Syrian governorates + areas (+ خارج سوريا / عمل عن بعد)
- Optional delivery border (circle) per governorate for order geo rules
- Verified / suspended flags (admin)
- Default avatars / business images when users don’t upload one

### Discover & directories

| Directory | What you find |
| --- | --- |
| Posts feed | Jobs, services, products, materials, reels, … |
| Products | Platform warehouse catalog |
| Businesses | Filter by `store` / `workshop` / `institute` |
| Marketers | Public list of marketers |
| Shipping companies | Public logistics directory |
| Categories | Filter posts/products/businesses |
| Profiles | Deep link to factory or individual |

Search/filters typically include text (`q`), location, category, verified, availability (marketers).

### Social / content

- Create posts (text + images; reels with video + optional thumbnail)
- Like / unlike
- Comment + nested replies
- Save posts
- My posts / my reels
- Role-aware “for me” post types

### Warehouse commerce

- Staff-managed product catalog (variants: color/size, images, packaging, discounts)
- Cart → checkout → order
- Order statuses with Arabic labels for the UI
- Inventory picking (line-level picked)
- Deliveries + drivers
- Receiving → bills → payments (factory billing)
- Realtime updates (SSE) for orders/notifications; push via FCM

### Notifications

- New like, new comment / reply, order placed / status, moderation, etc.
- In-app list + unread count + push
- Deep links via `linkTo` (e.g. post/order paths)

---

## 7. User journeys worth featuring on the landing page

1. **Store orders from the warehouse**  
   Discover product → cart → pin on map → order → track until delivered.

2. **Factory uses خيط as warehouse + hiring channel**  
   Profile + posts for jobs → stock with خيط → get paid/billed through receiving & bills.

3. **Worker finds a job**  
   Onboard as employee → availability on → browse job offers → comment/contact → get hired offline.

4. **Institute fills a course**  
   Publish offering → appear in institutes → students/workers discover.

5. **Business finds a marketer or shipper**  
   Open marketers or shipping directory → filter by city → call/contact.

---

## 8. What makes it useful in Syria specifically

- Built around **Arabic** roles and textile vocabulary (مشغل، معهد، متجر، أقمشة، …)
- **Governorate/area** location model, not generic “city only”
- Delivery **borders** so orders don’t accept pins outside the user’s region
- Mix of **online ordering** (warehouse) and **offline deals** (marketplace contact) matches how the industry already works
- Directories for **marketers** and **shipping companies** fill gaps WhatsApp groups don’t structure well

---

## 9. Internal dashboard (mention lightly on landing, or “for partners”)

Not the consumer app, but part of the story of reliability:

- Admins: users, moderation, locations, categories, shipping companies
- Inventory: stock, receiving, bills
- Delivery: batches, drivers, status updates
- Super admin: full control

Landing angle: *“Behind the app, a real warehouse and ops team fulfill your orders.”*

---

## 10. Suggested landing-page sections (structure only)

1. Hero — name خيط + one sentence (marketplace + warehouse)
2. Who it’s for — 4–6 role cards
3. How it works — 3 steps (discover → connect or order → deliver/grow)
4. Marketplace features — posts, directories, profiles
5. Warehouse features — cart, tracking, delivery
6. Trust & local — locations, borders, verified, notifications
7. CTA — download app / request access / contact
8. Optional — for factories “put stock with us”; for stores “order today”

---

## 11. Tone & brand notes

- Professional but approachable; industry-first, not “generic social network”
- Emphasize **work and trade**, not entertainment (reels exist but are secondary)
- Arabic-first copy on the site if the audience is local; English OK for investors/partners
- Avoid overselling “full e-commerce for everything” — many marketplace deals stay offline by design

---

## 12. Facts to avoid getting wrong

- Stores/workshops order **platform warehouse products**, not arbitrary peer checkout for every post.
- Shipping companies in the directory are primarily **listings**, not full in-app carrier checkout.
- Marketers have a **public list + profiles**; they’re app users (not admin-only ghosts anymore).
- Onboarding for store/workshop needs business name, description, experience; **services & image are optional** at signup.
- User `avatarUrl` and business/shipping `imageUrl` always resolve to a URL (placeholder if empty).

---

## 13. One-paragraph “about” (paste-ready)

خيط هي منصة لصناعة الألبسة في سوريا تجمع المصانع والمتاجر والعمال والمعاهد والمسوقين وشركات الشحن في مكان واحد. تساعدك على اكتشاف العملاء والموردين وفرص العمل، كما تتيح للمتاجر طلب بضاعة من مستودع خيط وتتبع الطلب حتى التوصيل — مع ملفات شخصية، منشورات، وإشعارات تبقي الجميع على تواصل.

**English:** Khayt is a Syrian clothing-industry platform that connects factories, stores, workers, institutes, marketers, and shipping companies. Discover partners and jobs in one place — and let stores order from Khayt’s warehouse with full order tracking.

---

*End of brief. For API field nullability see `docs/08-nullability.md`. For deeper product design see `docs/01-overview.md`–`05-screens.md`.*
