import {
  BusinessType,
  MediaType,
  PostApprovalStatus,
  PostType,
  PrismaClient,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();
const USERS_PER_ROLE = 15;
const POSTS_PER_USER = 15;
const LOCATIONS = [
  { id: 'loc-damascus', name: 'دمشق' },
  { id: 'loc-halep', name: 'حلب' },
  { id: 'loc-homs', name: 'حمص' },
  { id: 'loc-hama', name: 'حماة' },
  { id: 'loc-lattakia', name: 'اللاذقية' },
  { id: 'loc-tartous', name: 'طرطوس' },
  { id: 'loc-idlib', name: 'إدلب' },
  { id: 'loc-daraa', name: 'درعا' },
  { id: 'loc-sweida', name: 'السويداء' },
  { id: 'loc-rural-damascus', name: 'ريف دمشق' },
] as const;

const demoUsers = [
  ...Array.from({ length: USERS_PER_ROLE }, (_, index) => {
    const number = index + 1;
    const location = LOCATIONS[index % LOCATIONS.length]!;
    return {
      id: `demo-employee-${String(number).padStart(2, '0')}`,
      phone: `+963994090${String(number).padStart(3, '0')}`,
      name: `عامل نسيج ${number}`,
      role: UserRole.employee,
      locationId: location.id,
      locationName: location.name,
    };
  }),
  ...Array.from({ length: USERS_PER_ROLE }, (_, index) => {
    const number = index + 1;
    const location = LOCATIONS[index % LOCATIONS.length]!;
    return {
      id: `demo-workshop-${String(number).padStart(2, '0')}`,
      phone: `+963994091${String(number).padStart(3, '0')}`,
      name: `مشغل خيط ${number}`,
      role: UserRole.workshop,
      locationId: location.id,
      locationName: location.name,
    };
  }),
  ...Array.from({ length: USERS_PER_ROLE }, (_, index) => {
    const number = index + 1;
    const location = LOCATIONS[index % LOCATIONS.length]!;
    return {
      id: `demo-store-${String(number).padStart(2, '0')}`,
      phone: `+963994092${String(number).padStart(3, '0')}`,
      name: `متجر خيط ${number}`,
      role: UserRole.store,
      locationId: location.id,
      locationName: location.name,
    };
  }),
];

const postTypesByRole: Record<UserRole, PostType[]> = {
  [UserRole.employee]: [
    PostType.job_seeking,
    PostType.service_offering,
    PostType.material_requesting,
  ],
  [UserRole.workshop]: [
    PostType.material_offering,
    PostType.product_offering,
    PostType.job_offering,
  ],
  [UserRole.store]: [
    PostType.product_offering,
    PostType.material_requesting,
    PostType.material_offering,
  ],
  [UserRole.institute]: [PostType.service_offering],
  [UserRole.marketer]: [PostType.product_offering],
  [UserRole.shipping_company]: [PostType.service_offering],
  [UserRole.admin]: [PostType.job_seeking],
  [UserRole.super_admin]: [PostType.job_seeking],
  [UserRole.inventory]: [PostType.job_seeking],
  [UserRole.delivery]: [PostType.job_seeking],
};

async function seed(): Promise<void> {
  const locations = await prisma.location.findMany({
    where: { id: { in: LOCATIONS.map((location) => location.id) } },
    select: { id: true },
  });
  const availableLocationIds = new Set(locations.map(({ id }) => id));

  const demoIds = demoUsers.map(({ id }) => id);
  const demoPhones = demoUsers.map(({ phone }) => phone);
  const existingByPhone = await prisma.user.findMany({
    where: { phone: { in: demoPhones } },
    select: { id: true, phone: true },
  });
  const idByPhone = new Map(
    demoUsers.map(({ id, phone }) => [phone, id] as const),
  );
  const phoneConflict = existingByPhone.find(
    (user) => user.phone !== null && idByPhone.get(user.phone) !== user.id,
  );
  if (phoneConflict) {
    throw new Error(
      `Demo phone ${phoneConflict.phone} is already assigned to ${phoneConflict.id}; no demo users were seeded.`,
    );
  }

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        locationId: availableLocationIds.has(user.locationId)
          ? user.locationId
          : null,
        onboardingCompleted: true,
        verified: true,
        ...(user.role === UserRole.employee
          ? { bio: `عامل في مجال الخياطة والألبسة — ${user.locationName}` }
          : {}),
      },
      update: {
        phone: user.phone,
        name: user.name,
        role: user.role,
        locationId: availableLocationIds.has(user.locationId)
          ? user.locationId
          : null,
        onboardingCompleted: true,
        verified: true,
        ...(user.role === UserRole.employee
          ? { bio: `عامل في مجال الخياطة والألبسة — ${user.locationName}` }
          : {}),
      },
    });
  }

  const businessIds = new Map<string, string>();
  for (const user of demoUsers) {
    if (user.role !== UserRole.workshop && user.role !== UserRole.store) {
      continue;
    }

    const number = Number(user.id.slice(user.id.lastIndexOf('-') + 1));
    const businessId = `biz-${user.id}`;
    const businessData = {
      ownerId: user.id,
      type:
        user.role === UserRole.workshop
          ? BusinessType.workshop
          : BusinessType.store,
      name: user.name,
      location: user.locationName,
      description:
        user.role === UserRole.workshop
          ? `مشغل متخصص بالخياطة وإنتاج الألبسة في ${user.locationName}`
          : `متجر للأقمشة والألبسة في ${user.locationName}`,
      phone: user.phone,
      verified: number % 2 === 0,
      ...(user.role === UserRole.workshop
        ? {
            capacity: `${500 + number * 100} قطعة شهرياً`,
            equipment: 'ماكينات خياطة صناعية',
            minOrder: '10 قطع',
            experience: `${2 + (number % 10)} سنوات`,
            services: ['خياطة ألبسة', 'قص وتفصيل', 'تعديلات'],
          }
        : {
            experience: `${1 + (number % 10)} سنوات`,
            services: ['بيع بالجملة', 'بيع بالمفرق', 'توصيل'],
          }),
    };

    const ownedBusiness = await prisma.business.findUnique({
      where: { ownerId: user.id },
      select: { id: true },
    });
    const business = ownedBusiness
      ? await prisma.business.update({
          where: { ownerId: user.id },
          data: businessData,
          select: { id: true },
        })
      : await prisma.business.upsert({
          where: { id: businessId },
          create: { id: businessId, ...businessData },
          update: businessData,
          select: { id: true },
        });
    businessIds.set(user.id, business.id);
  }

  let postCount = 0;
  for (const user of demoUsers) {
    const types = postTypesByRole[user.role];
    for (let index = 1; index <= POSTS_PER_USER; index++) {
      const number = String(index).padStart(2, '0');
      const type = types[(index - 1) % types.length]!;
      const postId = `bulk-post-${user.id}-${number}`;
      const data = {
        authorId: user.id,
        businessId: businessIds.get(user.id) ?? null,
        type,
        title: `منشور ${index} — ${user.name}`,
        body: `منشور تجريبي عن ${type} للمستخدم ${user.name} في ${user.locationName}.`,
        location: user.locationName,
        media: MediaType.none,
        imageUrls: [] as string[],
        active: true,
        approvalStatus: PostApprovalStatus.approved,
        specialty:
          user.role === UserRole.employee ? 'خياطة' : 'أقمشة وألبسة',
        skills: user.role === UserRole.employee ? ['خياطة'] : [],
        workType: user.role === UserRole.employee ? ['كامل'] : [],
      };

      await prisma.post.upsert({
        where: { id: postId },
        create: { id: postId, ...data },
        update: data,
      });
      postCount++;
    }
  }

  console.log(
    `Seeded ${demoUsers.length} demo users (15 per role), ${businessIds.size} businesses, and ${postCount} posts.`,
  );
}

seed()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : 'Failed to seed demo role data.',
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
