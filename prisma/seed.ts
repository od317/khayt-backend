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
  // Categories
  // ------------------------------------------------------------
  const categories = [
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
    {
      id: 'user-employee',
      phone: '0994000001',
      name: 'أحمد الخياط',
      role: UserRole.employee,
      locationId: 'loc-damascus-mazzeh',
      onboardingCompleted: true,
    },
    {
      id: 'user-workshop',
      phone: '0994000002',
      name: 'معمل النسيج الدمشقي',
      role: UserRole.workshop,
      locationId: 'loc-damascus',
      onboardingCompleted: true,
    },
    {
      id: 'user-institute',
      phone: '0994000003',
      name: 'معهد الخياطة',
      role: UserRole.institute,
      locationId: 'loc-damascus-midan',
      onboardingCompleted: true,
    },
    {
      id: 'user-store',
      phone: '0994000004',
      name: 'متجر الأزياء',
      role: UserRole.store,
      locationId: 'loc-damascus',
      onboardingCompleted: true,
    },
    {
      id: 'user-admin',
      phone: '0994000005',
      name: 'مدير النظام',
      role: UserRole.admin,
      locationId: null,
      onboardingCompleted: true,
    },
    {
      id: 'user-delivery',
      phone: '0994000006',
      name: 'أبو محمد',
      role: UserRole.delivery,
      locationId: 'loc-damascus',
      onboardingCompleted: true,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        phone: u.phone,
        name: u.name,
        role: u.role,
        locationId: u.locationId,
        onboardingCompleted: u.onboardingCompleted,
        verified: u.role !== UserRole.employee,
      },
      update: {
        phone: u.phone,
        name: u.name,
        role: u.role,
        locationId: u.locationId,
        onboardingCompleted: u.onboardingCompleted,
      },
    });
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

  // ------------------------------------------------------------
  // Businesses
  // ------------------------------------------------------------
  const businesses = [
    {
      id: 'biz-workshop',
      ownerId: 'user-workshop',
      type: BusinessType.workshop,
      name: 'معمل النسيج الدمشقي',
      location: 'دمشق - القدم',
      description: 'معمل متخصص بصناعة القمصان والبناطيل',
      phone: '0994000002',
      verified: true,
      capacity: '5000 قطعة شهرياً',
      equipment: '20 ماكينة خياطة صناعية',
      minOrder: '100 قطعة',
      experience: '15 سنة',
    },
    {
      id: 'biz-institute',
      ownerId: 'user-institute',
      type: BusinessType.institute,
      name: 'معهد الخياطة',
      location: 'دمشق - الميدان',
      description: 'دورات تدريب على الخياطة والتطريز',
      phone: '0994000003',
      verified: true,
      duration: '3 أشهر',
      topics: ['خياطة أساسية', 'تطريز يدوي', 'تصميم أزياء'],
      experience: '8 سنوات',
    },
    {
      id: 'biz-store',
      ownerId: 'user-store',
      type: BusinessType.store,
      name: 'متجر الأزياء',
      location: 'دمشق - الحمرا',
      description: 'متجر لبيع الملابس بالجملة',
      phone: '0994000004',
      verified: false,
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
  // Products
  // ------------------------------------------------------------
  const products = [
    {
      id: 'prod-qamis-abyad',
      businessId: 'biz-workshop',
      name: 'قميص أبيض رجالي',
      category: 'قمصان',
      description: 'قميص قطن 100%',
      images: ['https://placehold.co/600x400?text=Qamis'],
      unit: 'قطعة',
      price: 45000,
      inWarehouse: true,
      available: true,
      colors: [
        {
          name: 'أبيض',
          hex: '#FFFFFF',
          image: 'https://placehold.co/600x400?text=White',
          sizes: ['S', 'M', 'L', 'XL'],
        },
        {
          name: 'أزرق',
          hex: '#1E3A8A',
          image: 'https://placehold.co/600x400?text=Blue',
          sizes: ['M', 'L', 'XL'],
        },
      ],
      sizes: [],
      packaging: { onlyPackage: false, unitsPerPackage: 10, label: 'علبة 10' },
      discount: { percent: 10, originalPrice: 50000 },
      offer: 'عرض خاص',
    },
    {
      id: 'prod-qamis-kaki',
      businessId: 'biz-workshop',
      name: 'قميص كاكي',
      category: 'قمصان',
      description: 'قميص كاكي عملي',
      images: ['https://placehold.co/600x400?text=Kaki'],
      unit: 'قطعة',
      price: 40000,
      inWarehouse: false,
      available: true,
    },
    {
      id: 'prod-bantal-jeans',
      businessId: 'biz-workshop',
      name: 'بنطال جينز',
      category: 'بنطال',
      description: 'جينز رجالي',
      images: ['https://placehold.co/600x400?text=Jeans'],
      unit: 'قطعة',
      price: 65000,
      inWarehouse: true,
      available: true,
      sizes: ['30', '32', '34', '36'],
    },
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
  // Supply (warehouse stock)
  // ------------------------------------------------------------
  const supply = [
    {
      businessId: 'biz-workshop',
      productId: 'prod-qamis-abyad',
      sent: 200,
      remaining: 150,
      unitPrice: 35000,
    },
    {
      businessId: 'biz-workshop',
      productId: 'prod-bantal-jeans',
      sent: 80,
      remaining: 60,
      unitPrice: 50000,
    },
  ];

  for (const s of supply) {
    await prisma.supply.upsert({
      where: {
        businessId_productId: {
          businessId: s.businessId,
          productId: s.productId,
        },
      },
      create: s,
      update: s,
    });
  }
  console.log(`  supply rows: ${supply.length}`);

  // ------------------------------------------------------------
  // Posts
  // ------------------------------------------------------------
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
      specialty: 'خياطة',
      workType: ['دوام كامل'],
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
      specialty: 'خياطة',
      workType: ['دوام كامل', 'دوام جزئي'],
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
      specialty: 'تطريز',
      pricing: 'حسب القطعة',
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
      condition: 'جديد',
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
  ];

  for (const p of posts) {
    const { id, ...rest } = p;
    await prisma.post.upsert({
      where: { id },
      create: { id, ...rest },
      update: rest,
    });
  }
  console.log(`  posts: ${posts.length}`);

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
  // Comments
  // ------------------------------------------------------------
  const comments = [
    {
      id: 'comment-1',
      postId: 'post-job-offer-1',
      authorId: 'user-employee',
      body: 'أنا مهتم، كيف أتواصل؟',
      createdAt: hoursAgo(1),
    },
    {
      id: 'comment-2',
      postId: 'post-product-offer-1',
      authorId: 'user-store',
      body: 'ما هو سعر الجملة؟',
      createdAt: hoursAgo(2),
    },
    {
      id: 'comment-3',
      postId: 'post-service-offer-1',
      authorId: 'user-store',
      body: 'عمل جميل ما شاء الله',
      createdAt: hoursAgo(3),
    },
  ];

  for (const c of comments) {
    const { id, ...rest } = c;
    await prisma.comment.upsert({
      where: { id },
      create: { id, ...rest },
      update: rest,
    });
  }
  console.log(`  comments: ${comments.length}`);

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
