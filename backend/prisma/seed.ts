import * as bcrypt from 'bcrypt';
import {
  Locale,
  PrismaClient,
  PurchaseMode,
  Role,
  UserStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function seedUsers() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@mdiscover.ma';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      email,
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      locale: Locale.FR,
      individualProfile: {
        create: { firstName: 'Admin', lastName: 'Mdiscover' },
      },
    },
  });

  const devEmail = process.env.SEED_DEV_EMAIL ?? 'dev@mdiscover.ma';
  const devPassword = process.env.SEED_DEV_PASSWORD ?? 'Dev12345!';
  const devHash = await bcrypt.hash(devPassword, 12);

  const developer = await prisma.user.upsert({
    where: { email: devEmail },
    update: {
      passwordHash: devHash,
      role: Role.DEVELOPER,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: devEmail,
      passwordHash: devHash,
      role: Role.DEVELOPER,
      status: UserStatus.ACTIVE,
      locale: Locale.FR,
      individualProfile: {
        create: { firstName: 'Dev', lastName: 'Mdiscover' },
      },
    },
  });

  const clientHash = await bcrypt.hash('Client123!', 12);
  const client = await prisma.user.upsert({
    where: { email: 'client1@test.ma' },
    update: { passwordHash: clientHash, status: UserStatus.ACTIVE },
    create: {
      email: 'client1@test.ma',
      passwordHash: clientHash,
      role: Role.CUSTOMER_INDIVIDUAL,
      status: UserStatus.ACTIVE,
      locale: Locale.FR,
      phone: '+212600000001',
      individualProfile: {
        create: { firstName: 'Sara', lastName: 'Benali' },
      },
      addresses: {
        create: {
          type: 'SHIPPING',
          line1: '12 Rue Atlas',
          city: 'Casablanca',
          region: 'Casablanca-Settat',
          country: 'MA',
          isDefault: true,
        },
      },
    },
  });

  const proHash = await bcrypt.hash('Pro12345!', 12);
  const pro = await prisma.user.upsert({
    where: { email: 'pro@mdiscover.ma' },
    update: {
      passwordHash: proHash,
      role: Role.CUSTOMER_PRO,
      status: UserStatus.ACTIVE,
      phone: '+212661000200',
    },
    create: {
      email: 'pro@mdiscover.ma',
      passwordHash: proHash,
      role: Role.CUSTOMER_PRO,
      status: UserStatus.ACTIVE,
      locale: Locale.FR,
      phone: '+212661000200',
      professionalProfile: {
        create: {
          companyName: 'Atlas Food Trading',
          contactPerson: 'Karim El Idrissi',
          sector: 'Distribution alimentaire',
          taxId: 'IF-40192831',
          ice: '001845678000031',
          tradeRegister: 'RC-145892-Casa',
          billingAddress:
            'Zone Industrielle Ain Sebaa, Lot 24, 20250 Casablanca',
          validationStatus: 'APPROVED',
          validatedAt: new Date(),
        },
      },
      addresses: {
        create: [
          {
            type: 'SHIPPING',
            label: 'Entrepôt Ain Sebaa',
            line1: 'Zone Industrielle Ain Sebaa, Lot 24',
            city: 'Casablanca',
            region: 'Casablanca-Settat',
            postalCode: '20250',
            country: 'MA',
            phone: '+212661000200',
            isDefault: true,
          },
          {
            type: 'BILLING',
            label: 'Siège',
            line1: 'Angle Bd Zerktouni et Rue Ibnou Sina',
            city: 'Casablanca',
            region: 'Casablanca-Settat',
            postalCode: '20000',
            country: 'MA',
            phone: '+212522000200',
            isDefault: false,
          },
        ],
      },
    },
  });

  const existingPro = await prisma.professionalProfile.findUnique({
    where: { userId: pro.id },
  });
  if (existingPro) {
    await prisma.professionalProfile.update({
      where: { userId: pro.id },
      data: {
        companyName: 'Atlas Food Trading',
        contactPerson: 'Karim El Idrissi',
        sector: 'Distribution alimentaire',
        taxId: 'IF-40192831',
        ice: '001845678000031',
        tradeRegister: 'RC-145892-Casa',
        billingAddress:
          'Zone Industrielle Ain Sebaa, Lot 24, 20250 Casablanca',
        validationStatus: 'APPROVED',
        validatedAt: new Date(),
        rejectionReason: null,
      },
    });
  } else {
    await prisma.professionalProfile.create({
      data: {
        userId: pro.id,
        companyName: 'Atlas Food Trading',
        contactPerson: 'Karim El Idrissi',
        sector: 'Distribution alimentaire',
        taxId: 'IF-40192831',
        ice: '001845678000031',
        tradeRegister: 'RC-145892-Casa',
        billingAddress:
          'Zone Industrielle Ain Sebaa, Lot 24, 20250 Casablanca',
        validationStatus: 'APPROVED',
        validatedAt: new Date(),
      },
    });
  }

  console.log('Users:', admin.email, developer.email, client.email, pro.email);
}

async function upsertCategory(data: {
  slugFr: string;
  slugEn: string;
  nameFr: string;
  nameEn: string;
  sortOrder: number;
  parentId?: string | null;
  descriptionFr?: string;
  descriptionEn?: string;
  imageUrl?: string;
  imageAltFr?: string;
  imageAltEn?: string;
  seoTitleFr?: string;
  seoTitleEn?: string;
}) {
  const existing = await prisma.category.findFirst({
    where: {
      OR: [{ slugFr: data.slugFr }, { slugEn: data.slugEn }],
    },
  });

  const payload = {
    slugFr: data.slugFr,
    slugEn: data.slugEn,
    nameFr: data.nameFr,
    nameEn: data.nameEn,
    sortOrder: data.sortOrder,
    parentId: data.parentId ?? null,
    descriptionFr: data.descriptionFr,
    descriptionEn: data.descriptionEn,
    imageUrl: data.imageUrl,
    imageAltFr: data.imageAltFr,
    imageAltEn: data.imageAltEn,
    isActive: true,
    seoTitleFr: data.seoTitleFr,
    seoTitleEn: data.seoTitleEn,
  };

  if (existing) {
    return prisma.category.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  return prisma.category.create({
    data: payload,
  });
}

async function upsertBrand(data: {
  slugFr: string;
  slugEn: string;
  name: string;
  descriptionFr: string;
  descriptionEn: string;
}) {
  const existing = await prisma.brand.findFirst({
    where: {
      OR: [{ slugFr: data.slugFr }, { slugEn: data.slugEn }],
    },
  });

  if (existing) {
    return prisma.brand.update({
      where: { id: existing.id },
      data: { ...data, isActive: true },
    });
  }

  return prisma.brand.create({
    data: { ...data, isActive: true },
  });
}

async function seedCatalog() {
  const catEpices = await upsertCategory({
    slugFr: 'epices',
    slugEn: 'spices',
    nameFr: 'Épices',
    nameEn: 'Spices',
    sortOrder: 1,
    descriptionFr:
      'Épices sélectionnées pour leur pureté, leur arôme et leur authenticité, issues de sources fiables aux normes de qualité les plus exigeantes.',
    descriptionEn:
      'Premium spices selected for purity, rich aroma and authentic flavor from trusted origins.',
    imageUrl:
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80',
    imageAltFr: 'Sélection d’épices colorées',
    imageAltEn: 'Colorful spice selection',
    seoTitleFr: 'Épices — Mdiscover Impex',
    seoTitleEn: 'Spices — Mdiscover Impex',
  });

  const catFruitsSecs = await upsertCategory({
    slugFr: 'fruits-secs',
    slugEn: 'dried-fruits',
    nameFr: 'Fruits secs',
    nameEn: 'Dried fruits',
    sortOrder: 2,
    descriptionFr:
      'Fruits secs premium choisis pour leur qualité naturelle, leur goût riche et leur fraîcheur, provenant d’origines de confiance.',
    descriptionEn:
      'Premium dried fruits selected for natural quality, rich taste and freshness.',
    imageUrl:
      'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=900&q=80',
    imageAltFr: 'Assortiment de fruits secs',
    imageAltEn: 'Assortment of dried fruits',
    seoTitleFr: 'Fruits secs — Mdiscover Impex',
    seoTitleEn: 'Dried fruits — Mdiscover Impex',
  });

  const catLegumineuses = await upsertCategory({
    slugFr: 'legumineuses',
    slugEn: 'pulses',
    nameFr: 'Légumineuses',
    nameEn: 'Pulses',
    sortOrder: 3,
    descriptionFr:
      'Légumineuses de qualité, sélectionnées pour leur nutrition et leur authenticité, auprès de producteurs fiables aux standards internationaux.',
    descriptionEn:
      'Premium pulses selected for quality, nutrition and authenticity.',
    imageUrl:
      'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=900&q=80',
    imageAltFr: 'Légumineuses et pois secs',
    imageAltEn: 'Pulses and dried beans',
    seoTitleFr: 'Légumineuses — Mdiscover Impex',
    seoTitleEn: 'Pulses — Mdiscover Impex',
  });

  const catHuiles = await upsertCategory({
    slugFr: 'huiles-alimentaires',
    slugEn: 'edible-oils',
    nameFr: 'Huiles alimentaires',
    nameEn: 'Edible oils',
    sortOrder: 4,
    descriptionFr:
      'Huiles alimentaires soigneusement sélectionnées pour leur pureté et leur usage professionnel, entre Maroc et marchés internationaux.',
    descriptionEn:
      'Edible oils carefully selected for purity and professional use.',
    imageUrl:
      'https://images.unsplash.com/photo-1474979266404-7ea403ecd42a?auto=format&fit=crop&w=900&q=80',
    imageAltFr: 'Huiles alimentaires',
    imageAltEn: 'Edible oils',
    seoTitleFr: 'Huiles alimentaires — Mdiscover Impex',
    seoTitleEn: 'Edible oils — Mdiscover Impex',
  });

  const catPates = await upsertCategory({
    slugFr: 'pates',
    slugEn: 'pasta',
    nameFr: 'Pâtes',
    nameEn: 'Pasta',
    sortOrder: 5,
    descriptionFr:
      'Pâtes de qualité professionnelle pour la distribution et la restauration.',
    descriptionEn:
      'Professional-grade pasta for distribution and foodservice.',
    imageUrl:
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80',
    imageAltFr: 'Pâtes sèches premium',
    imageAltEn: 'Premium dry pasta',
    seoTitleFr: 'Pâtes — Mdiscover Impex',
    seoTitleEn: 'Pasta — Mdiscover Impex',
  });

  const catFruitsLegumes = await upsertCategory({
    slugFr: 'fruits-legumes',
    slugEn: 'fruits-vegetables',
    nameFr: 'Fruits & légumes',
    nameEn: 'Fruits & vegetables',
    sortOrder: 6,
    descriptionFr:
      'Fruits et légumes sélectionnés pour leur fraîcheur, leur pureté naturelle et leur goût, issus d’origines de confiance.',
    descriptionEn:
      'Fruits and vegetables selected for freshness, natural purity and refined taste.',
    imageUrl:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
    imageAltFr: 'Fruits et légumes frais',
    imageAltEn: 'Fresh fruits and vegetables',
    seoTitleFr: 'Fruits & légumes — Mdiscover Impex',
    seoTitleEn: 'Fruits & vegetables — Mdiscover Impex',
  });

  const catCereales = await upsertCategory({
    slugFr: 'cereales-riz-pates',
    slugEn: 'cereals-rice-pasta',
    nameFr: 'Céréales',
    nameEn: 'Cereals',
    sortOrder: 7,
    descriptionFr:
      'Céréales de qualité supérieure, texture soignée et goût authentique, auprès de producteurs de confiance.',
    descriptionEn:
      'Premium cereals with refined texture and authentic taste.',
    imageUrl:
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80',
    imageAltFr: 'Céréales et grains',
    imageAltEn: 'Cereals and grains',
    seoTitleFr: 'Céréales — Mdiscover Impex',
    seoTitleEn: 'Cereals — Mdiscover Impex',
  });

  const catHygiene = await upsertCategory({
    slugFr: 'hygiene',
    slugEn: 'hygiene',
    nameFr: 'Hygiène',
    nameEn: 'Hygiene',
    sortOrder: 8,
    descriptionFr:
      'Gammes d’hygiène et d’entretien pour professionnels et distribution, avec un sourcing fiable et des formats adaptés au B2B.',
    descriptionEn:
      'Hygiene ranges for professionals and distribution, with reliable sourcing and B2B formats.',
    imageUrl:
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80',
    imageAltFr: 'Produits d’hygiène',
    imageAltEn: 'Hygiene products',
    seoTitleFr: "Produits d'hygiène — Mdiscover Impex",
    seoTitleEn: 'Hygiene products — Mdiscover Impex',
  });

  const catCleaning = await upsertCategory({
    slugFr: 'nettoyage',
    slugEn: 'cleaning',
    nameFr: 'Nettoyage',
    nameEn: 'Cleaning',
    sortOrder: 1,
    parentId: catHygiene.id,
  });

  // Keep legacy slugs pointing at closest match so old URLs / data stay usable
  await upsertCategory({
    slugFr: 'alimentaire',
    slugEn: 'food',
    nameFr: 'Alimentaire',
    nameEn: 'Food',
    sortOrder: 99,
    parentId: catCereales.id,
  });
  await upsertCategory({
    slugFr: 'huiles-epices',
    slugEn: 'oils-spices',
    nameFr: 'Huiles & épices',
    nameEn: 'Oils & spices',
    sortOrder: 99,
    parentId: catHuiles.id,
  });

  const brandAtlas = await upsertBrand({
    slugFr: 'atlas-nature',
    slugEn: 'atlas-nature',
    name: 'Atlas Nature',
    descriptionFr: 'Produits naturels du Maroc.',
    descriptionEn: 'Natural products from Morocco.',
  });

  const brandCasa = await upsertBrand({
    slugFr: 'casa-clean',
    slugEn: 'casa-clean',
    name: 'Casa Clean',
    descriptionFr: 'Hygiène et entretien du quotidien.',
    descriptionEn: 'Everyday hygiene and cleaning.',
  });

  const brandOasis = await upsertBrand({
    slugFr: 'oasis-gourmet',
    slugEn: 'oasis-gourmet',
    name: 'Oasis Gourmet',
    descriptionFr: 'Épicerie fine et import alimentaire.',
    descriptionEn: 'Fine grocery and food import.',
  });

  type SeedProduct = {
    sku: string;
    slugFr: string;
    slugEn: string;
    nameFr: string;
    nameEn: string;
    descriptionFr: string;
    descriptionEn: string;
    categoryId: string;
    brandId: string;
    price: number;
    promoPrice?: number;
    purchaseMode?: PurchaseMode;
    hybridThresholdQty?: number;
    weightKg?: number;
    volumeMl?: number;
    packaging: string;
    unitsPerCarton?: number;
    originCountry: string;
    ingredients?: string;
    allergens?: string;
    storageConditions?: string;
    stockQty: number;
    isFeatured?: boolean;
    imageUrl: string;
    keywords: string[];
  };

  const img = {
    spices: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
    paprika: 'https://images.unsplash.com/photo-1506368249639-73a05d4d3046?auto=format&fit=crop&w=800&q=80',
    tea: 'https://images.unsplash.com/photo-1564890367536-56c32cfa4f1d?auto=format&fit=crop&w=800&q=80',
    dates: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=800&q=80',
    honey: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
    nuts: 'https://images.unsplash.com/photo-1599599810769-bec8f414d53a?auto=format&fit=crop&w=800&q=80',
    pulses: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=800&q=80',
    oil: 'https://images.unsplash.com/photo-1474979266404-7ea403ecd42a?auto=format&fit=crop&w=800&q=80',
    olive: 'https://images.unsplash.com/photo-1474979410270-0b188574c9d9?auto=format&fit=crop&w=800&q=80',
    pasta: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&q=80',
    produce: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    grains: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    soap: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
    soap2: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=800&q=80',
    clay: 'https://images.unsplash.com/photo-1570194065650-d99fb26b18d7?auto=format&fit=crop&w=800&q=80',
    shampoo: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80',
    shower: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
    dish: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&q=80',
    cleaner: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=80',
    paper: 'https://images.unsplash.com/photo-1584556812955-ac9d5e3c2f8f?auto=format&fit=crop&w=800&q=80',
  };

  const products: SeedProduct[] = [
    // ——— Épices ———
    {
      sku: 'EPI-CUM-100',
      slugFr: 'cumin-moulu-100g',
      slugEn: 'ground-cumin-100g',
      nameFr: 'Cumin moulu 100g',
      nameEn: 'Ground cumin 100g',
      descriptionFr: 'Épice incontournable de la cuisine marocaine, format pro.',
      descriptionEn: 'Essential Moroccan spice, professional format.',
      categoryId: catEpices.id,
      brandId: brandOasis.id,
      price: 14.5,
      promoPrice: 11.9,
      weightKg: 0.1,
      packaging: 'Sachet 100g',
      unitsPerCarton: 50,
      originCountry: 'MA',
      ingredients: 'Cumin',
      stockQty: 300,
      isFeatured: true,
      imageUrl: img.spices,
      keywords: ['epice', 'cumin', 'alimentaire'],
    },
    {
      sku: 'EPI-PAP-100',
      slugFr: 'paprika-doux-100g',
      slugEn: 'sweet-paprika-100g',
      nameFr: 'Paprika doux 100g',
      nameEn: 'Sweet paprika 100g',
      descriptionFr: 'Paprika doux pour tajines et marinades.',
      descriptionEn: 'Sweet paprika for tagines and marinades.',
      categoryId: catEpices.id,
      brandId: brandOasis.id,
      price: 12.9,
      promoPrice: 9.9,
      weightKg: 0.1,
      packaging: 'Sachet 100g',
      unitsPerCarton: 50,
      originCountry: 'ES',
      ingredients: 'Paprika',
      stockQty: 220,
      imageUrl: img.paprika,
      keywords: ['paprika', 'epice'],
    },
    {
      sku: 'EPI-CUR-100',
      slugFr: 'curcuma-moulu-100g',
      slugEn: 'ground-turmeric-100g',
      nameFr: 'Curcuma moulu 100g',
      nameEn: 'Ground turmeric 100g',
      descriptionFr: 'Curcuma intensément coloré pour cuisine et boissons.',
      descriptionEn: 'Intensely colored turmeric for cooking and drinks.',
      categoryId: catEpices.id,
      brandId: brandOasis.id,
      price: 13.5,
      weightKg: 0.1,
      packaging: 'Sachet 100g',
      unitsPerCarton: 50,
      originCountry: 'IN',
      ingredients: 'Curcuma',
      stockQty: 260,
      imageUrl: img.spices,
      keywords: ['curcuma', 'epice'],
    },
    {
      sku: 'EPI-POI-100',
      slugFr: 'poivre-noir-moulu-100g',
      slugEn: 'ground-black-pepper-100g',
      nameFr: 'Poivre noir moulu 100g',
      nameEn: 'Ground black pepper 100g',
      descriptionFr: 'Poivre noir moulu, arôme puissant pour restauration.',
      descriptionEn: 'Ground black pepper with strong aroma for foodservice.',
      categoryId: catEpices.id,
      brandId: brandOasis.id,
      price: 18.9,
      promoPrice: 15.5,
      weightKg: 0.1,
      packaging: 'Sachet 100g',
      unitsPerCarton: 40,
      originCountry: 'VN',
      ingredients: 'Poivre noir',
      stockQty: 190,
      imageUrl: img.spices,
      keywords: ['poivre', 'epice'],
    },
    {
      sku: 'EPI-RAS-200',
      slugFr: 'ras-el-hanout-200g',
      slugEn: 'ras-el-hanout-200g',
      nameFr: 'Ras el hanout 200g',
      nameEn: 'Ras el hanout 200g',
      descriptionFr: 'Mélange d’épices traditionnel pour tajines et couscous.',
      descriptionEn: 'Traditional spice blend for tagines and couscous.',
      categoryId: catEpices.id,
      brandId: brandAtlas.id,
      price: 29.9,
      weightKg: 0.2,
      packaging: 'Boîte 200g',
      unitsPerCarton: 24,
      originCountry: 'MA',
      ingredients: 'Mélange d’épices',
      stockQty: 140,
      isFeatured: true,
      imageUrl: img.paprika,
      keywords: ['ras el hanout', 'epice', 'maroc'],
    },
    {
      sku: 'THE-MENT-200',
      slugFr: 'the-menthe-gunpowder-200g',
      slugEn: 'gunpowder-mint-tea-200g',
      nameFr: 'Thé vert gunpowder + menthe 200g',
      nameEn: 'Gunpowder green tea + mint 200g',
      descriptionFr: 'Kit thé à la menthe : gunpowder et menthe séchée.',
      descriptionEn: 'Mint tea kit: gunpowder and dried mint.',
      categoryId: catEpices.id,
      brandId: brandOasis.id,
      price: 34,
      promoPrice: 28.5,
      weightKg: 0.2,
      packaging: 'Boîte 200g',
      originCountry: 'CN',
      ingredients: 'Thé vert, menthe',
      stockQty: 160,
      isFeatured: true,
      imageUrl: img.tea,
      keywords: ['the', 'menthe', 'alimentaire'],
    },

    // ——— Fruits secs ———
    {
      sku: 'DAT-MED-500',
      slugFr: 'dattes-medjool-500g',
      slugEn: 'medjool-dates-500g',
      nameFr: 'Dattes Medjool 500g',
      nameEn: 'Medjool dates 500g',
      descriptionFr: 'Dattes charnues, idéales pour le Ramadan et le snacking.',
      descriptionEn: 'Plump dates, ideal for Ramadan and snacking.',
      categoryId: catFruitsSecs.id,
      brandId: brandOasis.id,
      price: 55,
      promoPrice: 46,
      weightKg: 0.5,
      packaging: 'Barquette 500g',
      unitsPerCarton: 12,
      originCountry: 'MA',
      ingredients: 'Dattes Medjool',
      allergens: 'Peut contenir des fruits à coque',
      stockQty: 90,
      isFeatured: true,
      imageUrl: img.dates,
      keywords: ['dattes', 'medjool', 'alimentaire'],
    },
    {
      sku: 'DAT-DEG-1KG',
      slugFr: 'dattes-deglet-nour-1kg',
      slugEn: 'deglet-nour-dates-1kg',
      nameFr: 'Dattes Deglet Nour 1kg',
      nameEn: 'Deglet Nour dates 1kg',
      descriptionFr: 'Dattes Deglet Nour semi-sec, format distribution.',
      descriptionEn: 'Semi-dry Deglet Nour dates, wholesale format.',
      categoryId: catFruitsSecs.id,
      brandId: brandOasis.id,
      price: 42,
      weightKg: 1,
      packaging: 'Sachet 1kg',
      unitsPerCarton: 10,
      originCountry: 'TN',
      ingredients: 'Dattes Deglet Nour',
      stockQty: 150,
      imageUrl: img.dates,
      keywords: ['dattes', 'deglet nour'],
    },
    {
      sku: 'AMA-NAT-500',
      slugFr: 'amandes-nature-500g',
      slugEn: 'natural-almonds-500g',
      nameFr: 'Amandes nature 500g',
      nameEn: 'Natural almonds 500g',
      descriptionFr: 'Amandes entières non salées, qualité snack et pâtisserie.',
      descriptionEn: 'Whole unsalted almonds for snacking and pastry.',
      categoryId: catFruitsSecs.id,
      brandId: brandAtlas.id,
      price: 68,
      promoPrice: 59,
      weightKg: 0.5,
      packaging: 'Sachet 500g',
      unitsPerCarton: 12,
      originCountry: 'MA',
      ingredients: 'Amandes',
      allergens: 'Fruits à coque',
      stockQty: 110,
      imageUrl: img.nuts,
      keywords: ['amandes', 'fruits secs'],
    },
    {
      sku: 'FIG-SEC-400',
      slugFr: 'figues-sechees-400g',
      slugEn: 'dried-figs-400g',
      nameFr: 'Figues séchées 400g',
      nameEn: 'Dried figs 400g',
      descriptionFr: 'Figues séchées moelleuses, origine Méditerranée.',
      descriptionEn: 'Soft dried figs from the Mediterranean.',
      categoryId: catFruitsSecs.id,
      brandId: brandOasis.id,
      price: 38.5,
      weightKg: 0.4,
      packaging: 'Sachet 400g',
      unitsPerCarton: 16,
      originCountry: 'TR',
      ingredients: 'Figues séchées',
      stockQty: 95,
      imageUrl: img.dates,
      keywords: ['figues', 'fruits secs'],
    },
    {
      sku: 'ABR-SEC-400',
      slugFr: 'abricots-secs-400g',
      slugEn: 'dried-apricots-400g',
      nameFr: 'Abricots secs 400g',
      nameEn: 'Dried apricots 400g',
      descriptionFr: 'Abricots secs non sulfité, goût fruité intense.',
      descriptionEn: 'Unsulphured dried apricots with intense fruit flavor.',
      categoryId: catFruitsSecs.id,
      brandId: brandOasis.id,
      price: 36,
      promoPrice: 31,
      weightKg: 0.4,
      packaging: 'Sachet 400g',
      unitsPerCarton: 16,
      originCountry: 'TR',
      ingredients: 'Abricots secs',
      stockQty: 100,
      imageUrl: img.dates,
      keywords: ['abricots', 'fruits secs'],
    },
    {
      sku: 'MIEL-THY-250',
      slugFr: 'miel-thym-250g',
      slugEn: 'thyme-honey-250g',
      nameFr: 'Miel de thym 250g',
      nameEn: 'Thyme honey 250g',
      descriptionFr: 'Miel artisanal au goût floral et herbacé.',
      descriptionEn: 'Artisanal honey with floral herbal notes.',
      categoryId: catFruitsSecs.id,
      brandId: brandAtlas.id,
      price: 62,
      weightKg: 0.25,
      packaging: 'Pot 250g',
      unitsPerCarton: 24,
      originCountry: 'MA',
      ingredients: 'Miel de thym',
      stockQty: 70,
      isFeatured: true,
      imageUrl: img.honey,
      keywords: ['miel', 'thym', 'alimentaire'],
    },

    // ——— Légumineuses ———
    {
      sku: 'LEG-LEN-1KG',
      slugFr: 'lentilles-vertes-1kg',
      slugEn: 'green-lentils-1kg',
      nameFr: 'Lentilles vertes 1kg',
      nameEn: 'Green lentils 1kg',
      descriptionFr: 'Lentilles vertes calibrées pour restauration et distribution.',
      descriptionEn: 'Sorted green lentils for foodservice and wholesale.',
      categoryId: catLegumineuses.id,
      brandId: brandOasis.id,
      price: 22,
      promoPrice: 18.5,
      weightKg: 1,
      packaging: 'Sachet 1kg',
      unitsPerCarton: 10,
      originCountry: 'CA',
      ingredients: 'Lentilles vertes',
      stockQty: 280,
      isFeatured: true,
      imageUrl: img.pulses,
      keywords: ['lentilles', 'legumineuses'],
    },
    {
      sku: 'LEG-POI-1KG',
      slugFr: 'pois-chiches-1kg',
      slugEn: 'chickpeas-1kg',
      nameFr: 'Pois chiches 1kg',
      nameEn: 'Chickpeas 1kg',
      descriptionFr: 'Pois chiches secs, cuisson homogène pour houmous et tajines.',
      descriptionEn: 'Dried chickpeas with even cooking for hummus and tagines.',
      categoryId: catLegumineuses.id,
      brandId: brandOasis.id,
      price: 19.5,
      weightKg: 1,
      packaging: 'Sachet 1kg',
      unitsPerCarton: 10,
      originCountry: 'TR',
      ingredients: 'Pois chiches',
      stockQty: 260,
      imageUrl: img.pulses,
      keywords: ['pois chiches', 'legumineuses'],
    },
    {
      sku: 'LEG-HAR-1KG',
      slugFr: 'haricots-blancs-1kg',
      slugEn: 'white-beans-1kg',
      nameFr: 'Haricots blancs 1kg',
      nameEn: 'White beans 1kg',
      descriptionFr: 'Haricots blancs secs pour plats mijotés et conserves.',
      descriptionEn: 'Dried white beans for stews and canning.',
      categoryId: catLegumineuses.id,
      brandId: brandOasis.id,
      price: 21,
      promoPrice: 17.9,
      weightKg: 1,
      packaging: 'Sachet 1kg',
      unitsPerCarton: 10,
      originCountry: 'AR',
      ingredients: 'Haricots blancs',
      stockQty: 200,
      imageUrl: img.pulses,
      keywords: ['haricots', 'legumineuses'],
    },
    {
      sku: 'LEG-FEV-1KG',
      slugFr: 'feves-seches-1kg',
      slugEn: 'dried-fava-beans-1kg',
      nameFr: 'Fèves sèches 1kg',
      nameEn: 'Dried fava beans 1kg',
      descriptionFr: 'Fèves sèches décortiquées, usage traditionnel marocain.',
      descriptionEn: 'Shelled dried fava beans for traditional Moroccan dishes.',
      categoryId: catLegumineuses.id,
      brandId: brandAtlas.id,
      price: 24,
      weightKg: 1,
      packaging: 'Sachet 1kg',
      unitsPerCarton: 10,
      originCountry: 'MA',
      ingredients: 'Fèves',
      stockQty: 170,
      imageUrl: img.pulses,
      keywords: ['feves', 'legumineuses'],
    },
    {
      sku: 'LEG-POI-V-1KG',
      slugFr: 'pois-casses-1kg',
      slugEn: 'split-peas-1kg',
      nameFr: 'Pois cassés 1kg',
      nameEn: 'Split peas 1kg',
      descriptionFr: 'Pois cassés jaunes pour soupes et purées professionnelles.',
      descriptionEn: 'Yellow split peas for professional soups and purées.',
      categoryId: catLegumineuses.id,
      brandId: brandOasis.id,
      price: 17.5,
      weightKg: 1,
      packaging: 'Sachet 1kg',
      unitsPerCarton: 10,
      originCountry: 'CA',
      ingredients: 'Pois cassés',
      stockQty: 180,
      imageUrl: img.pulses,
      keywords: ['pois casses', 'legumineuses'],
    },

    // ——— Huiles ———
    {
      sku: 'HUI-ARG-50',
      slugFr: 'huile-argan-alimentaire-50ml',
      slugEn: 'edible-argan-oil-50ml',
      nameFr: 'Huile d’argan alimentaire 50ml',
      nameEn: 'Edible argan oil 50ml',
      descriptionFr: 'Huile d’argan torréfiée pour assaisonnement.',
      descriptionEn: 'Roasted argan oil for seasoning.',
      categoryId: catHuiles.id,
      brandId: brandOasis.id,
      price: 79,
      promoPrice: 69,
      volumeMl: 50,
      weightKg: 0.12,
      packaging: 'Flacon verre 50ml',
      unitsPerCarton: 24,
      originCountry: 'MA',
      ingredients: 'Huile d’argan 100%',
      allergens: 'Fruits à coque (argan)',
      storageConditions: 'Au frais, à l’abri de la lumière',
      stockQty: 95,
      isFeatured: true,
      imageUrl: img.oil,
      keywords: ['argan', 'huile', 'alimentaire'],
    },
    {
      sku: 'HUI-OLV-1L',
      slugFr: 'huile-olive-vierge-1l',
      slugEn: 'virgin-olive-oil-1l',
      nameFr: 'Huile d’olive vierge 1L',
      nameEn: 'Virgin olive oil 1L',
      descriptionFr: 'Première pression à froid, goût fruité.',
      descriptionEn: 'Cold first press, fruity taste.',
      categoryId: catHuiles.id,
      brandId: brandOasis.id,
      price: 68,
      promoPrice: 59,
      volumeMl: 1000,
      weightKg: 0.95,
      packaging: 'Bouteille 1L',
      unitsPerCarton: 6,
      originCountry: 'MA',
      ingredients: 'Huile d’olive vierge',
      stockQty: 120,
      isFeatured: true,
      imageUrl: img.olive,
      keywords: ['olive', 'huile', 'cuisine'],
    },
    {
      sku: 'HUI-OLV-5L',
      slugFr: 'huile-olive-vierge-5l',
      slugEn: 'virgin-olive-oil-5l',
      nameFr: 'Huile d’olive vierge 5L',
      nameEn: 'Virgin olive oil 5L',
      descriptionFr: 'Format restauration / distribution. Devis au-delà de 20 bidons.',
      descriptionEn: 'Foodservice / wholesale format. Quote beyond 20 cans.',
      categoryId: catHuiles.id,
      brandId: brandOasis.id,
      price: 295,
      purchaseMode: PurchaseMode.HYBRID,
      hybridThresholdQty: 20,
      volumeMl: 5000,
      weightKg: 4.7,
      packaging: 'Bidon 5L',
      unitsPerCarton: 4,
      originCountry: 'MA',
      ingredients: 'Huile d’olive vierge',
      stockQty: 60,
      imageUrl: img.olive,
      keywords: ['olive', 'huile', 'pro', '5l'],
    },
    {
      sku: 'HUI-TOU-1L',
      slugFr: 'huile-tournesol-1l',
      slugEn: 'sunflower-oil-1l',
      nameFr: 'Huile de tournesol 1L',
      nameEn: 'Sunflower oil 1L',
      descriptionFr: 'Huile de tournesol raffinée pour friture et cuisine.',
      descriptionEn: 'Refined sunflower oil for frying and cooking.',
      categoryId: catHuiles.id,
      brandId: brandOasis.id,
      price: 24.5,
      promoPrice: 21,
      volumeMl: 1000,
      weightKg: 0.92,
      packaging: 'Bouteille 1L',
      unitsPerCarton: 12,
      originCountry: 'UA',
      ingredients: 'Huile de tournesol',
      stockQty: 300,
      imageUrl: img.oil,
      keywords: ['tournesol', 'huile'],
    },
    {
      sku: 'HUI-SES-250',
      slugFr: 'huile-sesame-250ml',
      slugEn: 'sesame-oil-250ml',
      nameFr: 'Huile de sésame 250ml',
      nameEn: 'Sesame oil 250ml',
      descriptionFr: 'Huile de sésame torréfiée pour assaisonnement asiatique.',
      descriptionEn: 'Toasted sesame oil for Asian seasoning.',
      categoryId: catHuiles.id,
      brandId: brandOasis.id,
      price: 45,
      volumeMl: 250,
      weightKg: 0.28,
      packaging: 'Flacon 250ml',
      unitsPerCarton: 24,
      originCountry: 'CN',
      ingredients: 'Huile de sésame',
      allergens: 'Sésame',
      stockQty: 85,
      imageUrl: img.oil,
      keywords: ['sesame', 'huile'],
    },

    // ——— Pâtes ———
    {
      sku: 'PAT-SPA-500',
      slugFr: 'spaghetti-500g',
      slugEn: 'spaghetti-500g',
      nameFr: 'Spaghetti 500g',
      nameEn: 'Spaghetti 500g',
      descriptionFr: 'Spaghetti de blé dur, cuisson al dente pour restauration.',
      descriptionEn: 'Durum wheat spaghetti, al dente cook for foodservice.',
      categoryId: catPates.id,
      brandId: brandOasis.id,
      price: 12.5,
      promoPrice: 9.9,
      weightKg: 0.5,
      packaging: 'Paquet 500g',
      unitsPerCarton: 24,
      originCountry: 'IT',
      ingredients: 'Semoule de blé dur',
      allergens: 'Gluten',
      stockQty: 400,
      isFeatured: true,
      imageUrl: img.pasta,
      keywords: ['spaghetti', 'pates'],
    },
    {
      sku: 'PAT-PEN-500',
      slugFr: 'penne-rigate-500g',
      slugEn: 'penne-rigate-500g',
      nameFr: 'Penne rigate 500g',
      nameEn: 'Penne rigate 500g',
      descriptionFr: 'Penne rigate pour sauces et plats mijotés.',
      descriptionEn: 'Penne rigate for sauces and simmered dishes.',
      categoryId: catPates.id,
      brandId: brandOasis.id,
      price: 12.5,
      weightKg: 0.5,
      packaging: 'Paquet 500g',
      unitsPerCarton: 24,
      originCountry: 'IT',
      ingredients: 'Semoule de blé dur',
      allergens: 'Gluten',
      stockQty: 360,
      imageUrl: img.pasta,
      keywords: ['penne', 'pates'],
    },
    {
      sku: 'PAT-FUS-500',
      slugFr: 'fusilli-500g',
      slugEn: 'fusilli-500g',
      nameFr: 'Fusilli 500g',
      nameEn: 'Fusilli 500g',
      descriptionFr: 'Fusilli spirales, idéales pour salades et buffets.',
      descriptionEn: 'Spiral fusilli, ideal for salads and buffets.',
      categoryId: catPates.id,
      brandId: brandOasis.id,
      price: 12.9,
      promoPrice: 10.5,
      weightKg: 0.5,
      packaging: 'Paquet 500g',
      unitsPerCarton: 24,
      originCountry: 'IT',
      ingredients: 'Semoule de blé dur',
      allergens: 'Gluten',
      stockQty: 340,
      imageUrl: img.pasta,
      keywords: ['fusilli', 'pates'],
    },
    {
      sku: 'PAT-COU-1KG',
      slugFr: 'couscous-moyen-1kg',
      slugEn: 'medium-couscous-1kg',
      nameFr: 'Couscous moyen 1kg',
      nameEn: 'Medium couscous 1kg',
      descriptionFr: 'Couscous moyen de blé dur, format familial et pro.',
      descriptionEn: 'Medium durum wheat couscous, family and pro format.',
      categoryId: catPates.id,
      brandId: brandAtlas.id,
      price: 16.9,
      weightKg: 1,
      packaging: 'Sachet 1kg',
      unitsPerCarton: 10,
      originCountry: 'MA',
      ingredients: 'Semoule de blé dur précuite',
      allergens: 'Gluten',
      stockQty: 220,
      imageUrl: img.grains,
      keywords: ['couscous', 'pates', 'semoule'],
    },
    {
      sku: 'PAT-LAS-500',
      slugFr: 'lasagnes-500g',
      slugEn: 'lasagna-sheets-500g',
      nameFr: 'Feuilles de lasagnes 500g',
      nameEn: 'Lasagna sheets 500g',
      descriptionFr: 'Feuilles de lasagnes sèches pour plats au four.',
      descriptionEn: 'Dry lasagna sheets for oven dishes.',
      categoryId: catPates.id,
      brandId: brandOasis.id,
      price: 18,
      weightKg: 0.5,
      packaging: 'Boîte 500g',
      unitsPerCarton: 12,
      originCountry: 'IT',
      ingredients: 'Semoule de blé dur',
      allergens: 'Gluten',
      stockQty: 130,
      imageUrl: img.pasta,
      keywords: ['lasagnes', 'pates'],
    },

    // ——— Fruits & légumes ———
    {
      sku: 'FL-TOM-PEL-400',
      slugFr: 'tomates-pelees-400g',
      slugEn: 'peeled-tomatoes-400g',
      nameFr: 'Tomates pelées 400g',
      nameEn: 'Peeled tomatoes 400g',
      descriptionFr: 'Tomates pelées en conserve, base sauces professionnelles.',
      descriptionEn: 'Canned peeled tomatoes, base for professional sauces.',
      categoryId: catFruitsLegumes.id,
      brandId: brandOasis.id,
      price: 9.5,
      promoPrice: 7.9,
      weightKg: 0.4,
      packaging: 'Boîte 400g',
      unitsPerCarton: 24,
      originCountry: 'IT',
      ingredients: 'Tomates, jus de tomate',
      stockQty: 450,
      isFeatured: true,
      imageUrl: img.produce,
      keywords: ['tomates', 'conserves', 'legumes'],
    },
    {
      sku: 'FL-OLI-V-500',
      slugFr: 'olives-vertes-denoyautees-500g',
      slugEn: 'pitted-green-olives-500g',
      nameFr: 'Olives vertes dénoyautées 500g',
      nameEn: 'Pitted green olives 500g',
      descriptionFr: 'Olives vertes dénoyautées en saumure, format HORECA.',
      descriptionEn: 'Pitted green olives in brine, HORECA format.',
      categoryId: catFruitsLegumes.id,
      brandId: brandAtlas.id,
      price: 28,
      weightKg: 0.5,
      packaging: 'Bocal 500g',
      unitsPerCarton: 12,
      originCountry: 'MA',
      ingredients: 'Olives vertes, eau, sel',
      stockQty: 160,
      imageUrl: img.produce,
      keywords: ['olives', 'legumes'],
    },
    {
      sku: 'FL-COR-400',
      slugFr: 'mais-doux-400g',
      slugEn: 'sweet-corn-400g',
      nameFr: 'Maïs doux 400g',
      nameEn: 'Sweet corn 400g',
      descriptionFr: 'Maïs doux en conserve pour salades et garnitures.',
      descriptionEn: 'Canned sweet corn for salads and sides.',
      categoryId: catFruitsLegumes.id,
      brandId: brandOasis.id,
      price: 11.5,
      promoPrice: 9.5,
      weightKg: 0.4,
      packaging: 'Boîte 400g',
      unitsPerCarton: 24,
      originCountry: 'HU',
      ingredients: 'Maïs doux, eau, sel',
      stockQty: 280,
      imageUrl: img.produce,
      keywords: ['mais', 'conserves'],
    },
    {
      sku: 'FL-POI-400',
      slugFr: 'petits-pois-400g',
      slugEn: 'garden-peas-400g',
      nameFr: 'Petits pois 400g',
      nameEn: 'Garden peas 400g',
      descriptionFr: 'Petits pois en conserve, calibre régulier.',
      descriptionEn: 'Canned garden peas, even size.',
      categoryId: catFruitsLegumes.id,
      brandId: brandOasis.id,
      price: 10.9,
      weightKg: 0.4,
      packaging: 'Boîte 400g',
      unitsPerCarton: 24,
      originCountry: 'FR',
      ingredients: 'Petits pois, eau, sel',
      stockQty: 240,
      imageUrl: img.produce,
      keywords: ['petits pois', 'conserves'],
    },
    {
      sku: 'FL-HAR-400',
      slugFr: 'haricots-verts-400g',
      slugEn: 'green-beans-400g',
      nameFr: 'Haricots verts 400g',
      nameEn: 'Green beans 400g',
      descriptionFr: 'Haricots verts extra-fins en conserve.',
      descriptionEn: 'Extra-fine canned green beans.',
      categoryId: catFruitsLegumes.id,
      brandId: brandOasis.id,
      price: 12,
      weightKg: 0.4,
      packaging: 'Boîte 400g',
      unitsPerCarton: 24,
      originCountry: 'FR',
      ingredients: 'Haricots verts, eau, sel',
      stockQty: 210,
      imageUrl: img.produce,
      keywords: ['haricots verts', 'conserves'],
    },

    // ——— Céréales ———
    {
      sku: 'CON-SEM-1KG',
      slugFr: 'semoule-fine-1kg',
      slugEn: 'fine-semolina-1kg',
      nameFr: 'Semoule fine 1kg',
      nameEn: 'Fine semolina 1kg',
      descriptionFr: 'Semoule de blé dur pour couscous et pâtisseries.',
      descriptionEn: 'Durum wheat semolina for couscous and pastries.',
      categoryId: catCereales.id,
      brandId: brandOasis.id,
      price: 18.5,
      promoPrice: 15.9,
      weightKg: 1,
      packaging: 'Sachet 1kg',
      unitsPerCarton: 10,
      originCountry: 'MA',
      ingredients: 'Semoule de blé dur',
      allergens: 'Gluten',
      stockQty: 250,
      isFeatured: true,
      imageUrl: img.grains,
      keywords: ['semoule', 'couscous', 'alimentaire'],
    },
    {
      sku: 'CER-RIZ-1KG',
      slugFr: 'riz-basmati-1kg',
      slugEn: 'basmati-rice-1kg',
      nameFr: 'Riz basmati 1kg',
      nameEn: 'Basmati rice 1kg',
      descriptionFr: 'Riz basmati long grain, grains séparés après cuisson.',
      descriptionEn: 'Long-grain basmati rice with separate grains after cooking.',
      categoryId: catCereales.id,
      brandId: brandOasis.id,
      price: 28,
      promoPrice: 23.5,
      weightKg: 1,
      packaging: 'Sachet 1kg',
      unitsPerCarton: 10,
      originCountry: 'IN',
      ingredients: 'Riz basmati',
      stockQty: 200,
      imageUrl: img.grains,
      keywords: ['riz', 'basmati', 'cereales'],
    },
    {
      sku: 'CER-RIZ-5KG',
      slugFr: 'riz-long-grain-5kg',
      slugEn: 'long-grain-rice-5kg',
      nameFr: 'Riz long grain 5kg',
      nameEn: 'Long grain rice 5kg',
      descriptionFr: 'Riz long grain format pro — devis au-delà de 20 sacs.',
      descriptionEn: 'Long grain rice pro format — quote beyond 20 bags.',
      categoryId: catCereales.id,
      brandId: brandOasis.id,
      price: 95,
      purchaseMode: PurchaseMode.HYBRID,
      hybridThresholdQty: 20,
      weightKg: 5,
      packaging: 'Sac 5kg',
      unitsPerCarton: 4,
      originCountry: 'TH',
      ingredients: 'Riz',
      stockQty: 80,
      imageUrl: img.grains,
      keywords: ['riz', 'pro', 'cereales'],
    },
    {
      sku: 'CER-AVO-500',
      slugFr: 'flocons-avoine-500g',
      slugEn: 'rolled-oats-500g',
      nameFr: 'Flocons d’avoine 500g',
      nameEn: 'Rolled oats 500g',
      descriptionFr: 'Flocons d’avoine pour petit-déjeuner et pâtisserie.',
      descriptionEn: 'Rolled oats for breakfast and baking.',
      categoryId: catCereales.id,
      brandId: brandAtlas.id,
      price: 16,
      weightKg: 0.5,
      packaging: 'Sachet 500g',
      unitsPerCarton: 16,
      originCountry: 'DE',
      ingredients: 'Avoine',
      allergens: 'Gluten (avoine)',
      stockQty: 175,
      imageUrl: img.grains,
      keywords: ['avoine', 'cereales'],
    },
    {
      sku: 'CER-BLE-1KG',
      slugFr: 'ble-precuit-1kg',
      slugEn: 'pre-cooked-wheat-1kg',
      nameFr: 'Blé précuit 1kg',
      nameEn: 'Pre-cooked wheat 1kg',
      descriptionFr: 'Blé précuit pour salades et accompagnements rapides.',
      descriptionEn: 'Pre-cooked wheat for salads and quick sides.',
      categoryId: catCereales.id,
      brandId: brandOasis.id,
      price: 19.9,
      weightKg: 1,
      packaging: 'Sachet 1kg',
      unitsPerCarton: 10,
      originCountry: 'MA',
      ingredients: 'Blé précuit',
      allergens: 'Gluten',
      stockQty: 140,
      imageUrl: img.grains,
      keywords: ['ble', 'cereales'],
    },

    // ——— Hygiène ———
    {
      sku: 'SAV-NOIR-100',
      slugFr: 'savon-noir-100g',
      slugEn: 'black-soap-100g',
      nameFr: 'Savon noir beldi 100g',
      nameEn: 'Beldi black soap 100g',
      descriptionFr:
        'Savon noir traditionnel à l’huile d’olive, idéal pour le hammam et le gommage.',
      descriptionEn:
        'Traditional black soap with olive oil, ideal for hammam and scrubbing.',
      categoryId: catHygiene.id,
      brandId: brandAtlas.id,
      price: 19.9,
      promoPrice: 16.9,
      weightKg: 0.1,
      packaging: 'Pot 100g',
      unitsPerCarton: 48,
      originCountry: 'MA',
      ingredients: 'Huile d’olive, olives, potasse',
      storageConditions: 'À l’abri de la chaleur',
      stockQty: 240,
      isFeatured: true,
      imageUrl: img.soap,
      keywords: ['savon', 'hygiene', 'hammam', 'beldi'],
    },
    {
      sku: 'SAV-NOIR-1KG',
      slugFr: 'savon-noir-1kg',
      slugEn: 'black-soap-1kg',
      nameFr: 'Savon noir beldi 1kg',
      nameEn: 'Beldi black soap 1kg',
      descriptionFr:
        'Format pro / famille. Achat direct jusqu’à 10 kg, devis au-delà.',
      descriptionEn:
        'Pro / family format. Direct purchase up to 10 kg, quote beyond.',
      categoryId: catHygiene.id,
      brandId: brandAtlas.id,
      price: 89,
      purchaseMode: PurchaseMode.HYBRID,
      hybridThresholdQty: 10,
      weightKg: 1,
      packaging: 'Seau 1kg',
      unitsPerCarton: 12,
      originCountry: 'MA',
      ingredients: 'Huile d’olive, olives, potasse',
      stockQty: 80,
      isFeatured: true,
      imageUrl: img.soap2,
      keywords: ['savon', 'gros', 'pro', 'hygiene'],
    },
    {
      sku: 'ARG-RH-200',
      slugFr: 'argile-rhassoul-200g',
      slugEn: 'rhassoul-clay-200g',
      nameFr: 'Argile rhassoul 200g',
      nameEn: 'Rhassoul clay 200g',
      descriptionFr: 'Argile lavante du Moyen Atlas, cheveux et peau.',
      descriptionEn: 'Cleansing clay from the Middle Atlas, hair and skin.',
      categoryId: catHygiene.id,
      brandId: brandAtlas.id,
      price: 24.5,
      promoPrice: 19.9,
      weightKg: 0.2,
      packaging: 'Sachet 200g',
      originCountry: 'MA',
      ingredients: 'Argile rhassoul 100%',
      stockQty: 150,
      imageUrl: img.clay,
      keywords: ['argile', 'rhassoul', 'cheveux'],
    },
    {
      sku: 'SHP-ARG-250',
      slugFr: 'shampooing-argan-250ml',
      slugEn: 'argan-shampoo-250ml',
      nameFr: 'Shampoing à l’argan 250ml',
      nameEn: 'Argan shampoo 250ml',
      descriptionFr: 'Shampoing doux enrichi en huile d’argan.',
      descriptionEn: 'Gentle shampoo enriched with argan oil.',
      categoryId: catHygiene.id,
      brandId: brandAtlas.id,
      price: 39.9,
      volumeMl: 250,
      weightKg: 0.28,
      packaging: 'Flacon 250ml',
      originCountry: 'MA',
      ingredients: 'Aqua, sodium laureth sulfate, argania spinosa kernel oil',
      stockQty: 110,
      imageUrl: img.shampoo,
      keywords: ['shampooing', 'argan', 'hygiene'],
    },
    {
      sku: 'GEL-DOU-400',
      slugFr: 'gel-douche-fleur-oranger-400ml',
      slugEn: 'orange-blossom-shower-gel-400ml',
      nameFr: 'Gel douche fleur d’oranger 400ml',
      nameEn: 'Orange blossom shower gel 400ml',
      descriptionFr: 'Gel douche parfumé, pH neutre.',
      descriptionEn: 'Scented shower gel, neutral pH.',
      categoryId: catHygiene.id,
      brandId: brandCasa.id,
      price: 29.5,
      promoPrice: 24.9,
      volumeMl: 400,
      weightKg: 0.42,
      packaging: 'Flacon 400ml',
      originCountry: 'MA',
      stockQty: 180,
      imageUrl: img.shower,
      keywords: ['douche', 'hygiene', 'oranger'],
    },
    {
      sku: 'PAP-TOI-12',
      slugFr: 'papier-toilette-12-rouleaux',
      slugEn: 'toilet-paper-12-rolls',
      nameFr: 'Papier toilette 12 rouleaux',
      nameEn: 'Toilet paper 12 rolls',
      descriptionFr: 'Pack familial double épaisseur.',
      descriptionEn: 'Family pack, double ply.',
      categoryId: catHygiene.id,
      brandId: brandCasa.id,
      price: 48,
      promoPrice: 39.9,
      packaging: 'Pack 12',
      unitsPerCarton: 8,
      originCountry: 'MA',
      stockQty: 130,
      weightKg: 1.8,
      imageUrl: img.paper,
      keywords: ['papier', 'hygiene', 'maison'],
    },
    {
      sku: 'SAV-LIQ-5L',
      slugFr: 'savon-liquide-mains-5l',
      slugEn: 'liquid-hand-soap-5l',
      nameFr: 'Savon liquide mains 5L',
      nameEn: 'Liquid hand soap 5L',
      descriptionFr: 'Savon liquide mains format pro pour collectivités.',
      descriptionEn: 'Professional liquid hand soap for facilities.',
      categoryId: catHygiene.id,
      brandId: brandCasa.id,
      price: 85,
      purchaseMode: PurchaseMode.HYBRID,
      hybridThresholdQty: 12,
      volumeMl: 5000,
      weightKg: 5.1,
      packaging: 'Bidon 5L',
      unitsPerCarton: 4,
      originCountry: 'MA',
      stockQty: 55,
      imageUrl: img.shower,
      keywords: ['savon liquide', 'pro', 'hygiene'],
    },

    // ——— Nettoyage ———
    {
      sku: 'LIQ-VAI-1L',
      slugFr: 'liquide-vaisselle-citron-1l',
      slugEn: 'lemon-dish-soap-1l',
      nameFr: 'Liquide vaisselle citron 1L',
      nameEn: 'Lemon dish soap 1L',
      descriptionFr: 'Dégraissant efficace au citron. Format pro en devis.',
      descriptionEn: 'Effective lemon degreaser. Pro format on quote.',
      categoryId: catCleaning.id,
      brandId: brandCasa.id,
      price: 22,
      promoPrice: 18.5,
      purchaseMode: PurchaseMode.HYBRID,
      hybridThresholdQty: 24,
      volumeMl: 1000,
      weightKg: 1.05,
      packaging: 'Bidon 1L',
      unitsPerCarton: 12,
      originCountry: 'MA',
      stockQty: 200,
      imageUrl: img.dish,
      keywords: ['vaisselle', 'nettoyage', 'citron'],
    },
    {
      sku: 'DET-SOL-5L',
      slugFr: 'detergent-sol-5l',
      slugEn: 'floor-cleaner-5l',
      nameFr: 'Détergent sols 5L',
      nameEn: 'Floor cleaner 5L',
      descriptionFr: 'Format professionnel — demande de devis recommandée.',
      descriptionEn: 'Professional format — quote recommended.',
      categoryId: catCleaning.id,
      brandId: brandCasa.id,
      price: 95,
      purchaseMode: PurchaseMode.QUOTE,
      volumeMl: 5000,
      weightKg: 5.2,
      packaging: 'Bidon 5L',
      unitsPerCarton: 4,
      originCountry: 'MA',
      stockQty: 40,
      imageUrl: img.cleaner,
      keywords: ['detergent', 'pro', 'nettoyage'],
    },
    {
      sku: 'JAV-1L',
      slugFr: 'eau-de-javel-1l',
      slugEn: 'bleach-1l',
      nameFr: 'Eau de Javel 1L',
      nameEn: 'Bleach 1L',
      descriptionFr: 'Eau de Javel concentrée pour désinfection des surfaces.',
      descriptionEn: 'Concentrated bleach for surface disinfection.',
      categoryId: catCleaning.id,
      brandId: brandCasa.id,
      price: 14.5,
      promoPrice: 11.9,
      volumeMl: 1000,
      weightKg: 1.1,
      packaging: 'Bidon 1L',
      unitsPerCarton: 12,
      originCountry: 'MA',
      stockQty: 220,
      imageUrl: img.cleaner,
      keywords: ['javel', 'nettoyage', 'desinfection'],
    },
    {
      sku: 'NET-VIT-750',
      slugFr: 'nettoyant-vitres-750ml',
      slugEn: 'glass-cleaner-750ml',
      nameFr: 'Nettoyant vitres 750ml',
      nameEn: 'Glass cleaner 750ml',
      descriptionFr: 'Spray nettoyant vitres sans traces.',
      descriptionEn: 'Streak-free glass cleaner spray.',
      categoryId: catCleaning.id,
      brandId: brandCasa.id,
      price: 18.9,
      volumeMl: 750,
      weightKg: 0.8,
      packaging: 'Spray 750ml',
      unitsPerCarton: 12,
      originCountry: 'MA',
      stockQty: 160,
      imageUrl: img.cleaner,
      keywords: ['vitres', 'nettoyage'],
    },
  ];

  let created = 0;
  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    const data = {
      brandId: p.brandId,
      categoryId: p.categoryId,
      slugFr: p.slugFr,
      slugEn: p.slugEn,
      nameFr: p.nameFr,
      nameEn: p.nameEn,
      descriptionFr: p.descriptionFr,
      descriptionEn: p.descriptionEn,
      purchaseMode: p.purchaseMode ?? PurchaseMode.DIRECT,
      hybridThresholdQty: p.hybridThresholdQty ?? null,
      price: p.price,
      promoPrice: p.promoPrice ?? null,
      currency: 'MAD',
      weightKg: p.weightKg ?? null,
      volumeMl: p.volumeMl ?? null,
      packaging: p.packaging,
      unitsPerCarton: p.unitsPerCarton ?? null,
      originCountry: p.originCountry,
      ingredients: p.ingredients ?? null,
      allergens: p.allergens ?? null,
      storageConditions: p.storageConditions ?? null,
      stockQty: p.stockQty,
      isActive: true,
      isFeatured: p.isFeatured ?? false,
      keywords: p.keywords,
      seoTitleFr: `${p.nameFr} | Mdiscover`,
      seoTitleEn: `${p.nameEn} | Mdiscover`,
      seoDescriptionFr: p.descriptionFr,
      seoDescriptionEn: p.descriptionEn,
      ogImageUrl: p.imageUrl,
    };

    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.product.create({
          data: { sku: p.sku, ...data },
        });

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: p.imageUrl,
        altFr: p.nameFr,
        altEn: p.nameEn,
        sortOrder: 0,
        isPrimary: true,
      },
    });

    const lotNumber = `LOT-${p.sku}-2026`;
    await prisma.productLot.upsert({
      where: {
        productId_lotNumber: {
          productId: product.id,
          lotNumber,
        },
      },
      update: { quantity: Math.min(p.stockQty, 50) },
      create: {
        productId: product.id,
        lotNumber,
        expiryDate: new Date('2027-06-30'),
        quantity: Math.min(p.stockQty, 50),
      },
    });

    created += 1;
  }

  console.log(
    `Catalog: ${created} products across all categories (promos + nouveautés), 3 brands`,
  );
}

async function seedContent() {
  await prisma.faqItem.deleteMany({
    where: { question: { startsWith: '[SEED]' } },
  });

  await prisma.faqItem.createMany({
    data: [
      {
        category: 'Livraison',
        question: '[SEED] Quels délais de livraison au Maroc ?',
        answer: 'En général 2 à 5 jours ouvrables selon la ville.',
        locale: Locale.FR,
        sortOrder: 1,
        isActive: true,
      },
      {
        category: 'Devis',
        question: '[SEED] Quand demander un devis ?',
        answer:
          'Pour les gros volumes et produits en mode devis / hybride au-delà du seuil.',
        locale: Locale.FR,
        sortOrder: 2,
        isActive: true,
      },
      {
        category: 'Shipping',
        question: '[SEED] Delivery times in Morocco?',
        answer: 'Usually 2 to 5 business days depending on the city.',
        locale: Locale.EN,
        sortOrder: 1,
        isActive: true,
      },
    ],
  });

  await prisma.banner.upsert({
    where: { id: 'seed-home-hero' },
    update: {
      imageUrl:
        'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1600&q=80',
      titleFr: 'Food & Hygiène',
      titleEn: 'Food & Hygiene',
      isActive: true,
    },
    create: {
      id: 'seed-home-hero',
      placement: 'HOME_HERO',
      titleFr: 'Food & Hygiène',
      titleEn: 'Food & Hygiene',
      subtitleFr: 'Import, détail et gros',
      subtitleEn: 'Import, retail and wholesale',
      imageUrl:
        'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1600&q=80',
      linkUrl: '/catalogue',
      sortOrder: 0,
      isActive: true,
    },
  });

  console.log('Content: FAQ + banner seeded');
}

async function main() {
  await seedUsers();
  await seedCatalog();
  await seedContent();
  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
