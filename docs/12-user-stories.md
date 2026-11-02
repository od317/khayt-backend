# خيط — User Stories by Role

> User-focused outcomes for the app and dashboard roles defined by the
> current role catalog. Acceptance criteria describe the documented system
> behavior; they are not a claim that every screen is implemented in every
> client.

## Shared account stories

### Any signed-in user

**Story:** As a user, I want to sign in with my phone and verify a code so I
can access the features for my role.

**Acceptance criteria**

- A successful verification returns the user's role and session tokens.
- Only the latest successful login for the account remains active.
- A user can view and update their own profile.

## App roles

### Employee (`employee`)

**Story:** As an employee in the textile industry, I want to present my skills,
availability, and work or service posts so workshops and stores can find and
contact me.

**Acceptance criteria**

- I can create and manage my own job-seeking and service-related posts.
- I can set whether I am available for work.
- I can browse posts, businesses, and other relevant opportunities, and
  interact with posts.
- I cannot place warehouse orders as an employee.

### Workshop or factory (`workshop`)

**Story:** As a workshop owner, I want to present my business and products,
manage waraehouse supply, and handle incoming store orders so customers and
the platform can work with my workshop.

**Acceptance criteria**

- I can complete business setup and maintain my business profile, services,
  and image.
- I can browse products assigned to workshops or to both stores and workshops.
- I can place eligible warehouse orders and view orders associated with my
  account.
- I can view my supply and related account information.
- I can publish and manage my own posts and reels, subject to post review.

### Store (`store`)

**Story:** As a store owner, I want to discover products and suppliers, order
available warehouse stock, and track delivery so I can replenish my store.

**Acceptance criteria**

- I can complete business setup and maintain my store profile.
- I can browse products assigned to stores or to both stores and workshops.
- I can add eligible products to my cart and place warehouse orders.
- I can view and track my own orders.
- I can discover businesses and posts, and save or interact with content.

### Institute (`institute`)

**Story:** As an institute representative, I want to set up my institute and
publish training and service information so people in the textile industry
can discover and contact us.

**Acceptance criteria**

- I am prompted to provide business details during setup.
- I can maintain my institute profile and publish or manage my own posts.
- I can discover relevant people, businesses, and posts, and interact with
  content.
- I do not receive store or workshop product-catalog visibility solely from
  the institute role.

### Marketer (`marketer`)

**Story:** As a marketer, I want people in the textile industry to find my
public profile and promoted offerings so I can connect them with relevant
products and services.

**Acceptance criteria**

- My marketer profile can be discovered in the app's marketer directory.
- Users can view the public marketer information and contact details that
  are available.
- The profile is presented as an independent marketer, not as a verified
  business.
- I can use the general post interactions available to my account.

### Shipping company (`shipping_company`)

**Story:** As a shipping provider, I want stores and workshops to find my
company's service information so they can contact us about delivery.

**Acceptance criteria**

- My shipping company information can be presented in the public directory.
- Users can view available coverage, delivery, fleet, pricing, and contact
  information.
- Delivery execution and delivery-state updates remain restricted to
  delivery staff and authorized administrators.

## Internal dashboard roles

### Administrator (`admin`)

**Story:** As an administrator, I want to manage users and public content and
oversee platform operations so the marketplace remains accurate and safe.

**Acceptance criteria**

- I can review and moderate posts, manage users, and maintain directory and
  catalog information allowed to administrators.
- I can access operational areas needed to oversee orders and inventory.
- I cannot create or manage other administrator accounts.
- Payment and bill management reserved for super administrators or inventory
  staff is not available to me.

### Super administrator (`super_admin`)

**Story:** As a super administrator, I want full platform administration so
I can manage staff access and resolve operational and financial issues.

**Acceptance criteria**

- I can perform administrator operations.
- I can create and manage administrator accounts.
- I can access privileged payment and bill-management operations.

### Inventory staff (`inventory`)

**Story:** As inventory staff, I want to record received goods, manage stock,
and record bills and payments so warehouse availability and supplier balances
stay accurate.

**Acceptance criteria**

- I can create receiving records and manage inventory.
- I can manage bills and record payments.
- I can create and update platform products.
- I can view the stock information needed for warehouse operations.

### Delivery staff (`delivery`)

**Story:** As delivery staff, I want to assign and update deliveries so orders
can be handed to drivers and their outcomes recorded.

**Acceptance criteria**

- I can view delivery work and available drivers.
- I can assign a driver to a delivery.
- I can update delivery status, including delivered or failed outcomes.
- I cannot perform inventory or administrator-only management.

## Scope notes

- The six app roles are selectable roles; `admin`, `super_admin`, `inventory`,
  and `delivery` are internal roles.
- Product audience is selected by staff. Store and workshop users see their
  respective audience plus products marked `both`.
- New posts are subject to moderation before appearing in the public feed.
- Some business flows, such as a store arranging a direct purchase from a
  workshop, are completed outside the platform.
