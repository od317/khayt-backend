const AT = '2026-09-29T07:22:15.000Z';

export const sampleProductRef = {
  id: 'prod-qamis-abyad',
  name: 'قميص أبيض رجالي',
  price: 45000,
  images: ['/uploads/products/example.jpg'],
};

export const sampleProductNamesResponse = {
  items: [
    { id: 'prod-qamis-abyad', name: 'قميص أبيض رجالي' },
    { id: 'prod-bantal-jeans', name: 'بنطال جينز' },
    { id: 'prod-qamis-kaki', name: 'قميص كاكي' },
  ],
};

export const sampleDeliveryBorder = {
  centerLat: 33.5138,
  centerLng: 36.2765,
  radiusKm: 18,
};

export const sampleUser = {
  id: '',
  role: 'employee',
  name: '',
  phone: '',
  email: null as string | null,
  location: 'دمشق',
  locationId: 'loc-damascus',
  deliveryBorder: sampleDeliveryBorder as typeof sampleDeliveryBorder | null,
  deliveryAddress: null as string | null,
  deliveryLat: null as number | null,
  deliveryLng: null as number | null,
  bio: null as string | null,
  avatarUrl:
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbksj9NS4J0zAJN5LEwzN6i0tV5dtgZmR89UzhDAK7CYCIsFvpajnCeHvl&s=10',
  availableForWork: true,
  verified: false,
  onboardingCompleted: true,
  canOrder: false,
};

export const sampleRole = {
  value: 'employee',
  label: 'موظف',
  description:
    'ابحث عن فرص عمل، اعرض مهاراتك، وتواصل مع المعامل والمتاجر في قطاع النسيج.',
  iconUrl:
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbksj9NS4J0zAJN5LEwzN6i0tV5dtgZmR89UzhDAK7CYCIsFvpajnCeHvl&s=10',
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
  services: [] as string[],
  duration: null as string | null,
  topics: [] as string[],
  createdAt: AT,
};

export const sampleProduct = {
  id: '',
  name: '',
  category: '',
  description: null as string | null,
  images: [''],
  unit: 'قطعة',
  price: 0,
  inWarehouse: false,
  available: true,
  guarantee: false,
  supplierBusinessId: null as string | null,
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
        images: [
          '/uploads/products/red.jpg',
          '/uploads/products/red-2.jpg',
        ],
        children: [
          { name: 'M', image: '/uploads/products/red.jpg' },
          { name: 'L', image: '/uploads/products/red.jpg' },
        ],
      },
    ],
  } as unknown,
  colorImages: [
    {
      name: 'أحمر',
      hex: '#FF0000',
      image: '/uploads/products/red.jpg',
      images: [
        '/uploads/products/red.jpg',
        '/uploads/products/red-2.jpg',
      ],
      originalPrice: 0,
      price: 0,
      discountPercent: null as number | null,
      sizeMode: 'free' as 'free' | 'pack',
      sizePack: null as { sizes: string[]; qtyPerSize: number } | null,
      unitsPerPack: null as number | null,
    },
  ],
  packaging: null as unknown,
  discount: null as unknown,
  offer: null as string | null,
  saleCase: 'locked_axis' as
    | 'free'
    | 'mixed'
    | 'color_size_pack'
    | 'color_pair_pack'
    | 'locked_axis',
  packPrice: null as number | null,
  saleRule: {
    mode: 'locked_axis',
    lockedAxis: 'color',
    label: 'لون',
    options: ['أحمر'],
    optionCount: 1,
  } as
    | {
        mode: 'locked_axis';
        lockedAxis: 'color' | 'size';
        label: string;
        options: string[];
        optionCount: number;
      }
    | {
        mode: 'color_size_pack';
        sizePack: { sizes: string[]; qtyPerSize: number };
        unitsPerPack: number;
        packPrice: number;
      }
    | {
        mode: 'color_pair_pack';
        sizePack: { sizes: string[]; qtyPerSize: number };
        pairWith: Record<string, string[]>;
        allowedPairColors: string[];
        unitsPerPack: number;
        packPrice: number;
      }
    | null,
  createdAt: AT,
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
  approvalStatus: 'approved' as 'pending' | 'approved' | 'rejected',
  createdAt: AT,
  updatedAt: AT,
  specialty: null as string | null,
  skills: [] as string[],
  workType: [] as string[],
  experience: null as string | null,
  salary: null as string | null,
  salaryType: null as string | null,
  pricing: null as string | null,
  servicePlace: null as string | null,
  sellMethod: null as string | null,
  priceMethod: null as string | null,
  condition: null as string | null,
  price: null as string | null,
  currency: null as string | null,
  categories: [] as { id: string; name: string; slug: string }[],
  author: {
    id: '',
    name: '',
    role: 'employee',
    location: '',
    avatarUrl: null as string | null,
  },
  business: null as null,
  product: sampleProductRef as typeof sampleProductRef | null,
  likes: 0,
  comments: 0,
  likedByMe: false,
  savedByMe: false,
};

export const sampleComment = {
  id: '',
  body: '',
  createdAt: AT,
  parentId: null as string | null,
  author: { id: '', name: '', avatarUrl: null as string | null },
  replies: [] as unknown[],
};

export const sampleOrderListItem = {
  id: '',
  number: '',
  status: 'review',
  statusColor: '#F59E0B',
  total: 0,
  pieces: 4,
  address: '',
  lat: 33.5138,
  lng: 36.2765,
  createdAt: AT,
  updatedAt: AT,
  store: { id: '', name: '' },
};

export const sampleOrderLine = {
  id: '',
  productId: '',
  productName: '',
  productImage: null as string | null,
  quantity: 1,
  unitPrice: 0,
  picked: false,
};

export const sampleOrderDetail = {
  order: {
    id: '',
    number: '',
    status: 'review',
    statusColor: '#F59E0B',
    total: 0,
    pieces: 4,
    address: '',
    lat: 33.5138,
    lng: 36.2765,
    createdAt: AT,
    updatedAt: AT,
    canCancel: true,
    canAdvance: true,
  },
  store: { id: '', name: '', phone: null as string | null },
  lines: [sampleOrderLine],
  delivery: null as null,
  whatsapp: '',
  phone: '',
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
  sent: 0,
  remaining: 0,
  sold: 0,
  unitPrice: 0,
  isLowStock: false,
  updatedAt: AT,
};

/** Supply/inventory list totals: quantities + money (اجمالي المرسل / المدفوع / المتبقي). */
export const sampleInventoryTotals = {
  productCount: 0,
  sent: 0,
  remaining: 0,
  sold: 0,
  money: {
    sent: 0,
    paid: 0,
    remaining: 0,
  },
};

export function inventoryListSample(item = sampleInventoryItem) {
  return {
    items: [item],
    totals: sampleInventoryTotals,
    total: 0,
    page: 1,
    limit: 20,
  };
}

/** GET /supply — full list, no pagination. */
export function supplyListSample(item = sampleInventoryItem) {
  return {
    items: [item],
    totals: sampleInventoryTotals,
    total: 0,
  };
}

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
  ...sampleRole,
  id: 'role-employee',
  visibleInApp: true,
  system: true,
  sortOrder: 10,
};

export const sampleCityLocation = {
  id: 'loc-damascus',
  name: 'دمشق',
  deliveryBorder: sampleDeliveryBorder,
  areas: [{ id: 'loc-damascus-mazzeh', name: 'المزة' }],
};

export const sampleAdminLocation = {
  id: 'loc-damascus',
  name: 'دمشق',
  parentId: null as string | null,
  sortOrder: 1,
  active: true,
  centerLat: 33.5138,
  centerLng: 36.2765,
  radiusKm: 18,
  areas: [
    {
      id: 'loc-damascus-mazzeh',
      name: 'المزة',
      parentId: 'loc-damascus',
      sortOrder: 1,
      active: true,
      areas: [] as unknown[],
    },
  ],
};

export const sampleMarketer = {
  id: '',
  name: 'مسوق أقمشة',
  bio: 'ترويج أقمشة وألبسة',
  avatarUrl:
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbksj9NS4J0zAJN5LEwzN6i0tV5dtgZmR89UzhDAK7CYCIsFvpajnCeHvl&s=10',
  verified: false,
  availableForWork: true,
  location: 'دمشق',
};

export const sampleShippingCompany = {
  id: '',
  name: 'شركة شحن',
  location: 'دمشق',
  verified: false,
  coverage: ['دمشق', 'ريف دمشق'],
  deliveryTime: '1-2 يوم',
  pricing: 'حسب الوزن',
  fleet: 'فان + دراجة',
  phone: '',
  imageUrl:
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKFSey5bgsBA3-2Z7f27pym50-ySDrxPZWoIJ1bOCQ9pQVdvEun88f-iPX&s=10',
  createdAt: AT,
};

export const sampleCartItem = {
  id: '',
  quantity: 2,
  variant: { color: 'أحمر', size: 'M' } as Record<string, string> | null,
  variantKey: 'color=أحمر|size=M',
  product: {
    id: 'prod-qamis-abyad',
    name: 'قميص أبيض رجالي',
    price: 45000,
    unit: 'قطعة',
    images: ['/uploads/products/example.jpg'],
    available: true,
    inWarehouse: true,
    guarantee: false,
    variantImage: '/uploads/products/red.jpg' as string | null,
  },
  lineTotal: 90000,
  available: true,
  unavailableReason: null as string | null,
};

export const sampleCart = {
  items: [sampleCartItem],
  totals: {
    distinctProducts: 1,
    totalItems: 2,
    subtotal: 90000,
  },
};

export const sampleTokens = {
  accessToken: '',
  refreshToken: '',
  accessTokenExpiresAt: AT,
};

const postMultipartHint =
  'multipart/form-data. Optional: upload photos with `images` (repeat, max 8).';

const reelMultipartHint =
  'multipart/form-data. Upload the reel with `video`, and optional photos with `images` (repeat, max 8).';

export const createPostSwaggerExamples = {
  job_offering: {
    summary: 'ابحث عن موظف',
    description: postMultipartHint,
    value: {
      type: 'job_offering',
      title: 'مطلوب خياط ماهر',
      body: 'نبحث عن خياط للعمل في المعمل',
      location: 'دمشق',
      specialty: 'إنتاج/صناعة',
      skills: ['خياطة'],
      experience: '3 سنوات',
      workType: ['كامل'],
      salaryType: 'حسب الاتفاق',
      salary: '1,500,000',
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
      specialty: 'تطريز',
      servicePlace: 'في المشغل',
      pricing: 'بالقطعة',
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
      specialty: 'ألبسة رجالية',
      sellMethod: 'جملة',
      priceMethod: 'سعر ثابت',
      price: '45000',
      currency: 'ليرة سورية',
      productId: 'prod-qamis-abyad',
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
      specialty: 'إنتاج/صناعة',
      workType: ['كامل', 'جزئي'],
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
      specialty: 'خياطة',
    },
  },
};

export function paginated<T>(item: T) {
  return { items: [item], total: 1, page: 1, limit: 20 };
}
