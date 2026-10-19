// prisma/seed.ts
//
// Dummy data for local development. Idempotent — safe to re-run.
//
//   npm run db:seed     upsert everything
//   npm run db:reset    wipe the DB, re-run migrations, then seed
//
// Uses fixed IDs so re-running updates the same rows instead of
// creating duplicates.

import {
  BusinessType,
  CategoryApplies,
  MediaType,
  NotificationType,
  PostOptionKind,
  PostType,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const HOUR = 60 * 60 * 1000;
const hoursAgo = (n: number): Date => new Date(Date.now() - n * HOUR);

async function main(): Promise<void> {
  console.log('Seeding…');

  // ------------------------------------------------------------
  // Roles
  // ------------------------------------------------------------
  const roles = [
    {
      id: 'role-employee',
      value: 'employee',
      label: 'موظف',
      selectable: true,
      system: true,
      sortOrder: 10,
    },
    {
      id: 'role-workshop',
      value: 'workshop',
      label: 'مشغل / معمل',
      selectable: true,
      system: true,
      sortOrder: 20,
    },
    {
      id: 'role-store',
      value: 'store',
      label: 'متجر',
      selectable: true,
      system: true,
      sortOrder: 30,
    },
    {
      id: 'role-marketer',
      value: 'marketer',
      label: 'مسوق',
      selectable: true,
      system: true,
      sortOrder: 35,
    },
    {
      id: 'role-shipping-company',
      value: 'shipping_company',
      label: 'شركة شحن',
      selectable: true,
      system: true,
      sortOrder: 36,
    },
    {
      id: 'role-institute',
      value: 'institute',
      label: 'معهد',
      selectable: false,
      system: true,
      sortOrder: 40,
    },
    {
      id: 'role-super-admin',
      value: 'super_admin',
      label: 'مدير عام',
      selectable: false,
      system: true,
      sortOrder: 100,
    },
    {
      id: 'role-admin',
      value: 'admin',
      label: 'مدير',
      selectable: false,
      system: true,
      sortOrder: 110,
    },
    {
      id: 'role-inventory',
      value: 'inventory',
      label: 'مستودع',
      selectable: false,
      system: true,
      sortOrder: 120,
    },
    {
      id: 'role-delivery',
      value: 'delivery',
      label: 'توصيل',
      selectable: false,
      system: true,
      sortOrder: 130,
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {
        value: role.value,
        label: role.label,
        selectable: role.selectable,
        system: role.system,
        sortOrder: role.sortOrder,
      },
      create: { ...role, description: '' },
    });
  }

  // ------------------------------------------------------------
  // Categories
  // ------------------------------------------------------------
  const categories = [
    // ── Business categories (appliesTo: business) ──
    {
      id: 'cat-biz-factory',
      name: 'مشاغل',
      slug: 'masane',
      appliesTo: CategoryApplies.workshop,
      sortOrder: 300,
    },
    {
      id: 'cat-biz-store',
      name: 'متاجر',
      slug: 'matajer',
      appliesTo: CategoryApplies.store,
      sortOrder: 320,
    },
    {
      id: 'cat-biz-institute',
      name: 'معاهد تدريب',
      slug: 'maahid-tadrib',
      appliesTo: CategoryApplies.institute,
      sortOrder: 330,
    },
    // ═════════════════════════════════════════
    // Original 10
    // ═════════════════════════════════════════
    {
      id: 'cat-qumsan',
      name: 'قمصان',
      slug: 'qumsan',
      appliesTo: CategoryApplies.both,
      sortOrder: 10,
    },
    {
      id: 'cat-bantal',
      name: 'بنطال',
      slug: 'bantal',
      appliesTo: CategoryApplies.both,
      sortOrder: 20,
    },
    {
      id: 'cat-fustan',
      name: 'فساتين',
      slug: 'fustan',
      appliesTo: CategoryApplies.product,
      sortOrder: 30,
    },
    {
      id: 'cat-aqmsha',
      name: 'أقمشة',
      slug: 'aqmsha',
      appliesTo: CategoryApplies.product,
      sortOrder: 40,
    },
    {
      id: 'cat-maknat',
      name: 'مكنات',
      slug: 'maknat',
      appliesTo: CategoryApplies.product,
      sortOrder: 50,
    },
    {
      id: 'cat-khadamat',
      name: 'خدمات خياطة',
      slug: 'khadamat-khiyata',
      appliesTo: CategoryApplies.post,
      sortOrder: 60,
    },
    {
      id: 'cat-tatriz',
      name: 'تطريز',
      slug: 'tatriz',
      appliesTo: CategoryApplies.post,
      sortOrder: 70,
    },
    {
      id: 'cat-wazaif',
      name: 'وظائف خياطة',
      slug: 'wazaif-khiyata',
      appliesTo: CategoryApplies.post,
      sortOrder: 80,
    },
    {
      id: 'cat-dawrat',
      name: 'دورات تدريب',
      slug: 'dawrat-tadrib',
      appliesTo: CategoryApplies.post,
      sortOrder: 90,
    },
    {
      id: 'cat-adawat',
      name: 'أدوات',
      slug: 'adawat',
      appliesTo: CategoryApplies.product,
      sortOrder: 100,
    },

    // ═════════════════════════════════════════
    // New categories (15)
    // ═════════════════════════════════════════

    // ── Fabric types (appliesTo: product) ──
    {
      id: 'cat-qutn',
      name: 'قطن',
      slug: 'qutn',
      appliesTo: CategoryApplies.product,
      sortOrder: 110,
    },
    {
      id: 'cat-harir',
      name: 'حرير',
      slug: 'harir',
      appliesTo: CategoryApplies.product,
      sortOrder: 120,
    },
    {
      id: 'cat-suf',
      name: 'صوف',
      slug: 'suf',
      appliesTo: CategoryApplies.product,
      sortOrder: 130,
    },
    {
      id: 'cat-ktan',
      name: 'كتان',
      slug: 'ktan',
      appliesTo: CategoryApplies.product,
      sortOrder: 140,
    },
    {
      id: 'cat-jinz',
      name: 'جينز',
      slug: 'jinz',
      appliesTo: CategoryApplies.product,
      sortOrder: 150,
    },
    {
      id: 'cat-shatan',
      name: 'ساتان',
      slug: 'shatan',
      appliesTo: CategoryApplies.product,
      sortOrder: 160,
    },
    {
      id: 'cat-makhmal',
      name: 'مخمل',
      slug: 'makhmal',
      appliesTo: CategoryApplies.product,
      sortOrder: 170,
    },

    // ── Garment types (appliesTo: both) ──
    {
      id: 'cat-taqm',
      name: 'أطقم',
      slug: 'taqm',
      appliesTo: CategoryApplies.both,
      sortOrder: 180,
    },
    {
      id: 'cat-jaket',
      name: 'جاكيتات',
      slug: 'jaket',
      appliesTo: CategoryApplies.both,
      sortOrder: 190,
    },
    {
      id: 'cat-mueataf',
      name: 'معاطف',
      slug: 'mueataf',
      appliesTo: CategoryApplies.product,
      sortOrder: 200,
    },
    {
      id: 'cat-tannoura',
      name: 'تنانير',
      slug: 'tannoura',
      appliesTo: CategoryApplies.product,
      sortOrder: 210,
    },
    {
      id: 'cat-malabis-atfal',
      name: 'ملابس أطفال',
      slug: 'malabis-atfal',
      appliesTo: CategoryApplies.both,
      sortOrder: 220,
    },

    // ── Services (appliesTo: post) ──
    {
      id: 'cat-tasmin',
      name: 'تصميم أزياء',
      slug: 'tasmin-azia',
      appliesTo: CategoryApplies.post,
      sortOrder: 230,
    },
    {
      id: 'cat-tarmim',
      name: 'ترميم وتعديل',
      slug: 'tarmim-tadeel',
      appliesTo: CategoryApplies.post,
      sortOrder: 240,
    },

    // ── Materials & tools (appliesTo: product) ──
    {
      id: 'cat-khayut',
      name: 'خيوط',
      slug: 'khayut',
      appliesTo: CategoryApplies.product,
      sortOrder: 250,
    },
    {
      id: 'cat-azrar',
      name: 'أزرار وسحابات',
      slug: 'azrar-sahabat',
      appliesTo: CategoryApplies.product,
      sortOrder: 260,
    },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      create: c,
      update: c,
    });
  }
  console.log(`  categories: ${categories.length}`);

  // ------------------------------------------------------------
  // Locations
  // ------------------------------------------------------------
  const cities: { id: string; name: string; sortOrder: number }[] = [
    { id: 'loc-damascus', name: 'دمشق', sortOrder: 1 },
    { id: 'loc-rural-damascus', name: 'ريف دمشق', sortOrder: 2 },
    { id: 'loc-halep', name: 'حلب', sortOrder: 3 },
    { id: 'loc-homs', name: 'حمص', sortOrder: 4 },
    { id: 'loc-hama', name: 'حماة', sortOrder: 5 },
    { id: 'loc-lattakia', name: 'اللاذقية', sortOrder: 6 },
    { id: 'loc-tartous', name: 'طرطوس', sortOrder: 7 },
    { id: 'loc-idlib', name: 'إدلب', sortOrder: 8 },
    { id: 'loc-deir-ezzor', name: 'دير الزور', sortOrder: 9 },
    { id: 'loc-hasakah', name: 'الحسكة', sortOrder: 10 },
    { id: 'loc-raqqa', name: 'الرقة', sortOrder: 11 },
    { id: 'loc-daraa', name: 'درعا', sortOrder: 12 },
    { id: 'loc-sweida', name: 'السويداء', sortOrder: 13 },
    { id: 'loc-quneitra', name: 'القنيطرة', sortOrder: 14 },
    { id: 'loc-outside-syria', name: 'خارج سوريا', sortOrder: 15 },
    { id: 'loc-remote', name: 'عمل عن بعد', sortOrder: 16 },
  ];

  for (const c of cities) {
    await prisma.location.upsert({
      where: { id: c.id },
      create: c,
      update: { name: c.name, sortOrder: c.sortOrder },
    });
  }

  const areas: {
    id: string;
    name: string;
    parentId: string;
    sortOrder: number;
  }[] = [
      // دمشق
      {
        id: 'loc-damascus-mazzeh',
        name: 'المزة',
        parentId: 'loc-damascus',
        sortOrder: 1,
      },
      {
        id: 'loc-damascus-midan',
        name: 'الميدان',
        parentId: 'loc-damascus',
        sortOrder: 2,
      },
      {
        id: 'loc-damascus-bab-touma',
        name: 'باب توما',
        parentId: 'loc-damascus',
        sortOrder: 3,
      },
      {
        id: 'loc-damascus-shaalan',
        name: 'الشعلان',
        parentId: 'loc-damascus',
        sortOrder: 4,
      },
      {
        id: 'loc-damascus-kafarsouseh',
        name: 'كفرسوسة',
        parentId: 'loc-damascus',
        sortOrder: 5,
      },
      {
        id: 'loc-damascus-rukneddin',
        name: 'ركن الدين',
        parentId: 'loc-damascus',
        sortOrder: 6,
      },
      {
        id: 'loc-damascus-tijara',
        name: 'التجارة',
        parentId: 'loc-damascus',
        sortOrder: 7,
      },
      {
        id: 'loc-damascus-mazraa',
        name: 'المزرعة',
        parentId: 'loc-damascus',
        sortOrder: 8,
      },
      // ريف دمشق
      {
        id: 'loc-rural-damascus-duma',
        name: 'دوما',
        parentId: 'loc-rural-damascus',
        sortOrder: 1,
      },
      {
        id: 'loc-rural-damascus-daraya',
        name: 'داريا',
        parentId: 'loc-rural-damascus',
        sortOrder: 2,
      },
      {
        id: 'loc-rural-damascus-qudsaya',
        name: 'قدسيا',
        parentId: 'loc-rural-damascus',
        sortOrder: 3,
      },
      {
        id: 'loc-rural-damascus-zabadani',
        name: 'الزبداني',
        parentId: 'loc-rural-damascus',
        sortOrder: 4,
      },
      {
        id: 'loc-rural-damascus-nabk',
        name: 'النبك',
        parentId: 'loc-rural-damascus',
        sortOrder: 5,
      },
      {
        id: 'loc-rural-damascus-yabroud',
        name: 'يبرود',
        parentId: 'loc-rural-damascus',
        sortOrder: 6,
      },
      {
        id: 'loc-rural-damascus-tel',
        name: 'التل',
        parentId: 'loc-rural-damascus',
        sortOrder: 7,
      },
      // حلب
      {
        id: 'loc-halep-jamiliya',
        name: 'الجميلية',
        parentId: 'loc-halep',
        sortOrder: 1,
      },
      {
        id: 'loc-halep-aziziyeh',
        name: 'العزيزية',
        parentId: 'loc-halep',
        sortOrder: 2,
      },
      {
        id: 'loc-halep-salahaddin',
        name: 'صلاح الدين',
        parentId: 'loc-halep',
        sortOrder: 3,
      },
      {
        id: 'loc-halep-shahba',
        name: 'الشهباء',
        parentId: 'loc-halep',
        sortOrder: 4,
      },
      {
        id: 'loc-halep-sukkari',
        name: 'السكري',
        parentId: 'loc-halep',
        sortOrder: 5,
      },
      {
        id: 'loc-halep-new-halep',
        name: 'حلب الجديدة',
        parentId: 'loc-halep',
        sortOrder: 6,
      },
      {
        id: 'loc-halep-sheikh-maqsoud',
        name: 'الشيخ مقصود',
        parentId: 'loc-halep',
        sortOrder: 7,
      },
      // حمص
      { id: 'loc-homs-waer', name: 'الوعر', parentId: 'loc-homs', sortOrder: 1 },
      {
        id: 'loc-homs-zahra',
        name: 'الزهراء',
        parentId: 'loc-homs',
        sortOrder: 2,
      },
      {
        id: 'loc-homs-baba-amr',
        name: 'بابا عمرو',
        parentId: 'loc-homs',
        sortOrder: 3,
      },
      {
        id: 'loc-homs-khalidiya',
        name: 'الخالدية',
        parentId: 'loc-homs',
        sortOrder: 4,
      },
      {
        id: 'loc-homs-inshaat',
        name: 'الإنشاءات',
        parentId: 'loc-homs',
        sortOrder: 5,
      },
      {
        id: 'loc-homs-akrama',
        name: 'عكرمة',
        parentId: 'loc-homs',
        sortOrder: 6,
      },
      // حماة
      {
        id: 'loc-hama-hader',
        name: 'الحاضر',
        parentId: 'loc-hama',
        sortOrder: 1,
      },
      {
        id: 'loc-hama-sheikh-badr',
        name: 'الشيخ بدر',
        parentId: 'loc-hama',
        sortOrder: 2,
      },
      {
        id: 'loc-hama-qusour',
        name: 'القصور',
        parentId: 'loc-hama',
        sortOrder: 3,
      },
      {
        id: 'loc-hama-murabit',
        name: 'المرابط',
        parentId: 'loc-hama',
        sortOrder: 4,
      },
      {
        id: 'loc-hama-south-stad',
        name: 'جنوب الملعب',
        parentId: 'loc-hama',
        sortOrder: 5,
      },
      // اللاذقية
      {
        id: 'loc-lattakia-raml-south',
        name: 'الرمل الجنوبي',
        parentId: 'loc-lattakia',
        sortOrder: 1,
      },
      {
        id: 'loc-lattakia-raml-north',
        name: 'الرمل الشمالي',
        parentId: 'loc-lattakia',
        sortOrder: 2,
      },
      {
        id: 'loc-lattakia-sheikh-daher',
        name: 'الشيخ ضاهر',
        parentId: 'loc-lattakia',
        sortOrder: 3,
      },
      {
        id: 'loc-lattakia-ziraa',
        name: 'الزراعة',
        parentId: 'loc-lattakia',
        sortOrder: 4,
      },
      {
        id: 'loc-lattakia-sleibeh',
        name: 'الصليبة',
        parentId: 'loc-lattakia',
        sortOrder: 5,
      },
      // طرطوس
      {
        id: 'loc-tartous-mashrou',
        name: 'المشروع',
        parentId: 'loc-tartous',
        sortOrder: 1,
      },
      {
        id: 'loc-tartous-sheikh-saad',
        name: 'الشيخ سعد',
        parentId: 'loc-tartous',
        sortOrder: 2,
      },
      {
        id: 'loc-tartous-rmal',
        name: 'الرمال',
        parentId: 'loc-tartous',
        sortOrder: 3,
      },
      {
        id: 'loc-tartous-baniyas',
        name: 'بانياس',
        parentId: 'loc-tartous',
        sortOrder: 4,
      },
      // إدلب
      {
        id: 'loc-idlib-city',
        name: 'المدينة',
        parentId: 'loc-idlib',
        sortOrder: 1,
      },
      {
        id: 'loc-idlib-maarat-misrin',
        name: 'معرة مصرين',
        parentId: 'loc-idlib',
        sortOrder: 2,
      },
      {
        id: 'loc-idlib-ariha',
        name: 'أريحا',
        parentId: 'loc-idlib',
        sortOrder: 3,
      },
      {
        id: 'loc-idlib-jisr-shughur',
        name: 'جسر الشغور',
        parentId: 'loc-idlib',
        sortOrder: 4,
      },
      // دير الزور
      {
        id: 'loc-deir-ezzor-mayadin',
        name: 'الميادين',
        parentId: 'loc-deir-ezzor',
        sortOrder: 1,
      },
      {
        id: 'loc-deir-ezzor-bukamal',
        name: 'البوكمال',
        parentId: 'loc-deir-ezzor',
        sortOrder: 2,
      },
      {
        id: 'loc-deir-ezzor-qouriya',
        name: 'القورية',
        parentId: 'loc-deir-ezzor',
        sortOrder: 3,
      },
      // الحسكة
      {
        id: 'loc-hasakah-qamishli',
        name: 'القامشلي',
        parentId: 'loc-hasakah',
        sortOrder: 1,
      },
      {
        id: 'loc-hasakah-ras-al-ain',
        name: 'رأس العين',
        parentId: 'loc-hasakah',
        sortOrder: 2,
      },
      {
        id: 'loc-hasakah-malikiya',
        name: 'المالكية',
        parentId: 'loc-hasakah',
        sortOrder: 3,
      },
      // الرقة
      {
        id: 'loc-raqqa-tabqa',
        name: 'الطبقة',
        parentId: 'loc-raqqa',
        sortOrder: 1,
      },
      {
        id: 'loc-raqqa-tel-abyad',
        name: 'تل أبيض',
        parentId: 'loc-raqqa',
        sortOrder: 2,
      },
      // درعا
      { id: 'loc-daraa-izra', name: 'إزرع', parentId: 'loc-daraa', sortOrder: 1 },
      { id: 'loc-daraa-nawa', name: 'نوى', parentId: 'loc-daraa', sortOrder: 2 },
      {
        id: 'loc-daraa-sheikh-maskin',
        name: 'الشيخ مسكين',
        parentId: 'loc-daraa',
        sortOrder: 3,
      },
      // السويداء
      {
        id: 'loc-sweida-shahba',
        name: 'شهبا',
        parentId: 'loc-sweida',
        sortOrder: 1,
      },
      {
        id: 'loc-sweida-salkhad',
        name: 'صلخد',
        parentId: 'loc-sweida',
        sortOrder: 2,
      },
      // القنيطرة
      {
        id: 'loc-quneitra-khan-arnaba',
        name: 'خان أرنبة',
        parentId: 'loc-quneitra',
        sortOrder: 1,
      },
      {
        id: 'loc-quneitra-jubata',
        name: 'جباتا الخشب',
        parentId: 'loc-quneitra',
        sortOrder: 2,
      },
      // خارج سوريا
      {
        id: 'loc-outside-syria-jordan',
        name: 'الأردن',
        parentId: 'loc-outside-syria',
        sortOrder: 1,
      },
      {
        id: 'loc-outside-syria-turkey',
        name: 'تركيا',
        parentId: 'loc-outside-syria',
        sortOrder: 2,
      },
      {
        id: 'loc-outside-syria-lebanon',
        name: 'لبنان',
        parentId: 'loc-outside-syria',
        sortOrder: 3,
      },
      {
        id: 'loc-outside-syria-egypt',
        name: 'مصر',
        parentId: 'loc-outside-syria',
        sortOrder: 4,
      },
      {
        id: 'loc-outside-syria-gulf',
        name: 'الخليج',
        parentId: 'loc-outside-syria',
        sortOrder: 5,
      },
      {
        id: 'loc-outside-syria-europe',
        name: 'أوروبا',
        parentId: 'loc-outside-syria',
        sortOrder: 6,
      },
    ];

  for (const a of areas) {
    await prisma.location.upsert({
      where: { id: a.id },
      create: a,
      update: { name: a.name, parentId: a.parentId, sortOrder: a.sortOrder },
    });
  }
  console.log(`  locations: ${cities.length} cities, ${areas.length} areas`);

  // ------------------------------------------------------------
  // Users
  // ------------------------------------------------------------
  const users = [
    // ─────────────────────────────────────────
    // Original 6
    // ─────────────────────────────────────────
    {
      id: 'user-employee',
      phone: '+963994000001',
      name: 'أحمد الخياط',
      role: UserRole.employee,
      locationId: 'loc-damascus-mazzeh',
      onboardingCompleted: true,
    },
    {
      id: 'user-marketer',
      phone: '+963994000022',
      name: 'سامر المسوق',
      role: UserRole.marketer,
      locationId: 'loc-damascus',
      onboardingCompleted: true,
    },
    {
      id: 'user-shipping',
      phone: '+963994000023',
      name: 'شركة الشام للشحن',
      role: UserRole.shipping_company,
      locationId: 'loc-damascus',
      onboardingCompleted: true,
    },
    {
      id: 'user-workshop',
      phone: '+963994000002',
      name: 'معمل النسيج الدمشقي',
      role: UserRole.workshop,
      locationId: 'loc-damascus',
      onboardingCompleted: true,
    },
    {
      id: 'user-institute',
      phone: '+963994000003',
      name: 'معهد الخياطة',
      role: UserRole.institute,
      locationId: 'loc-damascus-midan',
      onboardingCompleted: true,
    },
    {
      id: 'user-store',
      phone: '+963994000004',
      name: 'متجر الأزياء',
      role: UserRole.store,
      locationId: 'loc-damascus',
      onboardingCompleted: true,
    },
    {
      id: 'user-admin',
      phone: '+963994000005',
      name: 'مدير النظام',
      role: UserRole.admin,
      locationId: null,
      onboardingCompleted: true,
    },
    {
      id: 'user-delivery',
      phone: '+963994000006',
      name: 'أبو محمد',
      role: UserRole.delivery,
      locationId: 'loc-damascus',
      onboardingCompleted: true,
    },

    // ─────────────────────────────────────────
    // New owners (12) — one per new business
    // ─────────────────────────────────────────
    {
      id: 'user-workshop-halep',
      phone: '+963994000007',
      name: 'معمل الشهباء للخياطة',
      role: UserRole.workshop,
      locationId: 'loc-halep',
      onboardingCompleted: true,
    },
    {
      id: 'user-workshop-homs',
      phone: '+963994000008',
      name: 'مشغل حمص للجينز',
      role: UserRole.workshop,
      locationId: 'loc-homs',
      onboardingCompleted: true,
    },
    {
      id: 'user-workshop-lattakia',
      phone: '+963994000009',
      name: 'معمل الساحل للتطريز',
      role: UserRole.workshop,
      locationId: 'loc-lattakia',
      onboardingCompleted: true,
    },
    {
      id: 'user-institute-halep',
      phone: '+963994000010',
      name: 'معهد حلب للتدريب المهني',
      role: UserRole.institute,
      locationId: 'loc-halep',
      onboardingCompleted: true,
    },
    {
      id: 'user-institute-homs',
      phone: '+963994000011',
      name: 'معهد حمص للخياطة',
      role: UserRole.institute,
      locationId: 'loc-homs',
      onboardingCompleted: true,
    },
    {
      id: 'user-store-halep',
      phone: '+963994000012',
      name: 'متجر الشهباء للأقمشة',
      role: UserRole.store,
      locationId: 'loc-halep',
      onboardingCompleted: true,
    },
    {
      id: 'user-store-babtouma',
      phone: '+963994000013',
      name: 'مؤسسة باب توما للأزياء',
      role: UserRole.store,
      locationId: 'loc-damascus-bab-touma',
      onboardingCompleted: true,
    },
    {
      id: 'user-workshop-tartous',
      phone: '+963994000014',
      name: 'معمل طرطوس للسجاد',
      role: UserRole.workshop,
      locationId: 'loc-tartous',
      onboardingCompleted: true,
    },
    {
      id: 'user-workshop-hama',
      phone: '+963994000015',
      name: 'مشغل حماة للخياطة',
      role: UserRole.workshop,
      locationId: 'loc-hama',
      onboardingCompleted: true,
    },
    {
      id: 'user-store-homs',
      phone: '+963994000016',
      name: 'متجر حمص للأزياء',
      role: UserRole.store,
      locationId: 'loc-homs',
      onboardingCompleted: true,
    },
    {
      id: 'user-institute-lattakia',
      phone: '+963994000017',
      name: 'معهد الساحل للخياطة',
      role: UserRole.institute,
      locationId: 'loc-lattakia',
      onboardingCompleted: true,
    },
    {
      id: 'user-store-damascus-midan',
      phone: '+963994000018',
      name: 'متجر الميدان للأقمشة',
      role: UserRole.store,
      locationId: 'loc-damascus-midan',
      onboardingCompleted: true,
    },
    {
      id: 'user-workshop-rural-damascus',
      phone: '+963995034013',
      name: 'معمل ريف دمشق للخياطة',
      role: UserRole.workshop,
      locationId: 'loc-rural-damascus-duma',
      onboardingCompleted: true,
    },
    {
      id: 'user-workshop-idlib',
      phone: '+963994000019',
      name: 'مشغل إدلب للخياطة',
      role: UserRole.workshop,
      locationId: 'loc-idlib',
      onboardingCompleted: true,
    },
    {
      id: 'user-workshop-daraa',
      phone: '+963994000020',
      name: 'معمل درعا للألبسة',
      role: UserRole.workshop,
      locationId: 'loc-daraa',
      onboardingCompleted: true,
    },
    {
      id: 'user-workshop-sweida',
      phone: '+963994000021',
      name: 'مشغل السويداء للتطريز',
      role: UserRole.workshop,
      locationId: 'loc-sweida',
      onboardingCompleted: true,
    },
  ];

  const SHARED_AVATAR_URL =
    'https://media.istockphoto.com/id/2060009001/vector/avatar-user-profile-person-icon-profile-picture-for-social-media-profiles-icons-screensavers.jpg?s=612x612&w=0&k=20&c=onk7rmEoISSvHVlqc-SiBvcUr8ilCm2u9kcw3_Bm_SA=';

  /** Actual DB user ids created/updated for seed accounts (may differ from seed ids). */
  const resolvedSeedUserIds: string[] = [];

  // Upsert by id, but never steal a phone already owned by another user
  // (common on VPS when real accounts reused a seed number).
  for (const u of users) {
    const verified =
      u.role !== UserRole.employee &&
      u.role !== UserRole.marketer &&
      u.role !== UserRole.shipping_company;

    const byId = await prisma.user.findUnique({ where: { id: u.id } });
    const byPhone = await prisma.user.findUnique({
      where: { phone: u.phone },
      select: { id: true },
    });

    const shared = {
      name: u.name,
      role: u.role,
      locationId: u.locationId,
      onboardingCompleted: u.onboardingCompleted,
      avatarUrl: SHARED_AVATAR_URL,
    };

    if (byId) {
      const phoneOwnedElsewhere = byPhone && byPhone.id !== u.id;
      await prisma.user.update({
        where: { id: u.id },
        data: {
          ...shared,
          ...(phoneOwnedElsewhere ? {} : { phone: u.phone }),
          verified,
        },
      });
      if (phoneOwnedElsewhere) {
        console.warn(
          `  skip phone for ${u.id}: ${u.phone} already on ${byPhone.id}`,
        );
      }
      resolvedSeedUserIds.push(u.id);
      continue;
    }

    if (byPhone) {
      // Keep the live account; refresh profile fields only.
      await prisma.user.update({
        where: { id: byPhone.id },
        data: { ...shared, verified },
      });
      console.warn(
        `  reuse ${byPhone.id} for seed phone ${u.phone} (wanted id ${u.id})`,
      );
      resolvedSeedUserIds.push(byPhone.id);
      continue;
    }

    await prisma.user.create({
      data: {
        id: u.id,
        phone: u.phone,
        ...shared,
        verified,
      },
    });
    resolvedSeedUserIds.push(u.id);
  }
  console.log(`  users: ${users.length}`);

  // ------------------------------------------------------------
  // Superadmin (from env vars — skipped if unset)
  // ------------------------------------------------------------
  const superEmail = process.env.SUPER_ADMIN_EMAIL;
  const superPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (superEmail && superPassword) {
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
    console.log('  superadmin: 1');
  } else {
    console.warn(
      '  SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set. Skipping superadmin seed.',
    );
  }

  const SHARED_IMAGE_URL =
    'https://media.istockphoto.com/id/2060009001/vector/avatar-user-profile-person-icon-profile-picture-for-social-media-profiles-icons-screensavers.jpg?s=612x612&w=0&k=20&c=onk7rmEoISSvHVlqc-SiBvcUr8ilCm2u9kcw3_Bm_SA=';


  const businesses = [
    // ═════════════════════════════════════════
    // Original 3
    // ═════════════════════════════════════════
    {
      id: 'biz-workshop',
      ownerId: 'user-workshop',
      type: BusinessType.workshop,
      name: 'معمل النسيج الدمشقي',
      location: 'دمشق - القدم',
      description: 'معمل متخصص بصناعة القمصان والبناطيل',
      phone: '+963994000002',
      imageUrl: SHARED_IMAGE_URL,
      verified: true,
      capacity: '5000 قطعة شهرياً',
      equipment: '20 ماكينة خياطة صناعية',
      minOrder: '100 قطعة',
      experience: '15 سنة',
      services: ['خياطة قمصان', 'خياطة بناطيل', 'قص وتفصيل', 'تطريز آلي'],
    },
    {
      id: 'biz-institute',
      ownerId: 'user-institute',
      type: BusinessType.institute,
      name: 'معهد الخياطة',
      location: 'دمشق - الميدان',
      description: 'دورات تدريب على الخياطة والتطريز',
      phone: '+963994000003',
      imageUrl: SHARED_IMAGE_URL,
      verified: true,
      duration: '3 أشهر',
      topics: ['خياطة أساسية', 'تطريز يدوي', 'تصميم أزياء'],
      experience: '8 سنوات',
      services: ['دورات خياطة', 'دورات تطريز', 'دورات تصميم'],
    },
    {
      id: 'biz-store',
      ownerId: 'user-store',
      type: BusinessType.store,
      name: 'متجر الأزياء',
      location: 'دمشق - الحمرا',
      description: 'متجر لبيع الملابس بالجملة',
      phone: '+963994000004',
      imageUrl: SHARED_IMAGE_URL,
      verified: false,
      services: ['بيع جملة', 'بيع مفرق', 'توصيل داخل دمشق'],
      experience: '5 سنوات',
    },

    // ═════════════════════════════════════════
    // Workshops / مشاغل (9 more → 10 total with biz-workshop)
    // ═════════════════════════════════════════
    {
      id: 'biz-workshop-halep',
      ownerId: 'user-workshop-halep',
      type: BusinessType.workshop,
      name: 'معمل الشهباء للخياطة',
      location: 'حلب - الشيخ نجار',
      description: 'معمل متخصص بالألبسة النسائية والأطفال',
      phone: '+963994000007',
      imageUrl: SHARED_IMAGE_URL,
      verified: true,
      capacity: '3000 قطعة شهرياً',
      equipment: '12 ماكينة خياطة + 2 أوفرلوك',
      minOrder: '50 قطعة',
      experience: '10 سنوات',
      services: ['خياطة فساتين', 'خياطة أطفال', 'تطريز', 'قص ليزر'],
    },
    {
      id: 'biz-workshop-homs',
      ownerId: 'user-workshop-homs',
      type: BusinessType.workshop,
      name: 'مشغل حمص للجينز',
      location: 'حمص - الوعر',
      description: 'متخصصون بصناعة الجينز بكل أنواعه',
      phone: '+963994000008',
      imageUrl: SHARED_IMAGE_URL,
      verified: true,
      capacity: '2000 قطعة شهرياً',
      equipment: '8 ماكينات جينز صناعية',
      minOrder: '30 قطعة',
      experience: '7 سنوات',
      services: ['خياطة جينز', 'تعديل جينز', 'قص جينز', 'غسيل جينز'],
    },
    {
      id: 'biz-workshop-lattakia',
      ownerId: 'user-workshop-lattakia',
      type: BusinessType.workshop,
      name: 'معمل الساحل للتطريز',
      location: 'اللاذقية - الرمل الجنوبي',
      description: 'تطريز يدوي وآلي بجودة عالية',
      phone: '+963994000009',
      imageUrl: SHARED_IMAGE_URL,
      verified: false,
      capacity: '1500 قطعة شهرياً',
      equipment: '6 ماكينات تطريز',
      minOrder: '20 قطعة',
      experience: '12 سنة',
      services: ['تطريز يدوي', 'تطريز آلي', 'شعارات', 'أسماء مطرزة'],
    },
    {
      id: 'biz-workshop-tartous',
      ownerId: 'user-workshop-tartous',
      type: BusinessType.workshop,
      name: 'معمل طرطوس للسجاد',
      location: 'طرطوس - بانياس',
      description: 'صناعة السجاد اليدوي والآلي',
      phone: '+963994000014',
      imageUrl: SHARED_IMAGE_URL,
      verified: true,
      capacity: '500 متر مربع شهرياً',
      equipment: '4 ماكينات نسيج + 2 ماكينات سجاد',
      minOrder: '10 متر مربع',
      experience: '20 سنة',
      services: ['سجاد يدوي', 'سجاد آلي', 'موكيت', 'تصميم سجاد مخصص'],
    },
    {
      id: 'biz-workshop-hama',
      ownerId: 'user-workshop-hama',
      type: BusinessType.workshop,
      name: 'مشغل حماة للخياطة',
      location: 'حماة - الحاضر',
      description: 'خياطة عامة وتعديلات',
      phone: '+963994000015',
      imageUrl: SHARED_IMAGE_URL,
      verified: false,
      capacity: '1000 قطعة شهرياً',
      equipment: '5 ماكينات خياطة',
      minOrder: '10 قطع',
      experience: '6 سنوات',
      services: ['خياطة عامة', 'تعديلات', 'خياطة أطفال', 'خياطة رجالية'],
    },
    {
      id: 'biz-workshop-damascus-rural',
      ownerId: 'user-workshop-rural-damascus',
      type: BusinessType.workshop,
      name: 'معمل ريف دمشق للخياطة',
      location: 'ريف دمشق - دوما',
      description: 'خياطة كميات كبيرة للألبسة الجاهزة',
      phone: '+963995000013',
      imageUrl: SHARED_IMAGE_URL,
      verified: true,
      capacity: '4000 قطعة شهرياً',
      equipment: '15 ماكينة خياطة صناعية',
      minOrder: '80 قطعة',
      experience: '9 سنوات',
      services: ['خياطة قمصان', 'خياطة بناطيل', 'خياطة فساتين', 'قص ليزر'],
    },
    {
      id: 'biz-workshop-idlib',
      ownerId: 'user-workshop-idlib',
      type: BusinessType.workshop,
      name: 'مشغل إدلب للخياطة',
      location: 'إدلب - سراقب',
      description: 'خياطة ألبسة رجالية ونسائية بكميات متوسطة',
      phone: '+963994000019',
      imageUrl: SHARED_IMAGE_URL,
      verified: false,
      capacity: '1200 قطعة شهرياً',
      equipment: '7 ماكينات خياطة',
      minOrder: '25 قطعة',
      experience: '8 سنوات',
      services: ['خياطة رجالية', 'خياطة نسائية', 'تعديلات', 'قص'],
    },
    {
      id: 'biz-workshop-daraa',
      ownerId: 'user-workshop-daraa',
      type: BusinessType.workshop,
      name: 'معمل درعا للألبسة',
      location: 'درعا - المدينة',
      description: 'إنتاج ألبسة جاهزة للأسواق المحلية',
      phone: '+963994000020',
      imageUrl: SHARED_IMAGE_URL,
      verified: true,
      capacity: '2500 قطعة شهرياً',
      equipment: '10 ماكينات خياطة صناعية',
      minOrder: '40 قطعة',
      experience: '11 سنة',
      services: ['خياطة قمصان', 'خياطة بناطيل', 'خياطة أطفال', 'تغليف'],
    },
    {
      id: 'biz-workshop-sweida',
      ownerId: 'user-workshop-sweida',
      type: BusinessType.workshop,
      name: 'مشغل السويداء للتطريز',
      location: 'السويداء - المركز',
      description: 'تطريز تقليدي وآلي على الألبسة والمفروشات',
      phone: '+963994000021',
      imageUrl: SHARED_IMAGE_URL,
      verified: true,
      capacity: '800 قطعة شهرياً',
      equipment: '4 ماكينات تطريز + 3 ماكينات خياطة',
      minOrder: '15 قطعة',
      experience: '14 سنة',
      services: ['تطريز تقليدي', 'تطريز آلي', 'مفروشات', 'ألبسة مطرزة'],
    },

    // ═════════════════════════════════════════
    // New institutes (3)
    // ═════════════════════════════════════════
    {
      id: 'biz-institute-halep',
      ownerId: 'user-institute-halep',
      type: BusinessType.institute,
      name: 'معهد حلب للتدريب المهني',
      location: 'حلب - العزيزية',
      description: 'دورات مهنية في الخياطة والتصميم',
      phone: '+963994000010',
      imageUrl: SHARED_IMAGE_URL,
      verified: true,
      duration: '6 أشهر',
      topics: ['خياطة متقدمة', 'تصميم أزياء', 'باترون', 'تطريز'],
      experience: '10 سنوات',
      services: ['دورات خياطة', 'دورات باترون', 'دورات تصميم'],
    },
    {
      id: 'biz-institute-homs',
      ownerId: 'user-institute-homs',
      type: BusinessType.institute,
      name: 'معهد حمص للخياطة',
      location: 'حمص - الإنشاءات',
      description: 'تعليم الخياطة من الصفر حتى الاحتراف',
      phone: '+963994000011',
      imageUrl: SHARED_IMAGE_URL,
      verified: false,
      duration: '4 أشهر',
      topics: ['خياطة أساسية', 'خياطة متقدمة', 'تطريز يدوي'],
      experience: '5 سنوات',
      services: ['دورات خياطة', 'دورات تطريز'],
    },
    {
      id: 'biz-institute-lattakia',
      ownerId: 'user-institute-lattakia',
      type: BusinessType.institute,
      name: 'معهد الساحل للخياطة',
      location: 'اللاذقية - الزراعة',
      description: 'دورات خياطة وتصميم للسيدات',
      phone: '+963994000017',
      imageUrl: SHARED_IMAGE_URL,
      verified: true,
      duration: '3 أشهر',
      topics: ['خياطة نسائية', 'تصميم أزياء', 'تطريز'],
      experience: '7 سنوات',
      services: ['دورات خياطة نسائية', 'دورات تصميم', 'دورات تطريز'],
    },

    // ═════════════════════════════════════════
    // New stores (4)
    // ═════════════════════════════════════════
    {
      id: 'biz-store-halep',
      ownerId: 'user-store-halep',
      type: BusinessType.store,
      name: 'متجر الشهباء للأقمشة',
      location: 'حلب - الجميلية',
      description: 'أقمشة محلية ومستوردة بالجملة والمفرق',
      phone: '+963994000012',
      imageUrl: SHARED_IMAGE_URL,
      verified: true,
      services: ['بيع أقمشة', 'بيع جملة', 'توصيل'],
      experience: '15 سنة',
    },
    {
      id: 'biz-store-babtouma',
      ownerId: 'user-store-babtouma',
      type: BusinessType.store,
      name: 'مؤسسة باب توما للأزياء',
      location: 'دمشق - باب توما',
      description: 'بيع الألبسة الرجالية والنسائية',
      phone: '+963994000013',
      imageUrl: SHARED_IMAGE_URL,
      verified: true,
      services: ['بيع ملابس رجالية', 'بيع ملابس نسائية', 'بيع مفرق'],
      experience: '8 سنوات',
    },
    {
      id: 'biz-store-homs',
      ownerId: 'user-store-homs',
      type: BusinessType.store,
      name: 'متجر حمص للأزياء',
      location: 'حمص - الزهراء',
      description: 'ملابس رجالية ونسائية وأطفال',
      phone: '+963994000016',
      imageUrl: SHARED_IMAGE_URL,
      verified: false,
      services: ['بيع ملابس أطفال', 'بيع ملابس رجالية', 'بيع جملة'],
      experience: '4 سنوات',
    },
    {
      id: 'biz-store-midan',
      ownerId: 'user-store-damascus-midan',
      type: BusinessType.store,
      name: 'متجر الميدان للأقمشة',
      location: 'دمشق - الميدان',
      description: 'أقمشة متنوعة بالجملة',
      phone: '+963994000018',
      imageUrl: SHARED_IMAGE_URL,
      verified: true,
      services: ['بيع أقمشة', 'بيع جملة', 'قص بالمتر'],
      experience: '12 سنة',
    },
  ];

  for (const b of businesses) {
    const { id, ...rest } = b;
    await prisma.business.upsert({
      where: { id },
      create: { id, ...rest },
      update: rest,
    });
  }
  console.log(`  businesses: ${businesses.length}`);

  // ------------------------------------------------------------
  // Business ↔ Category links
  // ------------------------------------------------------------
  const businessCategories: { businessId: string; categoryId: string }[] = [
    // Stores (متاجر) → cat-biz-store
    { businessId: 'biz-store', categoryId: 'cat-biz-store' },
    { businessId: 'biz-store-halep', categoryId: 'cat-biz-store' },
    { businessId: 'biz-store-babtouma', categoryId: 'cat-biz-store' },
    { businessId: 'biz-store-homs', categoryId: 'cat-biz-store' },
    { businessId: 'biz-store-midan', categoryId: 'cat-biz-store' },

    // Workshops (مشاغل) → cat-biz-factory
    { businessId: 'biz-workshop', categoryId: 'cat-biz-factory' },
    { businessId: 'biz-workshop-halep', categoryId: 'cat-biz-factory' },
    { businessId: 'biz-workshop-homs', categoryId: 'cat-biz-factory' },
    { businessId: 'biz-workshop-lattakia', categoryId: 'cat-biz-factory' },
    { businessId: 'biz-workshop-tartous', categoryId: 'cat-biz-factory' },
    { businessId: 'biz-workshop-hama', categoryId: 'cat-biz-factory' },
    { businessId: 'biz-workshop-damascus-rural', categoryId: 'cat-biz-factory' },
    { businessId: 'biz-workshop-idlib', categoryId: 'cat-biz-factory' },
    { businessId: 'biz-workshop-daraa', categoryId: 'cat-biz-factory' },
    { businessId: 'biz-workshop-sweida', categoryId: 'cat-biz-factory' },

    // Institutes (معاهد تدريب) → cat-biz-institute
    { businessId: 'biz-institute', categoryId: 'cat-biz-institute' },
    { businessId: 'biz-institute-halep', categoryId: 'cat-biz-institute' },
    { businessId: 'biz-institute-homs', categoryId: 'cat-biz-institute' },
    { businessId: 'biz-institute-lattakia', categoryId: 'cat-biz-institute' },
  ];

  for (const { businessId, categoryId } of businessCategories) {
    await prisma.businessCategory.upsert({
      where: { businessId_categoryId: { businessId, categoryId } },
      create: { businessId, categoryId },
      update: {},
    });
  }
  console.log(`  business-category links: ${businessCategories.length}`);

  // ------------------------------------------------------------
  // Products
  // ------------------------------------------------------------
  const SEED_PRODUCT_IMAGES = [
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNO36XKY6a7gCZq0CK5bQrqrMjc-VhMWm9QQVwp4TNoQ&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTa1QmlzxwBlPlhmh6w8BM8dXFL2S3ZP4bguvtm95gAPA&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhR3LHcBAtCvq4XSONggJ4YkLOAKw__X9FhcNn2Ub_vw&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQAN_ZqGHFHlICnFwCJjRicONciTe4mqpEBMskNq8cxiA&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrOR8d4UkHfokUTnYTV-otgB3EeTggqTLDygpiUoQsWA&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNCylkV5skeNMNpCQhX-961pGYzfUSBZtRmvoSIB415Q&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSY7qvAGoDTbUQsKMssRSOLZSVyYaG4m_udZGcvP6gPhg&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSO0Hh_Rjs7z4Soe4g6CpLP2Cc2kAIDLTsuEQe58n2SDg&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRJv_Mx0w3DSyEB9v_92JFXljfRYIyk5osskJ7sNmBog&s=10',
  ] as const;

  const SEED_SIZES = ['small', 'medium', 'large', 'xl', 'xxl'] as const;

  const SEED_COLORS = [
    { name: 'كاروهات', hex: '#2563EB', img: 0 },
    { name: 'بني', hex: '#92400E', img: 1 },
    { name: 'أزرق', hex: '#1E3A8A', img: 2 },
    { name: 'أخضر', hex: '#166534', img: 3 },
    { name: 'وردي', hex: '#DB2777', img: 4 },
    { name: 'أسود', hex: '#111827', img: 6 },
  ] as const;

  const sizeChildren = (image: string) =>
    SEED_SIZES.map((name) => ({ name, image }));

  /** Color → size tree; reuses SEED_PRODUCT_IMAGES (optionally rotated per product). */
  const colorSizeVariants = (imageOffset = 0) => ({
    axes: [
      { key: 'color', label: 'لون' },
      { key: 'size', label: 'قياس' },
    ],
    options: SEED_COLORS.map((color, i) => {
      const imgIndex =
        (color.img + imageOffset) % SEED_PRODUCT_IMAGES.length;
      const image = SEED_PRODUCT_IMAGES[imgIndex]!;
      const alt =
        SEED_PRODUCT_IMAGES[(imgIndex + 1) % SEED_PRODUCT_IMAGES.length]!;
      return {
        name: color.name,
        hex: color.hex,
        image,
        images: i === SEED_COLORS.length - 1 ? [image, alt] : [image],
        children: sizeChildren(image),
      };
    }),
  });

  /** Same workshop + category as prod-qamis-abyad for similar-products demos */
  const similarQamisAbyadSeed = [
    { id: 'prod-qamis-sim-01', name: 'قميص كاروهات كلاسيك', img: 0, price: 42000 },
    { id: 'prod-qamis-sim-02', name: 'قميص بني قصير الكم', img: 1, price: 38000 },
    { id: 'prod-qamis-sim-03', name: 'قميص أزرق مخملي', img: 2, price: 41000 },
    { id: 'prod-qamis-sim-04', name: 'قميص أخضر ريب', img: 3, price: 39500 },
    { id: 'prod-qamis-sim-05', name: 'قميص وردي صيفي', img: 4, price: 44000 },
    { id: 'prod-qamis-sim-06', name: 'قميص فوشيا طويل', img: 5, price: 46000 },
    { id: 'prod-qamis-sim-07', name: 'قميص بيج أكسفورد', img: 6, price: 43000 },
    { id: 'prod-qamis-sim-08', name: 'قميص أسود رسمي', img: 7, price: 47000 },
    { id: 'prod-qamis-sim-09', name: 'قميص بولو أسود', img: 8, price: 36000 },
    {
      id: 'prod-qamis-sim-10',
      name: 'قميص مخلوط ألوان',
      img: 0,
      price: 40500,
      extraImg: 2,
    },
  ] as const;

  const products = [
    {
      id: 'prod-qamis-abyad',
      name: 'قميص أبيض رجالي',
      category: 'قمصان',
      description: 'قميص قطن 100%',
      images: [...SEED_PRODUCT_IMAGES],
      unit: 'قطعة',
      price: 45000,
      inWarehouse: true,
      available: true,
      variants: colorSizeVariants(0),
      packaging: { onlyPackage: false, unitsPerPackage: 10, label: 'علبة 10' },
      discount: { percent: 10, originalPrice: 50000 },
      offer: 'عرض خاص',
      guarantee: true,
      supplierBusinessId: 'biz-workshop',
    },
    {
      id: 'prod-qamis-kaki',
      name: 'قميص كاكي',
      category: 'قمصان',
      description: 'قميص كاكي عملي',
      images: [SEED_PRODUCT_IMAGES[5], SEED_PRODUCT_IMAGES[1]],
      unit: 'قطعة',
      price: 40000,
      inWarehouse: true,
      available: true,
      variants: colorSizeVariants(1),
      guarantee: false,
      supplierBusinessId: 'biz-workshop',
    },
    {
      id: 'prod-bantal-jeans',
      name: 'بنطال جينز',
      category: 'بنطال',
      description: 'جينز رجالي',
      images: [
        SEED_PRODUCT_IMAGES[0],
        SEED_PRODUCT_IMAGES[7],
        SEED_PRODUCT_IMAGES[8],
      ],
      unit: 'قطعة',
      price: 65000,
      inWarehouse: true,
      available: true,
      variants: colorSizeVariants(2),
      guarantee: true,
      supplierBusinessId: 'biz-workshop',
    },
    ...similarQamisAbyadSeed.map((s, index) => {
      const images =
        'extraImg' in s
          ? [
              SEED_PRODUCT_IMAGES[s.img],
              SEED_PRODUCT_IMAGES[s.extraImg],
            ]
          : [SEED_PRODUCT_IMAGES[s.img]];
      return {
        id: s.id,
        name: s.name,
        category: 'قمصان',
        description: 'قميص رجالي — مشابه لقميص أبيض رجالي',
        images,
        unit: 'قطعة',
        price: s.price,
        inWarehouse: true,
        available: true,
        variants: colorSizeVariants(index),
        guarantee: true,
        supplierBusinessId: 'biz-workshop',
      };
    }),
  ];

  for (const p of products) {
    const { id, ...rest } = p;
    await prisma.product.upsert({
      where: { id },
      create: { id, ...rest },
      update: rest,
    });
  }
  console.log(`  products: ${products.length}`);

  // ------------------------------------------------------------
  // Supply (platform warehouse stock — one row per product)
  // ------------------------------------------------------------
  const supply = [
    {
      productId: 'prod-qamis-abyad',
      sent: 200,
      remaining: 150,
      unitPrice: 35000,
    },
    {
      productId: 'prod-qamis-kaki',
      sent: 120,
      remaining: 95,
      unitPrice: 32000,
    },
    {
      productId: 'prod-bantal-jeans',
      sent: 80,
      remaining: 60,
      unitPrice: 50000,
    },
    ...similarQamisAbyadSeed.map((s, i) => ({
      productId: s.id,
      sent: 100 + i * 10,
      remaining: 70 + i * 5,
      unitPrice: Math.max(25000, s.price - 8000),
    })),
  ];

  for (const s of supply) {
    await prisma.supply.upsert({
      where: { productId: s.productId },
      create: s,
      update: s,
    });
  }
  console.log(`  supply rows: ${supply.length}`);

  // ------------------------------------------------------------
  // Post options (admin-managed publish chips)
  // ------------------------------------------------------------
  const jobSpecialtyId = 'opt-job-specialty-production';
  const serviceSpecialtyId = 'opt-service-specialty-sewing';
  const productSpecialtyId = 'opt-product-specialty-men';
  const materialSpecialtyId = 'opt-material-specialty-fabric';

  const postOptions: {
    id: string;
    kind: PostOptionKind;
    postTypes: PostType[];
    label: string;
    parentId?: string | null;
    sortOrder: number;
  }[] = [
      {
        id: jobSpecialtyId,
        kind: PostOptionKind.specialty,
        postTypes: [PostType.job_offering, PostType.job_seeking],
        label: 'إنتاج/صناعة',
        sortOrder: 0,
      },
      {
        id: 'opt-job-specialty-management',
        kind: PostOptionKind.specialty,
        postTypes: [PostType.job_offering, PostType.job_seeking],
        label: 'إدارة',
        sortOrder: 1,
      },
      {
        id: 'opt-job-skill-sewing',
        kind: PostOptionKind.skill,
        postTypes: [PostType.job_offering, PostType.job_seeking],
        label: 'خياطة',
        parentId: jobSpecialtyId,
        sortOrder: 0,
      },
      {
        id: 'opt-job-skill-cutting',
        kind: PostOptionKind.skill,
        postTypes: [PostType.job_offering, PostType.job_seeking],
        label: 'قص',
        parentId: jobSpecialtyId,
        sortOrder: 1,
      },
      ...(['كامل', 'جزئي', 'عن بعد'] as const).map((label, i) => ({
        id: `opt-work-type-${i}`,
        kind: PostOptionKind.work_type,
        postTypes: [PostType.job_offering, PostType.job_seeking],
        label,
        sortOrder: i,
      })),
      ...(['شهري', 'يومي', 'بالقطعة', 'حسب الاتفاق'] as const).map(
        (label, i) => ({
          id: `opt-salary-type-${i}`,
          kind: PostOptionKind.salary_type,
          postTypes: [PostType.job_offering],
          label,
          sortOrder: i,
        }),
      ),
      {
        id: serviceSpecialtyId,
        kind: PostOptionKind.specialty,
        postTypes: [PostType.service_offering, PostType.service_requesting],
        label: 'خياطة',
        sortOrder: 0,
      },
      {
        id: 'opt-service-specialty-design',
        kind: PostOptionKind.specialty,
        postTypes: [PostType.service_offering, PostType.service_requesting],
        label: 'تصميم',
        sortOrder: 1,
      },
      {
        id: 'opt-service-specialty-embroidery',
        kind: PostOptionKind.specialty,
        postTypes: [PostType.service_offering, PostType.service_requesting],
        label: 'تطريز',
        sortOrder: 2,
      },
      ...(['في المشغل', 'عند الزبون', 'عن بعد'] as const).map((label, i) => ({
        id: `opt-service-place-${i}`,
        kind: PostOptionKind.service_place,
        postTypes: [PostType.service_offering],
        label,
        sortOrder: i,
      })),
      ...(['حسب الطلب', 'بالساعة', 'بالقطعة', 'شهري'] as const).map(
        (label, i) => ({
          id: `opt-pricing-${i}`,
          kind: PostOptionKind.pricing,
          postTypes: [PostType.service_offering],
          label,
          sortOrder: i,
        }),
      ),
      {
        id: productSpecialtyId,
        kind: PostOptionKind.specialty,
        postTypes: [PostType.product_offering],
        label: 'ألبسة رجالية',
        sortOrder: 0,
      },
      {
        id: 'opt-product-specialty-women',
        kind: PostOptionKind.specialty,
        postTypes: [PostType.product_offering],
        label: 'ألبسة نسائية',
        sortOrder: 1,
      },
      {
        id: 'opt-product-specialty-kids',
        kind: PostOptionKind.specialty,
        postTypes: [PostType.product_offering],
        label: 'ألبسة أطفال',
        sortOrder: 2,
      },
      ...(['جملة', 'مفرق', 'كلاهما'] as const).map((label, i) => ({
        id: `opt-sell-method-${i}`,
        kind: PostOptionKind.sell_method,
        postTypes: [PostType.product_offering],
        label,
        sortOrder: i,
      })),
      ...(['سعر ثابت', 'حسب الكمية', 'قابل للتفاوض'] as const).map(
        (label, i) => ({
          id: `opt-price-method-${i}`,
          kind: PostOptionKind.price_method,
          postTypes: [PostType.product_offering],
          label,
          sortOrder: i,
        }),
      ),
      {
        id: materialSpecialtyId,
        kind: PostOptionKind.specialty,
        postTypes: [PostType.material_offering, PostType.material_requesting],
        label: 'أقمشة',
        sortOrder: 0,
      },
      {
        id: 'opt-material-specialty-machines',
        kind: PostOptionKind.specialty,
        postTypes: [PostType.material_offering, PostType.material_requesting],
        label: 'ماكينات خياطة',
        sortOrder: 1,
      },
      ...(['جديدة', 'مستعملة - ممتازة', 'مستعملة - جيدة'] as const).map(
        (label, i) => ({
          id: `opt-condition-${i}`,
          kind: PostOptionKind.condition,
          postTypes: [PostType.material_offering, PostType.material_requesting],
          label,
          sortOrder: i,
        }),
      ),
      {
        id: 'opt-currency-syp',
        kind: PostOptionKind.currency,
        postTypes: [
          PostType.job_offering,
          PostType.job_seeking,
          PostType.service_offering,
          PostType.service_requesting,
          PostType.product_offering,
          PostType.material_offering,
          PostType.material_requesting,
        ],
        label: 'ليرة سورية',
        sortOrder: 0,
      },
      {
        id: 'opt-currency-usd',
        kind: PostOptionKind.currency,
        postTypes: [
          PostType.job_offering,
          PostType.job_seeking,
          PostType.service_offering,
          PostType.service_requesting,
          PostType.product_offering,
          PostType.material_offering,
          PostType.material_requesting,
        ],
        label: 'دولار',
        sortOrder: 1,
      },
    ];

  for (const option of postOptions) {
    await prisma.postOption.upsert({
      where: { id: option.id },
      create: {
        id: option.id,
        kind: option.kind,
        postTypes: option.postTypes,
        label: option.label,
        parentId: option.parentId ?? null,
        sortOrder: option.sortOrder,
        active: true,
      },
      update: {
        kind: option.kind,
        postTypes: option.postTypes,
        label: option.label,
        parentId: option.parentId ?? null,
        sortOrder: option.sortOrder,
        active: true,
      },
    });
  }
  console.log(`  post options: ${postOptions.length}`);

  // ------------------------------------------------------------
  // Posts
  // ------------------------------------------------------------
  const SEED_POST_IMAGES = [
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCaEiyENTwM0691yc2BOs5rXyrT5HLnIbfO8Q_S6K5X-y2DbB8kOEnX_I&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSuBuFVV6vcWrTmYjB0080oLAW0fYaGlu44gB-lymQktFde_5V6RcUQEzZZ&s=10',
    'https://cdnimg.co/ece03e48-a716-411d-bb8e-498840fa15ce/35ed3f6f-0165-4f22-9024-79f323071ed5/how-to-look-good-men-s-fashion-mens-outfit.jpg',
    'https://nousa.nl/cdn/shop/collections/kleding_heren.jpg?v=1764013659',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNJQLxKPnMO13eOchsA-IrHakV-FwsAxmHvSj6qCZVecUbzOkyCQ_JIgQE&s=10',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_0xs03FEbqL3bGRMJyAkKIDvgjPWJo27djmhI9u88BA&s=10',
  ] as const;

  const seedPostImages = (count: number, offset = 0): string[] =>
    Array.from(
      { length: Math.min(8, Math.max(1, count)) },
      (_, i) => SEED_POST_IMAGES[(offset + i) % SEED_POST_IMAGES.length]!,
    );

  const posts = [
    {
      id: 'post-job-offer-1',
      authorId: 'user-workshop',
      businessId: 'biz-workshop',
      type: PostType.job_offering,
      title: 'مطلوب خياط ماهر',
      body: 'نبحث عن خياط ماهر للعمل في معملنا بدمشق',
      location: 'دمشق',
      media: MediaType.none,
      active: true,
      specialty: 'إنتاج/صناعة',
      skills: ['خياطة'],
      workType: ['كامل'],
      salaryType: 'حسب الاتفاق',
      salary: 'حسب الخبرة',
      createdAt: hoursAgo(1),
    },
    {
      id: 'post-job-seek-1',
      authorId: 'user-employee',
      businessId: null,
      type: PostType.job_seeking,
      title: 'خياط يبحث عن عمل',
      body: 'خبرة 10 سنوات في خياطة القمصان',
      location: 'دمشق',
      media: MediaType.none,
      active: true,
      specialty: 'إنتاج/صناعة',
      workType: ['كامل', 'جزئي'],
      experience: '10 سنوات',
      createdAt: hoursAgo(2),
    },
    {
      id: 'post-service-offer-1',
      authorId: 'user-employee',
      businessId: null,
      type: PostType.service_offering,
      title: 'خدمة تطريز يدوي',
      body: 'أقدم خدمات التطريز اليدوي بجودة عالية',
      location: 'دمشق',
      media: MediaType.image,
      imageUrls: [
        'https://placehold.co/600x400?text=Tatriz1',
        'https://placehold.co/600x400?text=Tatriz2',
      ],
      active: true,
      specialty: 'تصميم',
      servicePlace: 'في المشغل',
      pricing: 'بالقطعة',
      createdAt: hoursAgo(3),
    },
    {
      id: 'post-product-offer-1',
      authorId: 'user-workshop',
      businessId: 'biz-workshop',
      type: PostType.product_offering,
      title: 'قمصان قطن للبيع',
      body: 'قمصان قطن بجودة عالية بسعر الجملة',
      location: 'دمشق',
      media: MediaType.image,
      imageUrls: ['https://placehold.co/600x400?text=Qamis'],
      active: true,
      specialty: 'ألبسة رجالية',
      sellMethod: 'جملة',
      priceMethod: 'سعر ثابت',
      price: '45000',
      createdAt: hoursAgo(4),
    },
    {
      id: 'post-material-offer-1',
      authorId: 'user-workshop',
      businessId: 'biz-workshop',
      type: PostType.material_offering,
      title: 'قماش قطن للبيع',
      body: 'قماش قطن مصري',
      location: 'دمشق',
      media: MediaType.none,
      active: true,
      specialty: 'أقمشة',
      condition: 'جديدة',
      createdAt: hoursAgo(5),
    },
    {
      id: 'post-material-req-1',
      authorId: 'user-employee',
      businessId: null,
      type: PostType.material_requesting,
      title: 'أبحث عن قماش جينز',
      body: 'أحتاج قماش جينز بكميات كبيرة',
      location: 'دمشق',
      media: MediaType.none,
      active: true,
      specialty: 'أقمشة',
      createdAt: hoursAgo(6),
    },
    {
      id: 'post-inactive-1',
      authorId: 'user-workshop',
      businessId: 'biz-workshop',
      type: PostType.service_offering,
      title: 'خدمة تطريز (غير مفعل)',
      body: 'هذا الإعلان غير مفعل',
      location: 'دمشق',
      media: MediaType.none,
      active: false,
      specialty: 'تطريز',
      createdAt: hoursAgo(7),
    },
    {
      id: 'post-deleted-1',
      authorId: 'user-workshop',
      businessId: 'biz-workshop',
      type: PostType.service_offering,
      title: 'إعلان محذوف',
      body: 'هذا الإعلان محذوف',
      location: 'دمشق',
      media: MediaType.none,
      active: true,
      specialty: 'خياطة',
      deletedAt: hoursAgo(8),
      createdAt: hoursAgo(8),
    },

    {
      id: 'post-midan-1',
      authorId: 'user-store-damascus-midan',
      businessId: 'biz-store-midan',
      type: PostType.product_offering,
      title: 'قماش قطن مصري درجة أولى',
      body: 'قماش قطن مصري 100%، عرض 150 سم، متوفر بألوان متعددة. مناسب للقمصان والفساتين. سعر الجملة متاح للكميات.',
      location: 'دمشق',
      media: MediaType.image,
      imageUrls: ['https://placehold.co/600x400?text=Cotton+Fabric'],
      active: true,
      specialty: 'ألبسة رجالية',
      sellMethod: 'جملة',
      priceMethod: 'سعر ثابت',
      price: '28000',
      createdAt: hoursAgo(10),
    },
    {
      id: 'post-midan-2',
      authorId: 'user-store-damascus-midan',
      businessId: 'biz-store-midan',
      type: PostType.product_offering,
      title: 'قماش كتان صيفي',
      body: 'قماش كتان خفيف مثالي للأجواء الصيفية. عدة ألوان متوفرة: أبيض، بيج، أزرق فاتح.',
      location: 'دمشق',
      media: MediaType.image,
      imageUrls: ['https://placehold.co/600x400?text=Linen'],
      active: true,
      specialty: 'ألبسة نسائية',
      sellMethod: 'مفرق',
      priceMethod: 'حسب الكمية',
      price: '35000',
      createdAt: hoursAgo(20),
    },
    {
      id: 'post-midan-3',
      authorId: 'user-store-damascus-midan',
      businessId: 'biz-store-midan',
      type: PostType.product_offering,
      title: 'قماش حرير طبيعي فاخر',
      body: 'حرير طبيعي بجودة عالية، مثالي للفساتين الفاخرة والأزياء الراقية. متوفر باللون الذهبي والفضي والأسود.',
      location: 'دمشق',
      media: MediaType.image,
      imageUrls: ['https://placehold.co/600x400?text=Silk'],
      active: true,
      specialty: 'ألبسة نسائية',
      sellMethod: 'مفرق',
      priceMethod: 'قابل للتفاوض',
      price: '120000',
      createdAt: hoursAgo(30),
    },
    {
      id: 'post-midan-4',
      authorId: 'user-store-damascus-midan',
      businessId: 'biz-store-midan',
      type: PostType.product_offering,
      title: 'قماش جينز مرن',
      body: 'جينز مرن مناسب للبناطيل والجاكيتات. متوفر بدرجات الأزرق والأسود. عرض 140 سم.',
      location: 'دمشق',
      media: MediaType.image,
      imageUrls: ['https://placehold.co/600x400?text=Denim'],
      active: true,
      specialty: 'ألبسة رجالية',
      sellMethod: 'جملة',
      priceMethod: 'سعر ثابت',
      price: '42000',
      createdAt: hoursAgo(40),
    },
    {
      id: 'post-midan-5',
      authorId: 'user-store-damascus-midan',
      businessId: 'biz-store-midan',
      type: PostType.product_offering,
      title: 'قماش شيفون مطرز',
      body: 'شيفون مطرز يدوياً بخيوط حريرية. مناسب للفساتين والأزياء النسائية. تصميمات حصرية.',
      location: 'دمشق',
      media: MediaType.image,
      imageUrls: ['https://placehold.co/600x400?text=Chiffon'],
      active: true,
      specialty: 'ألبسة نسائية',
      sellMethod: 'مفرق',
      priceMethod: 'سعر ثابت',
      price: '85000',
      createdAt: hoursAgo(50),
    },
    {
      id: 'post-midan-6',
      authorId: 'user-store-damascus-midan',
      businessId: 'biz-store-midan',
      type: PostType.material_offering,
      title: 'قماش صوف شتوي',
      body: 'صوف طبيعي دافئ، مثالي للمعاطف والبدلات الشتوية. متوفر بعدة ألوان داكنة.',
      location: 'دمشق',
      media: MediaType.image,
      imageUrls: ['https://placehold.co/600x400?text=Wool'],
      active: true,
      specialty: 'أقمشة',
      condition: 'جديدة',
      createdAt: hoursAgo(60),
    },
    {
      id: 'post-midan-7',
      authorId: 'user-store-damascus-midan',
      businessId: 'biz-store-midan',
      type: PostType.material_offering,
      title: 'قماش ساتان للأعراس',
      body: 'ساتان لامع بجودة عالية، مثالي لفساتين الأعراس والسهرات. ألوان متعددة.',
      location: 'دمشق',
      media: MediaType.image,
      imageUrls: ['https://placehold.co/600x400?text=Satin'],
      active: true,
      specialty: 'أقمشة',
      condition: 'جديدة',
      createdAt: hoursAgo(70),
    },
    {
      id: 'post-midan-8',
      authorId: 'user-store-damascus-midan',
      businessId: 'biz-store-midan',
      type: PostType.material_offering,
      title: 'قماش مخمل فاخر',
      body: 'مخمل فاخر بملمس ناعم، متوفر بالألوان: الأحمر، الأخضر، الأزرق. مناسب للفساتين الملكية.',
      location: 'دمشق',
      media: MediaType.image,
      imageUrls: ['https://placehold.co/600x400?text=Velvet'],
      active: true,
      specialty: 'أقمشة',
      condition: 'جديدة',
      createdAt: hoursAgo(80),
    },
    {
      id: 'post-midan-9',
      authorId: 'user-store-damascus-midan',
      businessId: 'biz-store-midan',
      type: PostType.material_offering,
      title: 'قماش مطرز بالكريستال',
      body: 'قماش مطرز بحبات الكريستال، مثالي للفساتين الفاخرة. عمل يدوي دقيق.',
      location: 'دمشق',
      media: MediaType.image,
      imageUrls: ['https://placehold.co/600x400?text=Crystal'],
      active: true,
      specialty: 'أقمشة',
      condition: 'جديدة',
      createdAt: hoursAgo(90),
    },
    {
      id: 'post-midan-10',
      authorId: 'user-store-damascus-midan',
      businessId: 'biz-store-midan',
      type: PostType.product_offering,
      title: 'قماش قطيفة أطفال',
      body: 'قطيفة ناعمة آمنة للأطفال، بألوان مبهجة ورسومات لطيفة. متوفرة بالمتر.',
      location: 'دمشق',
      media: MediaType.image,
      imageUrls: ['https://placehold.co/600x400?text=Kids+Fabric'],
      active: true,
      specialty: 'ألبسة أطفال',
      sellMethod: 'مفرق',
      priceMethod: 'سعر ثابت',
      price: '22000',
      createdAt: hoursAgo(100),
    },
    // ═════════════════════════════════════════
    // Reels (30) — video + thumbnail
    // ═════════════════════════════════════════
    {
      id: 'reel-01',
      authorId: 'user-workshop',
      businessId: 'biz-workshop',
      type: PostType.reel,
      title: 'جولة في معمل النسيج الدمشقي',
      body: 'لقطة سريعة من خط الإنتاج، شوفوا كيف تتحول الأقمشة لقمصان جاهزة.',
      location: 'دمشق',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      thumbnailUrl: 'https://picsum.photos/id/10/600/800',
      active: true,
      createdAt: hoursAgo(1),
    },
    {
      id: 'reel-02',
      authorId: 'user-workshop-halep',
      businessId: 'biz-workshop-halep',
      type: PostType.reel,
      title: 'تشكيلة الشهباء الصيفية',
      body: 'أحدث موديلات الألبسة النسائية والأطفال من معملنا بحلب.',
      location: 'حلب',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      thumbnailUrl: 'https://picsum.photos/id/11/600/800',
      active: true,
      createdAt: hoursAgo(2),
    },
    {
      id: 'reel-03',
      authorId: 'user-workshop-homs',
      businessId: 'biz-workshop-homs',
      type: PostType.reel,
      title: 'كيف يُصنع الجينز؟',
      body: 'من خيط القطن إلى بنطال جاهز — رحلة كاملة في 30 ثانية.',
      location: 'حمص',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
      thumbnailUrl: 'https://picsum.photos/id/12/600/800',
      active: true,
      createdAt: hoursAgo(3),
    },
    {
      id: 'reel-04',
      authorId: 'user-store-damascus-midan',
      businessId: 'biz-store-midan',
      type: PostType.reel,
      title: 'أقمشة جديدة وصلت متجر الميدان',
      body: 'تشكيلة حرير وكتان بألوان جديدة. تعالوا شوفوها بعيونكم.',
      location: 'دمشق',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
      thumbnailUrl: 'https://picsum.photos/id/13/600/800',
      active: true,
      createdAt: hoursAgo(4),
    },
    {
      id: 'reel-05',
      authorId: 'user-institute-halep',
      businessId: 'biz-institute-halep',
      type: PostType.reel,
      title: 'درس قص أساسي',
      body: 'أول درس في دورة القص للمبتدئين — تعلموا كيف تمسكوا القماش صح.',
      location: 'حلب',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/w_540,h_960,c_fill,q_auto/sea_turtle.mp4',
      thumbnailUrl: 'https://picsum.photos/id/14/600/800',
      active: true,
      createdAt: hoursAgo(5),
    },
    {
      id: 'reel-06',
      authorId: 'user-workshop-tartous',
      businessId: 'biz-workshop-tartous',
      type: PostType.reel,
      title: 'صناعة السجاد اليدوي',
      body: 'كل عقدة يدوية بتحكي قصة. شوفوا كيف ينسج الحرفيون سجادنا.',
      location: 'طرطوس',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/snow_horses.mp4',
      thumbnailUrl: 'https://picsum.photos/id/15/600/800',
      active: true,
      createdAt: hoursAgo(6),
    },
    {
      id: 'reel-07',
      authorId: 'user-workshop-lattakia',
      businessId: 'biz-workshop-lattakia',
      type: PostType.reel,
      title: 'تطريز يدوي من الساحل',
      body: 'تفاصيل تطريز عربي أصيل يعمل عليه حرفيونا بكل حب.',
      location: 'اللاذقية',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/docs/walking_talking.mp4',
      thumbnailUrl: 'https://picsum.photos/id/16/600/800',
      active: true,
      createdAt: hoursAgo(7),
    },
    {
      id: 'reel-08',
      authorId: 'user-workshop-hama',
      businessId: 'biz-workshop-hama',
      type: PostType.reel,
      title: 'تعديلات سريعة',
      body: 'قبل وبعد — تعديل بنطال جاهز في دقائق.',
      location: 'حماة',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/kitten_play.mp4',
      thumbnailUrl: 'https://picsum.photos/id/17/600/800',
      active: true,
      createdAt: hoursAgo(8),
    },
    {
      id: 'reel-09',
      authorId: 'user-institute-homs',
      businessId: 'biz-institute-homs',
      type: PostType.reel,
      title: 'مشغل الخياطة للمبتدئين',
      body: 'جولة داخل ورشة المعهد وأدوات الطلاب.',
      location: 'حمص',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/w_540,h_960,c_fill,q_auto/sea_turtle.mp4',
      thumbnailUrl: 'https://picsum.photos/id/18/600/800',
      active: true,
      createdAt: hoursAgo(9),
    },
    {
      id: 'reel-10',
      authorId: 'user-store-halep',
      businessId: 'biz-store-halep',
      type: PostType.reel,
      title: 'أقمشة مستوردة وصلت حديثاً',
      body: 'حرير، كتان، صوف — كل شي بلون جديد.',
      location: 'حلب',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/samples/elephants.mp4',
      thumbnailUrl: 'https://picsum.photos/id/19/600/800',
      active: true,
      createdAt: hoursAgo(10),
    },
    {
      id: 'reel-11',
      authorId: 'user-workshop-rural-damascus',
      businessId: 'biz-workshop-damascus-rural',
      type: PostType.reel,
      title: 'إنتاج ضخم في ريف دمشق',
      body: 'خط إنتاج كامل يشتغل على دفعة جديدة من القمصان.',
      location: 'ريف دمشق',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/samples/cld-sample-video.mp4',
      thumbnailUrl: 'https://picsum.photos/id/20/600/800',
      active: true,
      createdAt: hoursAgo(11),
    },
    {
      id: 'reel-12',
      authorId: 'user-store-homs',
      businessId: 'biz-store-homs',
      type: PostType.reel,
      title: 'ملابس أطفال — تشكيلة جديدة',
      body: 'ألوان مرحة وقماش ناعم يناسب البشرة الحساسة.',
      location: 'حمص',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/kitten_play.mp4',
      thumbnailUrl: 'https://picsum.photos/id/21/600/800',
      active: true,
      createdAt: hoursAgo(12),
    },
    {
      id: 'reel-13',
      authorId: 'user-institute-lattakia',
      businessId: 'biz-institute-lattakia',
      type: PostType.reel,
      title: 'دورة تصميم أزياء — إعلان',
      body: 'سجّل الآن في دفعة الشهر الجاي. مقاعد محدودة.',
      location: 'اللاذقية',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      thumbnailUrl: 'https://picsum.photos/id/22/600/800',
      active: true,
      createdAt: hoursAgo(13),
    },
    {
      id: 'reel-14',
      authorId: 'user-store-babtouma',
      businessId: 'biz-store-babtouma',
      type: PostType.reel,
      title: 'ألبسة رجالية فاخرة',
      body: 'بدلات رسمية بقصّات عصرية — وصول جديد.',
      location: 'دمشق',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      thumbnailUrl: 'https://picsum.photos/id/23/600/800',
      active: true,
      createdAt: hoursAgo(14),
    },
    {
      id: 'reel-15',
      authorId: 'user-workshop',
      businessId: 'biz-workshop',
      type: PostType.reel,
      title: 'آلة قص ليزر جديدة',
      body: 'دخلت المعمل قبل يومين — دقة عالية وسرعة مضاعفة.',
      location: 'دمشق',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
      thumbnailUrl: 'https://picsum.photos/id/24/600/800',
      active: true,
      createdAt: hoursAgo(15),
    },
    {
      id: 'reel-16',
      authorId: 'user-workshop-halep',
      businessId: 'biz-workshop-halep',
      type: PostType.reel,
      title: 'فساتين سهرة من الشهباء',
      body: 'تفاصيل مطرزة بالكريستال — كل فستان قطعة فنية.',
      location: 'حلب',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
      thumbnailUrl: 'https://picsum.photos/id/25/600/800',
      active: true,
      createdAt: hoursAgo(16),
    },
    {
      id: 'reel-17',
      authorId: 'user-workshop-homs',
      businessId: 'biz-workshop-homs',
      type: PostType.reel,
      title: 'غسيل جينز احترافي',
      body: 'مراحل غسيل الجينز لإعطائه المظهر المطلوب.',
      location: 'حمص',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
      thumbnailUrl: 'https://picsum.photos/id/26/600/800',
      active: true,
      createdAt: hoursAgo(17),
    },
    {
      id: 'reel-18',
      authorId: 'user-store-damascus-midan',
      businessId: 'biz-store-midan',
      type: PostType.reel,
      title: 'حرير طبيعي 100%',
      body: 'شوفوا كيف يلمع الحرير تحت الضوء. الكمية محدودة.',
      location: 'دمشق',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/snow_horses.mp4',
      thumbnailUrl: 'https://picsum.photos/id/27/600/800',
      active: true,
      createdAt: hoursAgo(18),
    },
    {
      id: 'reel-19',
      authorId: 'user-institute-halep',
      businessId: 'biz-institute-halep',
      type: PostType.reel,
      title: 'تخرج دفعة جديدة',
      body: 'مبروك لطلابنا — دفعة الصيف تخرجت بمشاريع مميزة.',
      location: 'حلب',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/docs/walking_talking.mp4',
      thumbnailUrl: 'https://picsum.photos/id/28/600/800',
      active: true,
      createdAt: hoursAgo(19),
    },
    {
      id: 'reel-20',
      authorId: 'user-workshop-tartous',
      businessId: 'biz-workshop-tartous',
      type: PostType.reel,
      title: 'سجاد مخصص — طلب جديد',
      body: 'زبون طلب تصميم خاص — شوفوا النتيجة النهائية.',
      location: 'طرطوس',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
      thumbnailUrl: 'https://picsum.photos/id/29/600/800',
      active: true,
      createdAt: hoursAgo(20),
    },
    {
      id: 'reel-21',
      authorId: 'user-workshop-lattakia',
      businessId: 'biz-workshop-lattakia',
      type: PostType.reel,
      title: 'تطريز شعارات للشركات',
      body: 'طريقة عمل شعار مطرز بدقة عالية على قميص.',
      location: 'اللاذقية',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/w_540,h_960,c_fill,q_auto/sea_turtle.mp4',
      thumbnailUrl: 'https://picsum.photos/id/30/600/800',
      active: true,
      createdAt: hoursAgo(21),
    },
    {
      id: 'reel-22',
      authorId: 'user-workshop-hama',
      businessId: 'biz-workshop-hama',
      type: PostType.reel,
      title: 'ورشة صغيرة، إنتاج كبير',
      body: 'ماكينات قليلة بس تنظيم ممتاز. شوفوا كيف.',
      location: 'حماة',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/samples/elephants.mp4',
      thumbnailUrl: 'https://picsum.photos/id/31/600/800',
      active: true,
      createdAt: hoursAgo(22),
    },
    {
      id: 'reel-23',
      authorId: 'user-institute-homs',
      businessId: 'biz-institute-homs',
      type: PostType.reel,
      title: 'نصائح للمبتدئين في الخياطة',
      body: 'ثلاث نصائح بتوفر عليك وقت ومقاسات غلط.',
      location: 'حمص',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/samples/cld-sample-video.mp4',
      thumbnailUrl: 'https://picsum.photos/id/32/600/800',
      active: true,
      createdAt: hoursAgo(23),
    },
    {
      id: 'reel-24',
      authorId: 'user-store-halep',
      businessId: 'biz-store-halep',
      type: PostType.reel,
      title: 'قماش كتان للصيف',
      body: 'كتان خفيف يتنفس — مثالي للصيف السوري.',
      location: 'حلب',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/kitten_play.mp4',
      thumbnailUrl: 'https://picsum.photos/id/33/600/800',
      active: true,
      createdAt: hoursAgo(24),
    },
    {
      id: 'reel-25',
      authorId: 'user-workshop-rural-damascus',
      businessId: 'biz-workshop-damascus-rural',
      type: PostType.reel,
      title: 'تفاصيل الخياطة المضاعفة',
      body: 'خياطة مزدوجة لضمان المتانة في كل قطعة.',
      location: 'ريف دمشق',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      thumbnailUrl: 'https://picsum.photos/id/34/600/800',
      active: true,
      createdAt: hoursAgo(25),
    },
    {
      id: 'reel-26',
      authorId: 'user-store-homs',
      businessId: 'biz-store-homs',
      type: PostType.reel,
      title: 'تخفيضات نهاية الموسم',
      body: 'كل الألبسة الصيفية بأسعار مخفضة.',
      location: 'حمص',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      thumbnailUrl: 'https://picsum.photos/id/35/600/800',
      active: true,
      createdAt: hoursAgo(26),
    },
    {
      id: 'reel-27',
      authorId: 'user-institute-lattakia',
      businessId: 'biz-institute-lattakia',
      type: PostType.reel,
      title: 'ورشة تطريز يدوي — جولة',
      body: 'داخل قاعة الورشة مع طلابنا.',
      location: 'اللاذقية',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
      thumbnailUrl: 'https://picsum.photos/id/36/600/800',
      active: true,
      createdAt: hoursAgo(27),
    },
    {
      id: 'reel-28',
      authorId: 'user-store-babtouma',
      businessId: 'biz-store-babtouma',
      type: PostType.reel,
      title: 'أزياء نسائية — خريف جديد',
      body: 'تشكيلة الخريف وصلت — ألوان دافئة وقصّات أنيقة.',
      location: 'دمشق',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
      thumbnailUrl: 'https://picsum.photos/id/37/600/800',
      active: true,
      createdAt: hoursAgo(28),
    },
    {
      id: 'reel-29',
      authorId: 'user-workshop',
      businessId: 'biz-workshop',
      type: PostType.reel,
      title: 'مقارنة قبل وبعد التطريز',
      body: 'قميص عادي وكيف صار بعد التطريز.',
      location: 'دمشق',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
      thumbnailUrl: 'https://picsum.photos/id/38/600/800',
      active: true,
      createdAt: hoursAgo(29),
    },
    {
      id: 'reel-30',
      authorId: 'user-workshop-halep',
      businessId: 'biz-workshop-halep',
      type: PostType.reel,
      title: 'دعوة لزيارة معرضنا',
      body: 'معرض الشهباء مفتوح كل يوم من 10 صباحاً لـ 8 مساءً.',
      location: 'حلب',
      media: MediaType.video,
      imageUrls: [],
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/snow_horses.mp4',
      thumbnailUrl: 'https://picsum.photos/id/39/600/800',
      active: true,
      createdAt: hoursAgo(30),
    },
  ];

  // Attach 1–8 fashion images to non-reel / non-job-seeking posts (URLs may repeat).
  let imagePostIndex = 0;
  const postsWithImages = posts.map((p) => {
    if (p.type === PostType.reel) return p;
    // Job seekers: text-only — no gallery photos
    if (p.type === PostType.job_seeking) {
      return {
        ...p,
        media: MediaType.none,
        imageUrls: [],
      };
    }
    const count = (imagePostIndex % 8) + 1;
    const offset = imagePostIndex;
    imagePostIndex += 1;
    return {
      ...p,
      media: MediaType.image,
      imageUrls: seedPostImages(count, offset),
    };
  });

  for (const p of postsWithImages) {
    const { id, ...rest } = p;
    await prisma.post.upsert({
      where: { id },
      create: { id, ...rest },
      update: rest,
    });
  }
  console.log(`  posts: ${postsWithImages.length}`);

  // ------------------------------------------------------------
  // Bulk: 15 posts + 15 reels for every user (incl. يحيى معدل)
  // ------------------------------------------------------------
  {
    const REEL_VIDEOS = [
      'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      'https://www.w3schools.com/html/mov_bbb.mp4',
      'https://res.cloudinary.com/demo/video/upload/dog.mp4',
      'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
      'https://res.cloudinary.com/demo/video/upload/snow_horses.mp4',
    ] as const;
    const BULK_IMAGES = [
      'https://placehold.co/600x400?text=Textile+1',
      'https://placehold.co/600x400?text=Textile+2',
      'https://placehold.co/600x400?text=Textile+3',
    ] as const;
    const postTypeForRole = (role: UserRole): PostType => {
      switch (role) {
        case UserRole.store:
          return PostType.product_offering;
        case UserRole.workshop:
          return PostType.material_offering;
        case UserRole.institute:
          return PostType.service_offering;
        default:
          return PostType.job_seeking;
      }
    };

    let yahya = await prisma.user.findFirst({
      where: { name: 'يحيى معدل' },
      select: { id: true },
    });
    if (!yahya) {
      const phoneTaken = await prisma.user.findFirst({
        where: { phone: '+963994000001' },
        select: { id: true },
      });
      yahya = await prisma.user.create({
        data: {
          id: 'user-yahya-moadal',
          name: 'يحيى معدل',
          phone: phoneTaken ? '+963994099901' : '+963994000001',
          role: UserRole.employee,
          locationId: 'loc-damascus',
          onboardingCompleted: true,
          verified: true,
        },
        select: { id: true },
      });
      console.log('  created يحيى معدل');
    }

    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        location: { select: { name: true } },
        business: { select: { id: true } },
      },
    });

    let bulkCount = 0;
    for (const user of allUsers) {
      const location = user.location?.name ?? 'دمشق';
      const businessId = user.business?.id ?? null;
      const display = user.name?.trim() || user.id;
      const postType = postTypeForRole(user.role as UserRole);

      for (let i = 1; i <= 15; i++) {
        const n = String(i).padStart(2, '0');
        const postId = `bulk-post-${user.id}-${n}`;
        const reelId = `bulk-reel-${user.id}-${n}`;
        const postData = {
          authorId: user.id,
          businessId,
          type: postType,
          title: `منشور ${i} — ${display}`,
          body: `منشور تجريبي رقم ${i} للمستخدم ${display}.`,
          location,
          media:
            postType === PostType.job_seeking
              ? MediaType.none
              : MediaType.image,
          imageUrls:
            postType === PostType.job_seeking
              ? ([] as string[])
              : [BULK_IMAGES[(i - 1) % BULK_IMAGES.length]!],
          videoUrl: null as string | null,
          thumbnailUrl: null as string | null,
          active: true,
          specialty: postType === PostType.job_seeking ? 'خياطة' : null,
          skills: postType === PostType.job_seeking ? ['خياطة'] : [],
          workType: postType === PostType.job_seeking ? ['كامل'] : [],
          createdAt: hoursAgo(i),
        };
        const reelData = {
          authorId: user.id,
          businessId,
          type: PostType.reel,
          title: `ريل ${i} — ${display}`,
          body: `ريل تجريبي رقم ${i} للمستخدم ${display}.`,
          location,
          media: MediaType.video,
          imageUrls: [] as string[],
          videoUrl: REEL_VIDEOS[(i - 1) % REEL_VIDEOS.length]!,
          thumbnailUrl: `https://picsum.photos/id/${(i % 80) + 10}/600/800`,
          active: true,
          createdAt: hoursAgo(i + 15),
        };
        await prisma.post.upsert({
          where: { id: postId },
          create: { id: postId, ...postData },
          update: postData,
        });
        await prisma.post.upsert({
          where: { id: reelId },
          create: { id: reelId, ...reelData },
          update: reelData,
        });
        bulkCount += 2;
      }
    }
    console.log(
      `  bulk posts/reels: ${bulkCount} rows for ${allUsers.length} users`,
    );
  }

  const shippingCompanies = [
    {
      id: 'ship-al-sham',
      name: 'شركة الشام للشحن',
      location: 'دمشق - المزة',
      verified: true,
      coverage: ['دمشق', 'ريف دمشق', 'حمص'],
      deliveryTime: '24 ساعة',
      pricing: 'يبدأ من 5000 ل.س',
      fleet: '5 شاحنات + 2 فان',
      phone: '+963994111001',
    },
    {
      id: 'ship-syria-express',
      name: 'سوريا إكسبريس',
      location: 'حلب - العزيزية',
      verified: true,
      coverage: ['حلب', 'إدلب', 'حماة', 'دمشق'],
      deliveryTime: '48 ساعة',
      pricing: 'يبدأ من 7000 ل.س',
      fleet: '8 شاحنات',
      phone: '+963994111002',
    },
    {
      id: 'ship-coastal-logistics',
      name: 'الساحل للخدمات اللوجستية',
      location: 'اللاذقية - الرمل الجنوبي',
      verified: false,
      coverage: ['اللاذقية', 'طرطوس', 'حمص'],
      deliveryTime: '24-48 ساعة',
      pricing: 'حسب الوزن والمسافة',
      fleet: '4 شاحنات صغيرة',
      phone: '+963994111003',
    },
    {
      id: 'ship-homs-cargo',
      name: 'حمص كارجو',
      location: 'حمص - الوعر',
      verified: true,
      coverage: ['حمص', 'حماة', 'دمشق', 'حلب'],
      deliveryTime: '48-72 ساعة',
      pricing: 'يبدأ من 6000 ل.س',
      fleet: '6 شاحنات',
      phone: '+963994111004',
    },
  ];

  for (const sc of shippingCompanies) {
    await prisma.shippingCompany.upsert({
      where: { id: sc.id },
      create: sc,
      update: sc,
    });
  }
  console.log(`  shipping companies: ${shippingCompanies.length}`);


  // ------------------------------------------------------------
  // Post ↔ Category
  // ------------------------------------------------------------
  const postCategories: { postId: string; categoryId: string }[] = [
    { postId: 'post-job-offer-1', categoryId: 'cat-wazaif' },
    { postId: 'post-job-seek-1', categoryId: 'cat-wazaif' },
    { postId: 'post-service-offer-1', categoryId: 'cat-tatriz' },
    { postId: 'post-service-offer-1', categoryId: 'cat-khadamat' },
    { postId: 'post-product-offer-1', categoryId: 'cat-qumsan' },
    { postId: 'post-material-offer-1', categoryId: 'cat-aqmsha' },
    { postId: 'post-material-req-1', categoryId: 'cat-aqmsha' },
    { postId: 'post-midan-1', categoryId: 'cat-aqmsha' },
    { postId: 'post-midan-2', categoryId: 'cat-aqmsha' },
    { postId: 'post-midan-3', categoryId: 'cat-aqmsha' },
    { postId: 'post-midan-4', categoryId: 'cat-aqmsha' },
    { postId: 'post-midan-5', categoryId: 'cat-aqmsha' },
    { postId: 'post-midan-6', categoryId: 'cat-aqmsha' },
    { postId: 'post-midan-7', categoryId: 'cat-aqmsha' },
    { postId: 'post-midan-8', categoryId: 'cat-aqmsha' },
    { postId: 'post-midan-9', categoryId: 'cat-aqmsha' },
    { postId: 'post-midan-10', categoryId: 'cat-aqmsha' },
  ];

  for (const { postId, categoryId } of postCategories) {
    await prisma.postCategory.upsert({
      where: { postId_categoryId: { postId, categoryId } },
      create: { postId, categoryId },
      update: {},
    });
  }
  console.log(`  post-category links: ${postCategories.length}`);

  // ------------------------------------------------------------
  // Likes
  // ------------------------------------------------------------
  const likes = [
    { userId: 'user-employee', postId: 'post-job-offer-1' },
    { userId: 'user-store', postId: 'post-job-offer-1' },
    { userId: 'user-store', postId: 'post-service-offer-1' },
    { userId: 'user-institute', postId: 'post-product-offer-1' },
    { userId: 'user-employee', postId: 'post-midan-1' },
    { userId: 'user-workshop', postId: 'post-midan-1' },
    { userId: 'user-store', postId: 'post-midan-3' },
    { userId: 'user-institute-halep', postId: 'post-midan-4' },
    { userId: 'user-workshop-homs', postId: 'post-midan-6' },
    { userId: 'user-store-halep', postId: 'post-midan-7' },
    // Reel likes
    { userId: 'user-employee', postId: 'reel-01' },
    { userId: 'user-store', postId: 'reel-01' },
    { userId: 'user-workshop-halep', postId: 'reel-01' },
    { userId: 'user-institute', postId: 'reel-02' },
    { userId: 'user-store-babtouma', postId: 'reel-02' },
    { userId: 'user-employee', postId: 'reel-03' },
    { userId: 'user-store-damascus-midan', postId: 'reel-04' },
    { userId: 'user-institute-homs', postId: 'reel-05' },
    { userId: 'user-store-halep', postId: 'reel-06' },
    { userId: 'user-employee', postId: 'reel-10' },
    { userId: 'user-store', postId: 'reel-15' },
    { userId: 'user-institute-halep', postId: 'reel-20' },
    { userId: 'user-store-homs', postId: 'reel-25' },
    { userId: 'user-workshop-homs', postId: 'reel-30' },
  ];

  for (const l of likes) {
    await prisma.like.upsert({
      where: { userId_postId: { userId: l.userId, postId: l.postId } },
      create: l,
      update: {},
    });
  }
  console.log(`  likes: ${likes.length}`);

  // ------------------------------------------------------------
  // Saved posts
  // ------------------------------------------------------------
  const saved = [
    { userId: 'user-store', postId: 'post-product-offer-1' },
    { userId: 'user-employee', postId: 'post-job-offer-1' },
  ];

  for (const s of saved) {
    await prisma.savedPost.upsert({
      where: { userId_postId: { userId: s.userId, postId: s.postId } },
      create: s,
      update: {},
    });
  }
  console.log(`  saved posts: ${saved.length}`);

  // ------------------------------------------------------------
  // Comments — every post gets a thread with nested replies
  // ------------------------------------------------------------
  const commentAuthors = [
    'user-employee',
    'user-workshop',
    'user-institute',
    'user-store',
    'user-workshop-halep',
    'user-workshop-homs',
    'user-store-halep',
    'user-store-babtouma',
    'user-institute-halep',
    'user-institute-lattakia',
    'user-store-damascus-midan',
    'user-store-homs',
    'user-workshop-tartous',
    'user-workshop-hama',
  ] as const;

  const rootBodies = [
    'ما شاء الله، شغل نظيف!',
    'كم السعر؟',
    'مهتم، كيف أتواصل؟',
    'متوفر بالجملة؟',
    'تفاصيل أكثر لو سمحت',
    'جودة ممتازة',
    'هل فيه توصيل لحمص؟',
    'الألوان المتوفرة؟',
    'ممكن عينة؟',
    'الله يعطيكم العافية',
  ] as const;

  const replyBodies = [
    'تواصل معنا على الرقم في المنشور',
    'نعم متوفر، أهلاً فيك',
    'شكراً لاهتمامك',
    'السعر حسب الكمية',
    'نرد عليك بخاصة',
  ] as const;

  const nestedReplyBodies = [
    'شكراً، سأتواصل قريباً',
    'تمام، وصلني',
    'ممتاز، شكراً لك',
    'حاضر، بخبرك',
  ] as const;

  type SeedComment = {
    id: string;
    postId: string;
    authorId: string;
    body: string;
    createdAt: Date;
    parentId?: string;
  };

  const comments: SeedComment[] = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]!;
    const author = (id: number) =>
      commentAuthors[(i + id) % commentAuthors.length]!;
    const hours = 1 + (i % 48);

    const rootId = `c-${post.id}-1`;
    comments.push({
      id: rootId,
      postId: post.id,
      authorId: author(0),
      body: rootBodies[i % rootBodies.length]!,
      createdAt: hoursAgo(hours),
    });

    const replyId = `c-${post.id}-1-r1`;
    comments.push({
      id: replyId,
      postId: post.id,
      authorId: author(1),
      parentId: rootId,
      body: replyBodies[i % replyBodies.length]!,
      createdAt: hoursAgo(hours - 0.4),
    });

    const nestedId = `c-${post.id}-1-r1-r1`;
    comments.push({
      id: nestedId,
      postId: post.id,
      authorId: author(2),
      parentId: replyId,
      body: nestedReplyBodies[i % nestedReplyBodies.length]!,
      createdAt: hoursAgo(hours - 0.7),
    });

    // Second top-level comment + one reply on every other post
    if (i % 2 === 0) {
      const root2Id = `c-${post.id}-2`;
      comments.push({
        id: root2Id,
        postId: post.id,
        authorId: author(3),
        body: rootBodies[(i + 3) % rootBodies.length]!,
        createdAt: hoursAgo(hours - 0.2),
      });
      comments.push({
        id: `c-${post.id}-2-r1`,
        postId: post.id,
        authorId: author(4),
        parentId: root2Id,
        body: replyBodies[(i + 1) % replyBodies.length]!,
        createdAt: hoursAgo(hours - 0.5),
      });
    }
  }

  // Bulk thread for pagination demos: post-job-offer-1 → 100 roots + 100 replies
  const bulkPostId = 'post-job-offer-1';
  for (let n = 1; n <= 100; n++) {
    const pad = String(n).padStart(3, '0');
    const rootId = `c-${bulkPostId}-bulk-${pad}`;
    comments.push({
      id: rootId,
      postId: bulkPostId,
      authorId: commentAuthors[n % commentAuthors.length]!,
      body: `${rootBodies[n % rootBodies.length]!} (#${n})`,
      createdAt: hoursAgo(0.01 * n),
    });
    comments.push({
      id: `c-${bulkPostId}-bulk-${pad}-r1`,
      postId: bulkPostId,
      authorId: commentAuthors[(n + 1) % commentAuthors.length]!,
      parentId: rootId,
      body: `${replyBodies[n % replyBodies.length]!} (رد #${n})`,
      createdAt: hoursAgo(0.01 * n - 0.005),
    });
  }

  for (const c of comments) {
    const { id, ...rest } = c;
    await prisma.comment.upsert({
      where: { id },
      create: { id, ...rest },
      update: rest,
    });
  }
  console.log(`  comments: ${comments.length}`);

  // ------------------------------------------------------------
  // Notifications — 15 per seeded user
  // ------------------------------------------------------------
  // Use resolved DB ids (phone-reuse may map a seed id to another row).
  const notificationUserIds = [...new Set(resolvedSeedUserIds)];
  if (superEmail) {
    const superAdmin = await prisma.user.findUnique({
      where: { email: superEmail },
      select: { id: true },
    });
    if (superAdmin) {
      notificationUserIds.push(superAdmin.id);
    }
  }

  const actorCandidates = ['user-store', 'user-employee', ...notificationUserIds];
  const existingActors = await prisma.user.findMany({
    where: { id: { in: actorCandidates } },
    select: { id: true },
  });
  const actorIds = existingActors.map((a) => a.id);
  const actorA = actorIds[0] ?? null;
  const actorB = actorIds[1] ?? actorA;

  const notificationTemplates = [
    {
      type: NotificationType.order_placed,
      title: 'طلب جديد',
      body: 'طلب جديد ORD-1001 من متجر الأزياء',
      linkTo: '/orders',
    },
    {
      type: NotificationType.order_status,
      title: 'طلبك في الطريق',
      body: 'طلبك ORD-1002 في الطريق إليك',
      linkTo: '/orders',
    },
    {
      type: NotificationType.order_delivered,
      title: 'تم التسليم',
      body: 'تم تسليم طلبك ORD-1003',
      linkTo: '/orders',
    },
    {
      type: NotificationType.order_cancelled,
      title: 'تم إلغاء الطلب',
      body: 'تم إلغاء طلب ORD-1004',
      linkTo: '/orders',
    },
    {
      type: NotificationType.new_comment,
      title: 'تعليق جديد',
      body: 'متجر الأزياء علّق على منشورك',
      linkTo: '/posts/post-job-offer-1',
    },
    {
      type: NotificationType.new_like,
      title: 'إعجاب جديد',
      body: 'أحمد الخياط أعجب بمنشورك',
      linkTo: '/posts/post-product-offer-1',
    },
    {
      type: NotificationType.receiving_confirmed,
      title: 'تم استلام شحنتك',
      body: 'تم استلام RCV-1001 بقيمة 250000 ل.س',
      linkTo: '/supply',
    },
    {
      type: NotificationType.order_placed,
      title: 'طلب جديد',
      body: 'طلب جديد ORD-1005 من متجر الأزياء',
      linkTo: '/orders',
    },
    {
      type: NotificationType.order_status,
      title: 'جاري التجهيز',
      body: 'طلبك ORD-1006 قيد التجهيز',
      linkTo: '/orders',
    },
    {
      type: NotificationType.order_delivered,
      title: 'تم التسليم',
      body: 'تم تسليم طلبك ORD-1007',
      linkTo: '/orders',
    },
    {
      type: NotificationType.new_comment,
      title: 'تعليق جديد',
      body: 'معمل النسيج الدمشقي علّق على منشورك',
      linkTo: '/posts/post-service-offer-1',
    },
    {
      type: NotificationType.new_like,
      title: 'إعجاب جديد',
      body: '3 أشخاص أعجبوا بمنشورك',
      linkTo: '/posts/post-job-seek-1',
    },
    {
      type: NotificationType.receiving_confirmed,
      title: 'تم استلام شحنتك',
      body: 'تم استلام RCV-1002 بقيمة 80000 ل.س',
      linkTo: '/supply',
    },
    {
      type: NotificationType.order_cancelled,
      title: 'تم إلغاء الطلب',
      body: 'تم إلغاء طلب ORD-1008',
      linkTo: '/orders',
    },
    {
      type: NotificationType.order_status,
      title: 'طلبك في الطريق',
      body: 'طلبك ORD-1009 في الطريق إليك',
      linkTo: '/orders',
    },
  ];

  let notificationCount = 0;
  for (const userId of notificationUserIds) {
    for (let i = 0; i < notificationTemplates.length; i++) {
      const template = notificationTemplates[i]!;
      const id = `notif-${userId}-${String(i + 1).padStart(2, '0')}`;
      const data = {
        userId,
        actorId: i % 2 === 0 ? actorA : actorB,
        type: template.type,
        title: template.title,
        body: template.body,
        linkTo: template.linkTo,
        read: i < 5,
        createdAt: hoursAgo(i + 1),
      };
      await prisma.notification.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      });
      notificationCount += 1;
    }
  }
  console.log(
    `  notifications: ${notificationCount} (${notificationTemplates.length} each for ${notificationUserIds.length} users)`,
  );

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

