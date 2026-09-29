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
  colors: null as unknown,
  sizes: [] as string[],
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
  pieces: 0,
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
    pieces: 0,
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

export function paginated<T>(item: T) {
  return { items: [item], total: 1, page: 1, limit: 20 };
}
