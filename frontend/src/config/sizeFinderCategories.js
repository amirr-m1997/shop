/**
 * Size Finder — Product-Driven Category Configuration
 *
 * Each category defines:
 *  - required / optional measurements
 *  - validation rules (min, max, unit)
 *  - measurement guide (illustration, tooltip, description)
 *  - confidence weights for the recommendation engine
 *  - kids override (age-based logic)
 *
 * Adding a new category = adding one object below. No other file changes needed.
 */

/* ── Measurement Definitions ─────────────────────────────────── */

const MEASUREMENTS = {
  height: {
    key: 'height',
    label: 'قد',
    unit: 'cm',
    min: 80,
    max: 250,
    tooltip: 'قد خود را بدون کفش اندازه بگیرید.',
    description: 'روش اندازه‌گیری: صاف بایستید و از کف سر تا زمین را اندازه بگیرید.',
    illustration: 'height',
  },
  weight: {
    key: 'weight',
    label: 'وزن',
    unit: 'kg',
    min: 5,
    max: 250,
    tooltip: 'وزن خود را به کیلوگرم وارد کنید.',
    description: 'وزن خود را با لباس سبک و بدون کفش اندازه بگیرید.',
    illustration: 'weight',
  },
  chest: {
    key: 'chest',
    label: 'دور سینه',
    unit: 'cm',
    min: 50,
    max: 160,
    tooltip: 'نوار را دور پرترین قسمت سینه بپیچید.',
    description: 'نوار اندازه‌گیری را دور پرترین قسمت سینه، بدون فشردن، بپیچید.',
    illustration: 'chest',
  },
  neck: {
    key: 'neck',
    label: 'دور گردن',
    unit: 'cm',
    min: 25,
    max: 60,
    tooltip: 'نوار را دور گردن بپیچید.',
    description: 'نوار را دور گردن در پایین‌ترین قسمت سیب آدم بپیچید.',
    illustration: 'neck',
  },
  waist: {
    key: 'waist',
    label: 'دور کمر',
    unit: 'cm',
    min: 40,
    max: 160,
    tooltip: 'نوار را دور باریک‌ترین قسمت کمر بپیچید.',
    description: 'نوار را دور باریک‌ترین قسمت کمر، معمولاً بالای ناف، بپیچید.',
    illustration: 'waist',
  },
  hip: {
    key: 'hip',
    label: 'دور باسن',
    unit: 'cm',
    min: 50,
    max: 160,
    tooltip: 'نوار را دور پرترین قسمت باسن بپیچید.',
    description: 'نوار را دور پرترین قسمت باسن بپیچید.',
    illustration: 'hip',
  },
  inseam: {
    key: 'inseam',
    label: 'قد داخل پا',
    unit: 'cm',
    min: 30,
    max: 110,
    tooltip: 'قد داخلی پا از کشاله ران تا مچ پا.',
    description: 'پاها را کنار هم بگذارید و از کشاله ران تا مچ پا اندازه بگیرید.',
    illustration: 'inseam',
  },
  shoulder: {
    key: 'shoulder',
    label: 'عرض شانه',
    unit: 'cm',
    min: 25,
    max: 70,
    tooltip: 'فاصله بین دو برجستگی استخوان شانه.',
    description: 'از یک سر شانه تا سر دیگر، از پشت بدن اندازه بگیرید.',
    illustration: 'shoulder',
  },
  sleeve: {
    key: 'sleeve',
    label: 'قد آستین',
    unit: 'cm',
    min: 30,
    max: 90,
    tooltip: 'قد آستین از شانه تا مچ دست.',
    description: 'از برجستگی استخوان شانه تا مچ دست اندازه بگیرید.',
    illustration: 'sleeve',
  },
  footLength: {
    key: 'footLength',
    label: 'قد پا',
    unit: 'cm',
    min: 10,
    max: 35,
    tooltip: 'پا را روی کاغذ بگذارید و از پاشنه تا نوک بلندترین انگشت را علامت بزنید.',
    description: 'پشت پا به دیوار باشد. از پاشنه تا بلندترین انگشت پا اندازه بگیرید.',
    illustration: 'footLength',
  },
  footWidth: {
    key: 'footWidth',
    label: 'عرض پا',
    unit: 'cm',
    min: 5,
    max: 18,
    tooltip: 'پهن‌ترین قسمت کف پا را اندازه بگیرید.',
    description: 'پهن‌ترین قسمت کف پا (معمولاً زیر استخوان‌های پا) را اندازه بگیرید.',
    illustration: 'footWidth',
  },
  headCircumference: {
    key: 'headCircumference',
    label: 'دور سر',
    unit: 'cm',
    min: 40,
    max: 70,
    tooltip: 'نوار را دور پیشانی بپیچید.',
    description: 'نوار را بالای ابرو و پشت سر بپیچید.',
    illustration: 'headCircumference',
  },
  handLength: {
    key: 'handLength',
    label: 'قد دست',
    unit: 'cm',
    min: 10,
    max: 30,
    tooltip: 'قد دست از مچ تا نوک انگشت وسط.',
    description: 'دست را صاف کنید و از مچ تا نوک انگشت وسط اندازه بگیرید.',
    illustration: 'handLength',
  },
  palmCircumference: {
    key: 'palmCircumference',
    label: 'دور کف دست',
    unit: 'cm',
    min: 10,
    max: 40,
    tooltip: 'نوار را دور پهن‌ترین قسمت کف دست بپیچید.',
    description: 'نوار را دور پهن‌ترین قسمت کف دست، بدون شست، بپیچید.',
    illustration: 'palmCircumference',
  },
  waistCircumference: {
    key: 'waistCircumference',
    label: 'دور کمر',
    unit: 'cm',
    min: 40,
    max: 160,
    tooltip: 'دور کمر را اندازه بگیرید.',
    description: 'نوار را دور کمر در سطح ناف بپیچید.',
    illustration: 'waist',
  },
  bust: {
    key: 'bust',
    label: 'دور سینه',
    unit: 'cm',
    min: 50,
    max: 160,
    tooltip: 'نوار را دور پرترین قسمت سینه بپیچید.',
    description: 'نوار را دور پرترین قسمت سینه بپیچید.',
    illustration: 'chest',
  },
  underBust: {
    key: 'underBust',
    label: 'زیر سینه',
    unit: 'cm',
    min: 50,
    max: 130,
    tooltip: 'نوار را زیر سینه بپیچید.',
    description: 'نوار را درست زیر سینه بپیچید.',
    illustration: 'underBust',
  },
  thigh: {
    key: 'thigh',
    label: 'ران',
    unit: 'cm',
    min: 25,
    max: 90,
    tooltip: 'نوار را دور پرترین قسمت ران بپیچید.',
    description: 'نوار را دور پرترین قسمت ران بپیچید.',
    illustration: 'thigh',
  },
  outseam: {
    key: 'outseam',
    label: 'قد بیرونی پا',
    unit: 'cm',
    min: 50,
    max: 130,
    tooltip: 'قد بیرونی پا از کمر تا مچ پا.',
    description: 'از کمر تا مچ پا در بیرون پا اندازه بگیرید.',
    illustration: 'outseam',
  },
  desiredLength: {
    key: 'desiredLength',
    label: 'قد مورد نظر دامن',
    unit: 'cm',
    min: 15,
    max: 120,
    tooltip: 'قد دامن از کمر تا لبه مورد نظر.',
    description: 'از کمر تا قدی که می‌خواهید دامن باشد اندازه بگیرید.',
    illustration: 'desiredLength',
  },
  calfCircumference: {
    key: 'calfCircumference',
    label: 'دور ساق پا',
    unit: 'cm',
    min: 20,
    max: 70,
    tooltip: 'پهن‌ترین قسمت ساق پا را اندازه بگیرید.',
    description: 'نوار را دور پهن‌ترین قسمت ساق پا بپیچید.',
    illustration: 'calfCircumference',
  },
  shoeSize: {
    key: 'shoeSize',
    label: 'سایز کفش (EU)',
    unit: 'EU',
    min: 25,
    max: 52,
    tooltip: 'سایز کفش خود را بر اساس استاندارد اروپا وارد کنید.',
    description: 'سایز کفش اروپایی خود را وارد کنید.',
    illustration: 'shoeSize',
  },
  archType: {
    key: 'archType',
    label: 'نوع قوس پا',
    unit: 'select',
    options: [
      { value: 'low', label: 'صاف' },
      { value: 'normal', label: 'نرمال' },
      { value: 'high', label: 'بلند' },
    ],
    tooltip: 'نوع قوس کف پا.',
    description: 'نگاه کنید وقتی پا روی زمین است چقدر فضا زیر قوس پا وجود دارد.',
    illustration: 'archType',
  },
  runningStyle: {
    key: 'runningStyle',
    label: 'سبک دویدن',
    unit: 'select',
    options: [
      { value: 'neutral', label: 'نرمال' },
      { value: 'overpronation', label: 'اینورشن (ورودی بیش از حد)' },
      { value: 'supination', label: 'اپوزیشن (خروجی بیش از حد)' },
    ],
    tooltip: 'سبک دویدن خود را مشخص کنید.',
    description: 'اگر کف کفش‌هایتان بیش از حد داخل ساییده شده اینورشن، و اگر بیرون ساییده شده اپوزیشن.',
    illustration: 'runningStyle',
  },
  fitPreference: {
    key: 'fitPreference',
    label: 'ترجیح فیت',
    unit: 'select',
    options: [
      { value: 'slim', label: 'چسبان' },
      { value: 'regular', label: 'نرمال' },
      { value: 'loose', label: 'آزاد' },
    ],
    tooltip: 'ترجیح خود را برای فیت مشخص کنید.',
    description: 'آیا ترجیح می‌دهید لباس چسبان، نرمال یا آزاد باشد؟',
    illustration: 'fitPreference',
  },
  age: {
    key: 'age',
    label: 'سن',
    unit: 'years',
    min: 0,
    max: 16,
    tooltip: 'سن کودک را به سال وارد کنید.',
    description: 'سن کودک را به سال وارد کنید.',
    illustration: 'age',
  },
}

/* ── Kids age-based presets ──────────────────────────────────── */

const KIDS_AGE_GROUPS = {
  baby: { label: 'نوزاد', min: 0, max: 2, fields: ['height', 'weight'] },
  toddler: { label: 'نوپا', min: 2, max: 6, fields: ['height', 'weight'] },
  child: { label: 'کودک', min: 6, max: 13, fields: ['height', 'weight'] },
  teen: { label: 'نوجوان', min: 13, max: 17, fields: [] }, // same as adult
}

/* ── Category Configurations ─────────────────────────────────── */

const CATEGORY_GROUPS = [
  {
    id: 'clothing',
    label: 'لباس',
    icon: 'Shirt',
    categories: [
      {
        id: 'tshirt',
        label: 'تی‌شرت',
        backendProductType: 'clothing',
        required: ['height', 'weight', 'chest'],
        optional: ['shoulder', 'waist', 'hip', 'fitPreference'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['chest'],
      },
      {
        id: 'polo',
        label: 'پولوشرت',
        backendProductType: 'clothing',
        required: ['height', 'weight', 'chest'],
        optional: ['shoulder', 'waist', 'hip', 'fitPreference'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['chest'],
      },
      {
        id: 'shirt',
        label: 'پیراهن',
        backendProductType: 'clothing',
        required: ['height', 'weight', 'chest', 'neck'],
        optional: ['sleeve', 'shoulder', 'fitPreference'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['chest'],
      },
      {
        id: 'hoodie',
        label: 'هودی',
        backendProductType: 'clothing',
        required: ['height', 'weight', 'chest'],
        optional: ['shoulder', 'waist', 'hip', 'fitPreference'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['chest'],
      },
      {
        id: 'sweatshirt',
        label: 'سویشرت',
        backendProductType: 'clothing',
        required: ['height', 'weight', 'chest'],
        optional: ['shoulder', 'waist', 'hip', 'fitPreference'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['chest'],
      },
      {
        id: 'jacket',
        label: 'ژاکت',
        backendProductType: 'clothing',
        required: ['height', 'weight', 'chest'],
        optional: ['sleeve', 'shoulder', 'waist', 'fitPreference'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['chest'],
      },
      {
        id: 'coat',
        label: 'بارانی / پالتو',
        backendProductType: 'clothing',
        required: ['height', 'weight', 'chest'],
        optional: ['sleeve', 'shoulder', 'waist', 'fitPreference'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['chest'],
      },
      {
        id: 'suit',
        label: 'کت و شلوار',
        backendProductType: 'clothing',
        required: ['height', 'weight', 'chest', 'waist', 'hip'],
        optional: ['sleeve', 'shoulder', 'inseam', 'neck', 'fitPreference'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['chest', 'waist'],
      },
      {
        id: 'vest',
        label: 'جلیقه',
        backendProductType: 'clothing',
        required: ['height', 'weight', 'chest'],
        optional: ['shoulder', 'waist', 'fitPreference'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['chest'],
      },
    ],
  },
  {
    id: 'bottom',
    label: 'شلوار و دامن',
    icon: 'Shirt',
    categories: [
      {
        id: 'jeans',
        label: 'جین',
        backendProductType: 'clothing',
        required: ['waist', 'hip', 'inseam'],
        optional: ['thigh', 'height', 'weight', 'fitPreference'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['waist'],
      },
      {
        id: 'pants',
        label: 'شلوار',
        backendProductType: 'clothing',
        required: ['waist', 'hip', 'inseam'],
        optional: ['outseam', 'height', 'weight', 'fitPreference'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['waist'],
      },
      {
        id: 'shorts',
        label: 'شورت',
        backendProductType: 'clothing',
        required: ['waist', 'hip'],
        optional: ['height', 'weight', 'fitPreference'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['waist'],
      },
      {
        id: 'jogger',
        label: 'جگر',
        backendProductType: 'clothing',
        required: ['waist', 'hip'],
        optional: ['inseam', 'height', 'weight', 'fitPreference'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['waist'],
      },
      {
        id: 'leggings',
        label: 'لگینگ',
        backendProductType: 'clothing',
        required: ['waist', 'hip', 'height'],
        optional: ['weight', 'fitPreference'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['waist'],
      },
      {
        id: 'skirt',
        label: 'دامن',
        backendProductType: 'clothing',
        required: ['waist', 'hip', 'desiredLength'],
        optional: ['height', 'weight'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: ['waist'],
      },
    ],
  },
  {
    id: 'footwear',
    label: 'کفش',
    icon: 'Footprints',
    categories: [
      {
        id: 'sneakers',
        label: 'اسنیکرز',
        backendProductType: 'shoes',
        required: ['footLength'],
        optional: ['footWidth', 'fitPreference'],
        kidsRequired: ['age', 'footLength'],
        kidsOptional: [],
        neverAsk: ['chest', 'waist', 'hip'],
      },
      {
        id: 'running_shoes',
        label: 'کفش دویدن',
        backendProductType: 'shoes',
        required: ['footLength'],
        optional: ['footWidth', 'archType', 'runningStyle'],
        kidsRequired: ['age', 'footLength'],
        kidsOptional: [],
        neverAsk: ['chest', 'waist', 'hip'],
      },
      {
        id: 'boots',
        label: 'بوت',
        backendProductType: 'shoes',
        required: ['footLength', 'footWidth'],
        optional: ['calfCircumference'],
        kidsRequired: ['age', 'footLength'],
        kidsOptional: [],
        neverAsk: ['chest', 'waist', 'hip'],
      },
      {
        id: 'sandals',
        label: 'صندل',
        backendProductType: 'shoes',
        required: ['footLength'],
        optional: ['footWidth', 'fitPreference'],
        kidsRequired: ['age', 'footLength'],
        kidsOptional: [],
        neverAsk: ['chest', 'waist', 'hip'],
      },
      {
        id: 'slippers',
        label: 'دمپایی',
        backendProductType: 'shoes',
        required: ['footLength'],
        optional: ['footWidth'],
        kidsRequired: ['age', 'footLength'],
        kidsOptional: [],
        neverAsk: ['chest', 'waist', 'hip'],
      },
      {
        id: 'socks',
        label: 'جوراب',
        backendProductType: 'shoes',
        required: ['footLength'],
        optional: ['shoeSize'],
        kidsRequired: ['age', 'footLength'],
        kidsOptional: [],
        neverAsk: ['chest', 'waist', 'hip'],
      },
    ],
  },
  {
    id: 'underwear',
    label: 'لباس زیر',
    icon: 'Shirt',
    categories: [
      {
        id: 'underwear',
        label: 'لباس زیر',
        backendProductType: 'underwear',
        required: ['waist', 'hip'],
        optional: ['height', 'weight'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: [],
      },
      {
        id: 'bra',
        label: 'سوتین',
        backendProductType: 'underwear',
        required: ['bust', 'underBust'],
        optional: ['height'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: [],
      },
      {
        id: 'boxer',
        label: 'باکسر',
        backendProductType: 'underwear',
        required: ['waist', 'hip'],
        optional: ['height', 'weight'],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: [],
      },
    ],
  },
  {
    id: 'accessories',
    label: 'اکسسواری',
    icon: 'Watch',
    categories: [
      {
        id: 'belt',
        label: 'کمربند',
        backendProductType: 'accessories',
        required: ['waistCircumference'],
        optional: [],
        kidsRequired: ['age', 'waistCircumference'],
        kidsOptional: [],
      },
      {
        id: 'hat',
        label: 'کلاه',
        backendProductType: 'accessories',
        required: ['headCircumference'],
        optional: [],
        kidsRequired: ['age', 'headCircumference'],
        kidsOptional: [],
      },
      {
        id: 'cap',
        label: 'کپ',
        backendProductType: 'accessories',
        required: ['headCircumference'],
        optional: [],
        kidsRequired: ['age', 'headCircumference'],
        kidsOptional: [],
      },
      {
        id: 'gloves',
        label: 'دستکش',
        backendProductType: 'accessories',
        required: ['handLength', 'palmCircumference'],
        optional: [],
        kidsRequired: ['age', 'handLength'],
        kidsOptional: ['palmCircumference'],
      },
      {
        id: 'backpack',
        label: 'کوله‌پشتی',
        backendProductType: 'accessories',
        required: ['height', 'weight'],
        optional: [],
        kidsRequired: ['age', 'height', 'weight'],
        kidsOptional: [],
      },
    ],
  },
]

/* ── Helpers ──────────────────────────────────────────────────── */

export function getMeasurement(key) {
  return MEASUREMENTS[key] || null
}

export function getCategoryConfig(categoryId) {
  for (const group of CATEGORY_GROUPS) {
    const cat = group.categories.find((c) => c.id === categoryId)
    if (cat) return cat
  }
  return null
}

export function getRequiredFields(categoryId, isKids) {
  const cat = getCategoryConfig(categoryId)
  if (!cat) return []
  const keys = isKids ? cat.kidsRequired : cat.required
  return keys.map((k) => MEASUREMENTS[k]).filter(Boolean)
}

export function getOptionalFields(categoryId, isKids) {
  const cat = getCategoryConfig(categoryId)
  if (!cat) return []
  const keys = isKids ? cat.kidsOptional : cat.optional
  return keys.map((k) => MEASUREMENTS[k]).filter(Boolean)
}

export function validateMeasurement(key, value) {
  const m = MEASUREMENTS[key]
  if (!m) return null
  if (m.unit === 'select') return null
  const num = parseFloat(value)
  if (isNaN(num)) return `${m.label} را وارد کنید.`
  if (num < m.min) return `${m.label} نمی‌تواند کمتر از ${m.min} ${m.unit} باشد.`
  if (num > m.max) return `${m.label} نمی‌تواند بیشتر از ${m.max} ${m.unit} باشد.`
  return null
}

export function getKidsAgeGroup(age) {
  const n = Number(age)
  if (isNaN(n) || n < 0) return null
  if (n < 2) return KIDS_AGE_GROUPS.baby
  if (n < 6) return KIDS_AGE_GROUPS.toddler
  if (n < 13) return KIDS_AGE_GROUPS.child
  return KIDS_AGE_GROUPS.teen
}

export { MEASUREMENTS, KIDS_AGE_GROUPS, CATEGORY_GROUPS }
