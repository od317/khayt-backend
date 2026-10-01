const AT = '2026-09-29T07:22:15.000Z';

export const sampleUser = {
  id: '',
  role: 'employee',
  name: '',
  phone: '',
  email: null as string | null,
  location: '',
  bio: null as string | null,
  avatarUrl: null as string | null,
  availableForWork: true,
  verified: false,
  onboardingCompleted: true,
};

export const sampleBusiness = {
  id: '',
  type: 'workshop',
  name: '',
  location: '',
  description: null as string | null,
  phone: null as string | null,
  imageUrl: null as string | null,
  verified: false,
  capacity: null as string | null,
  equipment: null as string | null,
  minOrder: null as string | null,
  experience: null as string | null,
  duration: null as string | null,
  topics: [] as string[],
  createdAt: AT,
};

export const sampleProduct = {
  id: '',
  businessId: '',
  name: '',
  category: '',
  description: null as string | null,
  images: [''],
  unit: 'قطعة',
  price: 0,
  inWarehouse: false,
  available: true,
  variants: {
    axes: [
      { key: 'color', label: 'لون' },
      { key: 'size', label: 'قياس' },
    ],
    options: [
      {
        name: 'أحمر',
        hex: '#FF0000',
        image: '/uploads/products/red.jpg',
        children: [
          { name: 'M', image: '/uploads/products/red.jpg' },
          { name: 'L', image: '/uploads/products/red.jpg' },
        ],
      },
    ],
  } as unknown,
  packaging: null as unknown,
  discount: null as unknown,
  offer: null as string | null,
  createdAt: AT,
  businessName: '',
  businessLocation: '',
};

export const samplePost = {
  id: '',
  type: 'job_seeking',
  title: '',
  body: '',
  media: 'none',
  imageUrls: [] as string[],
  videoUrl: null as string | null,
  location: '',
  active: true,
  createdAt: AT,
  updatedAt: AT,
  specialty: null as string | null,
  skills: [] as string[],
  workType: [] as string[],
  experience: null as string | null,
  salary: null as string | null,
  pricing: null as string | null,
  condition: null as string | null,
  price: null as string | null,
  categories: [] as { id: string; name: string; slug: string }[],
  author: {
    id: '',
    name: '',
    role: 'employee',
    location: '',
    avatarUrl: null as string | null,
  },
  business: null as null,
  likes: 0,
  comments: 0,
  likedByMe: false,
  savedByMe: false,
};

export const sampleComment = {
  id: '',
  body: '',
  createdAt: AT,
  author: { id: '', name: '', avatarUrl: null as string | null },
};

export const sampleOrderListItem = {
  id: '',
  number: '',
  status: 'review',
  total: 0,
  pieces: 4,
  createdAt: AT,
  updatedAt: AT,
  store: { id: '', name: '' },
};

export const sampleOrderLine = {
  id: '',
  productId: '',
  productName: '',
  businessId: '',
  businessName: '',
  quantity: 1,
  unitPrice: 0,
  picked: false,
};

export const sampleOrderDetail = {
  order: {
    id: '',
    number: '',
    status: 'review',
    total: 0,
    pieces: 4,
    createdAt: AT,
    updatedAt: AT,
    canCancel: true,
    canAdvance: true,
  },
  store: { id: '', name: '', phone: null as string | null },
  lines: [sampleOrderLine],
  delivery: null as null,
};

export const sampleNotification = {
  id: '',
  type: 'system',
  title: '',
  body: '',
  linkTo: null as string | null,
  read: false,
  createdAt: AT,
};

export const sampleBill = {
  id: '',
  number: '',
  businessId: '',
  businessName: '',
  receivingId: '',
  paymentType: 'cash',
  status: 'unpaid',
  issuedAt: AT,
  dueAt: null as string | null,
  total: 0,
  paid: 0,
  remaining: 0,
  createdAt: AT,
};

export const sampleReceiving = {
  id: '',
  number: '',
  businessId: '',
  businessName: '',
  receivedAt: AT,
  paymentType: 'cash',
  total: 0,
  createdAt: AT,
};

export const sampleInventoryItem = {
  id: '',
  productId: '',
  productName: '',
  productUnit: 'قطعة',
  businessId: '',
  businessName: '',
  sent: 0,
  remaining: 0,
  sold: 0,
  unitPrice: 0,
  isLowStock: false,
  updatedAt: AT,
};

export const sampleDelivery = {
  id: '',
  number: '',
  status: 'pending',
  area: '',
  driverId: null as string | null,
  driverName: null as string | null,
  orderCount: 0,
  createdAt: AT,
  deliveredAt: null as string | null,
};

export const sampleAdminRole = {
  value: 'employee',
  label: '',
  description: '',
  id: '',
  visibleInApp: true,
  system: true,
  sortOrder: 10,
};

export const sampleAdminLocation = {
  id: '',
  name: 'دمشق',
  parentId: null as string | null,
  sortOrder: 0,
  active: true,
  areas: [
    {
      id: '',
      name: '',
      parentId: '',
      sortOrder: 0,
      active: true,
      areas: [] as unknown[],
    },
  ],
};

export const sampleTokens = {
  accessToken: '',
  refreshToken: '',
  accessTokenExpiresAt: AT,
};

const postMultipartHint =
  'multipart/form-data. Use the `images` file picker (repeat, max 8). Arrays such as categoryIds can be JSON strings. Do not send image URLs.';

const reelMultipartHint =
  'multipart/form-data. Upload the reel with `video`, and optional photos with `images` (repeat, max 8). Arrays such as categoryIds can be JSON strings.';

export const createPostSwaggerExamples = {
  job_offering: {
    summary: 'ابحث عن موظف',
    description: postMultipartHint,
    value: {
      type: 'job_offering',
      title: 'مطلوب خياط ماهر',
      body: 'نبحث عن خياط للعمل في المعمل',
      location: 'دمشق',
      categoryIds: ['cat-wazaif'],
      specialty: 'خياطة',
      skills: ['خياطة'],
      experience: '3 سنوات',
      workType: ['دوام كامل'],
      salary: 'حسب الاتفاق',
    },
  },
  service_offering: {
    summary: 'عرض خدمة',
    description: postMultipartHint,
    value: {
      type: 'service_offering',
      title: 'خدمة تطريز',
      body: 'أقدم تطريز يدوي',
      location: 'دمشق',
      categoryIds: ['cat-tatriz', 'cat-khadamat'],
      specialty: 'تطريز',
      pricing: 'حسب القطعة',
    },
  },
  product_offering: {
    summary: 'عرض منتج',
    description: postMultipartHint,
    value: {
      type: 'product_offering',
      title: 'قمصان قطن',
      body: 'قمصان جاهزة للبيع',
      location: 'دمشق',
      categoryIds: ['cat-qumsan'],
      price: '45000',
    },
  },
  material_offering: {
    summary: 'عرض مواد ومكنات',
    description: postMultipartHint,
    value: {
      type: 'material_offering',
      title: 'قماش قطن للبيع',
      body: 'قماش قطن، ماكينة خياطة',
      location: 'دمشق',
      categoryIds: ['cat-qumsan'],
      specialty: 'أقمشة',
      condition: 'جديدة',
      price: '2500000',
    },
  },
  reel: {
    summary: 'ريل',
    description: reelMultipartHint,
    value: {
      type: 'reel',
      title: 'تشكيلة صيفية جديدة',
      body: 'جولة في المشغل',
      location: 'دمشق',
      categoryIds: ['cat-qumsan'],
    },
  },
  material_requesting: {
    summary: 'أبحث عن مواد ومكنات',
    description: postMultipartHint,
    value: {
      type: 'material_requesting',
      title: 'أبحث عن قماش كتان',
      body: 'قماش كتان، مقص كهربائي',
      location: 'دمشق',
      categoryIds: ['cat-bantal'],
      specialty: 'أقمشة',
      condition: 'أي حالة',
    },
  },
  job_seeking: {
    summary: 'أبحث عن عمل',
    description: postMultipartHint,
    value: {
      type: 'job_seeking',
      title: 'خياط يبحث عن عمل',
      body: 'خبرة 10 سنوات في خياطة القمصان',
      location: 'دمشق',
      categoryIds: ['cat-wazaif'],
      specialty: 'خياطة',
      workType: ['دوام كامل', 'دوام جزئي'],
      experience: '10 سنوات',
    },
  },
  service_requesting: {
    summary: 'أحتاج شخصاً',
    description: postMultipartHint,
    value: {
      type: 'service_requesting',
      title: 'أحتاج خياط',
      body: 'أبحث عن خياط لإنهاء طلب',
      location: 'دمشق',
      categoryIds: ['cat-khadamat'],
      specialty: 'خياطة',
    },
  },
};

export function paginated<T>(item: T) {
  return { items: [item], total: 1, page: 1, limit: 20 };
}
