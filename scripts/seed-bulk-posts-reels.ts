/**
 * Ensures every user has 15 posts + 15 reels (idempotent upserts).
 * Creates "يحيى معدل" if missing.
 *
 *   npx ts-node --project tsconfig.seed.json scripts/seed-bulk-posts-reels.ts
 */
import {
  MediaType,
  PostType,
  PrismaClient,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

const HOUR = 60 * 60 * 1000;
const hoursAgo = (n: number): Date => new Date(Date.now() - n * HOUR);

const REEL_VIDEOS = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://res.cloudinary.com/demo/video/upload/dog.mp4',
  'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
  'https://res.cloudinary.com/demo/video/upload/snow_horses.mp4',
] as const;

const POST_IMAGES = [
  'https://placehold.co/600x400?text=Textile+1',
  'https://placehold.co/600x400?text=Textile+2',
  'https://placehold.co/600x400?text=Textile+3',
] as const;

function postTypeForRole(role: UserRole): PostType {
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
}

async function ensureYahya(): Promise<void> {
  const existing = await prisma.user.findFirst({
    where: { name: 'يحيى معدل' },
    select: { id: true },
  });
  if (existing) {
    console.log(`  يحيى معدل already exists (${existing.id})`);
    return;
  }

  const phone = '+963994000001';
  const phoneTaken = await prisma.user.findFirst({
    where: { phone },
    select: { id: true },
  });

  await prisma.user.create({
    data: {
      id: 'user-yahya-moadal',
      name: 'يحيى معدل',
      phone: phoneTaken ? '+963994099901' : phone,
      role: UserRole.employee,
      locationId: 'loc-damascus',
      onboardingCompleted: true,
      verified: true,
    },
  });
  console.log('  created يحيى معدل (user-yahya-moadal)');
}

async function seedForAllUsers(): Promise<void> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      location: { select: { name: true } },
      business: { select: { id: true } },
    },
  });

  let createdOrUpdated = 0;

  for (const user of users) {
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
          postType === PostType.job_seeking ? MediaType.none : MediaType.image,
        imageUrls:
          postType === PostType.job_seeking
            ? []
            : [POST_IMAGES[(i - 1) % POST_IMAGES.length]!],
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
      createdOrUpdated += 2;
    }

    console.log(`  ${display}: 15 posts + 15 reels`);
  }

  console.log(`  upserted ${createdOrUpdated} rows for ${users.length} users`);
}

async function main(): Promise<void> {
  console.log('Bulk posts/reels…');
  await ensureYahya();
  await seedForAllUsers();
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
