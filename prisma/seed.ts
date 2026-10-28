// prisma/seed.ts
import { CategoryApplies, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding…');

  /* ============================================================
     ROLES (Commented out)
  ============================================================ */
  // Roles seeding logic bypassed for now...

  // ============================================================
  // CATEGORIES (Kept active)
  // ============================================================
  const categories = [
    // ── Business categories (appliesTo: business) ──
    { id: 'cat-biz-factory', name: 'مشاغل', slug: 'masane', appliesTo: CategoryApplies.workshop, sortOrder: 300 },
    { id: 'cat-biz-store', name: 'متاجر', slug: 'matajer', appliesTo: CategoryApplies.store, sortOrder: 320 },
    { id: 'cat-biz-institute', name: 'معاهد تدريب', slug: 'maahid-tadrib', appliesTo: CategoryApplies.institute, sortOrder: 330 },
    // ── Original 10 ──
    { id: 'cat-qumsan', name: 'قمصان', slug: 'qumsan', appliesTo: CategoryApplies.both, sortOrder: 10 },
    { id: 'cat-bantal', name: 'بنطال', slug: 'bantal', appliesTo: CategoryApplies.both, sortOrder: 20 },
    { id: 'cat-fustan', name: 'فساتين', slug: 'fustan', appliesTo: CategoryApplies.product, sortOrder: 30 },
    { id: 'cat-aqmsha', name: 'أقمشة', slug: 'aqmsha', appliesTo: CategoryApplies.product, sortOrder: 40 },
    { id: 'cat-maknat', name: 'مكنات', slug: 'maknat', appliesTo: CategoryApplies.product, sortOrder: 50 },
    { id: 'cat-khadamat', name: 'خدمات خياطة', slug: 'khadamat-khiyata', appliesTo: CategoryApplies.post, sortOrder: 60 },
    { id: 'cat-tatriz', name: 'تطريز', slug: 'tatriz', appliesTo: CategoryApplies.post, sortOrder: 70 },
    { id: 'cat-wazaif', name: 'وظائف خياطة', slug: 'wazaif-khiyata', appliesTo: CategoryApplies.post, sortOrder: 80 },
    { id: 'cat-dawrat', name: 'دورات تدريب', slug: 'dawrat-tadrib', appliesTo: CategoryApplies.post, sortOrder: 90 },
    { id: 'cat-adawat', name: 'أدوات', slug: 'adawat', appliesTo: CategoryApplies.product, sortOrder: 100 },
    // ── Fabric types (appliesTo: product) ──
    { id: 'cat-qutn', name: 'قطن', slug: 'qutn', appliesTo: CategoryApplies.product, sortOrder: 110 },
    { id: 'cat-harir', name: 'حرير', slug: 'harir', appliesTo: CategoryApplies.product, sortOrder: 120 },
    { id: 'cat-suf', name: 'صوف', slug: 'suf', appliesTo: CategoryApplies.product, sortOrder: 130 },
    { id: 'cat-ktan', name: 'كتان', slug: 'ktan', appliesTo: CategoryApplies.product, sortOrder: 140 },
    { id: 'cat-jinz', name: 'جينز', slug: 'jinz', appliesTo: CategoryApplies.product, sortOrder: 150 },
    { id: 'cat-shatan', name: 'ساتان', slug: 'shatan', appliesTo: CategoryApplies.product, sortOrder: 160 },
    { id: 'cat-makhmal', name: 'مخمل', slug: 'makhmal', appliesTo: CategoryApplies.product, sortOrder: 170 },
    // ── Garment types (appliesTo: both) ──
    { id: 'cat-taqm', name: 'أطقم', slug: 'taqm', appliesTo: CategoryApplies.both, sortOrder: 180 },
    { id: 'cat-jaket', name: 'جاكيتات', slug: 'jaket', appliesTo: CategoryApplies.both, sortOrder: 190 },
    { id: 'cat-mueataf', name: 'معاطف', slug: 'mueataf', appliesTo: CategoryApplies.product, sortOrder: 200 },
    { id: 'cat-tannoura', name: 'تنانير', slug: 'tannoura', appliesTo: CategoryApplies.product, sortOrder: 210 },
    { id: 'cat-malabis-atfal', name: 'ملابس أطفال', slug: 'malabis-atfal', appliesTo: CategoryApplies.both, sortOrder: 220 },
    // ── Services (appliesTo: post) ──
    { id: 'cat-tasmin', name: 'تصميم أزياء', slug: 'tasmin-azia', appliesTo: CategoryApplies.post, sortOrder: 230 },
    { id: 'cat-tarmim', name: 'ترميم وتعديل', slug: 'tarmim-tadeel', appliesTo: CategoryApplies.post, sortOrder: 240 },
    // ── Materials & tools (appliesTo: product) ──
    { id: 'cat-khayut', name: 'خيوط', slug: 'khayut', appliesTo: CategoryApplies.product, sortOrder: 250 },
    { id: 'cat-azrar', name: 'أزرار وسحابات', slug: 'azrar-sahabat', appliesTo: CategoryApplies.product, sortOrder: 260 },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      create: c,
      update: c,
    });
  }
  console.log(`  categories seeded: ${categories.length}`);

  /* ============================================================
     LOCATIONS & DUMMY USERS (Commented out)
  ============================================================ */
  // Locations and dummy users bypassed for now...

  // ============================================================
  // SUPER ADMIN (Updated based on your request)
  // ============================================================
  const superEmail = 'odrbas238@gmail.com';
  const superPassword = 'o12345678';

  // Hash the password so the NestJS backend can verify it properly on login
  const passwordHash = await bcrypt.hash(superPassword, 12);

  await prisma.user.upsert({
    where: { email: superEmail },
    create: {
      email: superEmail,
      passwordHash,
      name: 'Super Admin',
      role: UserRole.super_admin,
      onboardingCompleted: true,
      verified: true,
    },
    update: {
      passwordHash,
      role: UserRole.super_admin,
      onboardingCompleted: true,
      verified: true,
    },
  });
  console.log(`  superadmin created/updated successfully: ${superEmail}`);

  /* ============================================================
     BUSINESSES, PRODUCTS, POSTS, REELS, NOTIFICATIONS (Commented out)
  ============================================================ */
  // All other dummy data bypassed for now...

  console.log('Done.');
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });