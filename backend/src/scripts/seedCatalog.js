// Seeds categories, brands, vendors and products into MongoDB.
// Source 1: the frontend demo files in frontend/src/data (categories, brands, vendors, products).
// Source 2: extra mock data defined below.
// Image files are stored in MongoDB (Media collection) and served by the backend at /api/media/<id>.
//
// Run from backend/:   node src/scripts/seedCatalog.js
// Remove seeded products:   node src/scripts/seedCatalog.js --clean
// Safe to run more than once: records are matched by slug / email and updated, not duplicated.

import 'dotenv/config';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import mongoose from 'mongoose';
import Category from '../models/Category.model.js';
import Brand from '../models/Brand.model.js';
import Vendor from '../models/Vendor.model.js';
import Product from '../models/Product.model.js';
import Media from '../models/Media.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(__dirname, '../../../frontend');
const DATA_JS = path.join(FRONTEND, 'src/data');
const DATA_ASSETS = path.join(FRONTEND, 'data');
const SEED_TAG = 'seed-data';
const VENDOR_PASSWORD = 'vendor123';

const slugify = (s) =>
    String(s).toLowerCase().replace(/&/g, 'and').replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// "products/blazer.png" -> "/api/media/<id>", filled by uploadImages()
const MEDIA_URL = {};
const img = (folder, file) => {
    const url = MEDIA_URL[`${folder}/${file}`];
    if (!url) throw new Error(`Image not found: frontend/data/${folder}/${file}`);
    return url;
};
const CONTENT_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml' };

// ─── 1. Upload image files into MongoDB (Media collection) ───────────────────
async function uploadImages() {
    let uploaded = 0;
    for (const folder of ['products', 'brands', 'categories', 'logos']) {
        const dir = path.join(DATA_ASSETS, folder);
        if (!fs.existsSync(dir)) continue;
        for (const file of fs.readdirSync(dir)) {
            const contentType = CONTENT_TYPES[path.extname(file).toLowerCase()];
            if (!contentType) continue;
            const key = `${folder}/${file}`;
            const data = fs.readFileSync(path.join(dir, file));
            let media = await Media.findOne({ key }).select('_id size');
            if (!media || media.size !== data.length) {
                media = await Media.findOneAndUpdate(
                    { key },
                    { key, contentType, size: data.length, data },
                    { upsert: true, new: true, projection: { _id: 1 } }
                );
                uploaded++;
            }
            MEDIA_URL[key] = `/api/media/${media._id}`;
        }
    }
    return uploaded;
}

// ─── 2. Load frontend demo data (image imports become /api/media/... URLs) ───
async function loadFrontendData(file) {
    const code = fs
        .readFileSync(path.join(DATA_JS, file), 'utf8')
        .replace(
            /import\s+(\w+)\s+from\s+(["'])\.\.\/\.\.\/data\/([^/]+)\/(.+?)\2;?/g,
            (_, name, _q, folder, f) => `const ${name} = ${JSON.stringify(img(folder, f))};`
        );
    const tmp = path.join(os.tmpdir(), `seed-${Date.now()}-${file.replace('.js', '.mjs')}`);
    fs.writeFileSync(tmp, code);
    try {
        return await import(pathToFileURL(tmp).href);
    } finally {
        fs.unlinkSync(tmp);
    }
}

// Frontend products have no category, so map them by keywords in the name.
const CATEGORY_RULES = [
    ['Athletic', /track pants|running shoes|athletic|sports|yoga|gym/i],
    ['Footwear', /sneaker|pump|boot|heel|sandal|loafer|shoe/i],
    ['Bags', /bag|backpack|tote|wallet|clutch/i],
    ['Jewelry', /watch|necklace|earring|bracelet|ring/i],
    ['Accessories', /sunglass|scarf|belt|cap|hat/i],
    ['Clothing', /.*/],
];
// Seed category name -> slug of the matching category that already exists in the database.
const CATEGORY_ALIASES = {
    Footwear: 'shoes',
    Jewelry: 'jewellery',
    Athletic: 'athletics',
    Kids: 'clothing-kids',
};
const categoryFor = (name) => CATEGORY_RULES.find(([, re]) => re.test(name))[0];

// ─── 3. Extra mock data ──────────────────────────────────────────────────────
const EXTRA_CATEGORIES = [
    { name: 'Kids', description: 'Clothing and shoes for kids' },
    { name: 'Ethnic Wear', description: 'Kurtas, sarees and traditional outfits' },
];

const EXTRA_BRANDS = [
    { name: 'Nike', description: 'Sportswear and athletic shoes' },
    { name: 'H&M', description: 'Affordable everyday fashion' },
    { name: 'Fossil', description: 'Watches and leather accessories' },
];

const EXTRA_VENDORS = [
    {
        name: 'Urban Threads', email: 'urbanthreads@example.com', phone: '+919800000001',
        storeName: 'Urban Threads', storeDescription: 'Streetwear and casual fashion',
        status: 'approved', commissionRate: 10, rating: 4.3, reviewCount: 64, isVerified: true,
        address: { street: '12 MG Road', city: 'Bengaluru', state: 'KA', zipCode: '560001', country: 'India' },
    },
    {
        name: 'Desi Couture', email: 'desicouture@example.com', phone: '+919800000002',
        storeName: 'Desi Couture', storeDescription: 'Handpicked ethnic and festive wear',
        status: 'approved', commissionRate: 12, rating: 4.6, reviewCount: 210, isVerified: true,
        address: { street: '45 Johari Bazaar', city: 'Jaipur', state: 'RJ', zipCode: '302003', country: 'India' },
    },
];

// [name, image file, price, originalPrice, category, brand, vendor email, extra flags]
const EXTRA_PRODUCTS = [
    ['Oversized Graphic Tee', 'white t shirt.png', 19.99, 27.99, 'Clothing', 'H&M', 'urbanthreads@example.com', { isNewArrival: true }],
    ['Relaxed Fit Cargo Jeans', 'blue jeans.png', 64.99, 79.99, 'Clothing', "Levi's", 'urbanthreads@example.com', { flashSale: true }],
    ['Linen Button-Down Shirt', 'shirt.png', 39.99, 49.99, 'Clothing', 'Allen Solly', 'fashionhub@example.com', {}],
    ['Cropped Denim Jacket', 'denim jacket.png', 74.99, 99.99, 'Clothing', 'Zara', 'urbanthreads@example.com', { isFeatured: true }],
    ['Cable Knit Pullover', 'sweater.png', 49.99, 59.99, 'Clothing', 'Pantaloons', 'fashionhub@example.com', {}],
    ['Slim Fit Office Blazer', 'blazer.png', 119.99, 149.99, 'Clothing', 'Tommy Hilfiger', 'fashionhub@example.com', { isFeatured: true }],
    ['Embroidered Anarkali Gown', 'gown.png', 149.99, 199.99, 'Ethnic Wear', 'Biba', 'desicouture@example.com', { isNewArrival: true }],
    ['Printed Cotton Maxi Dress', 'maxi.png', 44.99, 54.99, 'Ethnic Wear', 'Fabindia', 'desicouture@example.com', {}],
    ['Festive Silk Kurta', 'shirt.png', 69.99, 89.99, 'Ethnic Wear', 'Manyavar', 'desicouture@example.com', { flashSale: true }],
    ['Kids Summer Frock', 'summer dress.png', 24.99, 29.99, 'Kids', 'H&M', 'urbanthreads@example.com', { isNewArrival: true }],
    ['Kids Denim Dungaree', 'blue jeans.png', 29.99, 34.99, 'Kids', "Levi's", 'urbanthreads@example.com', {}],
    ['Kids Light-Up Sneakers', 'sneakers.png', 34.99, 44.99, 'Kids', 'Puma', 'techgear@example.com', {}],
    ['Air Cushion Running Shoes', 'athlatic shoes.png', 89.99, 119.99, 'Athletic', 'Nike', 'techgear@example.com', { flashSale: true, isFeatured: true }],
    ['Dri-Fit Training Joggers', 'track pants.png', 39.99, 49.99, 'Athletic', 'Nike', 'techgear@example.com', { isNewArrival: true }],
    ['Classic White Court Sneakers', 'sneakers.png', 69.99, 84.99, 'Footwear', 'Puma', 'techgear@example.com', {}],
    ['Chelsea Leather Boots', 'leather boots.png', 109.99, 139.99, 'Footwear', 'Tommy Hilfiger', 'fashionhub@example.com', {}],
    ['Block Heel Sandals', 'heals.png', 54.99, 64.99, 'Footwear', 'Forever 21', 'fashionhub@example.com', { isNewArrival: true }],
    ['Vegan Leather Tote Bag', 'leather bag.png', 59.99, 79.99, 'Bags', 'Zara', 'fashionhub@example.com', { flashSale: true }],
    ['Chronograph Steel Watch', 'stylish watch.png', 159.99, 199.99, 'Jewelry', 'Fossil', 'techgear@example.com', { isFeatured: true }],
    ['Layered Gold Necklace', 'neckless.png', 34.99, 44.99, 'Jewelry', 'Forever 21', 'desicouture@example.com', {}],
    ['Polarized Aviator Sunglasses', 'sunglass.png', 79.99, 99.99, 'Accessories', 'Tommy Hilfiger', 'fashionhub@example.com', {}],
    ['Reversible Leather Belt', 'belt.png', 29.99, 39.99, 'Accessories', 'Fossil', 'fashionhub@example.com', {}],
    ['Cashmere Blend Muffler', 'winter scarf.png', 39.99, 49.99, 'Accessories', 'Fabindia', 'desicouture@example.com', { isNewArrival: true }],
];

const SIZES = { Clothing: ['S', 'M', 'L', 'XL'], 'Ethnic Wear': ['S', 'M', 'L', 'XL'], Kids: ['2-3Y', '4-5Y', '6-7Y'], Footwear: ['6', '7', '8', '9', '10'], Athletic: ['S', 'M', 'L', 'XL'] };

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function upsertBySlug(Model, doc) {
    const slug = slugify(doc.name);
    return Model.findOneAndUpdate({ slug }, { ...doc, slug }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function upsertVendor(v) {
    const { id, totalProducts, documents, password, ...data } = v; // drop fields not in the schema
    let vendor = await Vendor.findOne({ email: data.email.toLowerCase() });
    if (vendor) {
        Object.assign(vendor, data); // keep the existing password
    } else {
        vendor = new Vendor({ ...data, password: VENDOR_PASSWORD });
    }
    await vendor.save();
    return vendor;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set in backend/.env');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    if (process.argv.includes('--clean')) {
        const { deletedCount } = await Product.deleteMany({ tags: SEED_TAG });
        console.log(`Removed ${deletedCount} seeded products.`);
        return;
    }

    const uploaded = await uploadImages();
    console.log(`Images in MongoDB: ${Object.keys(MEDIA_URL).length} (${uploaded} uploaded this run)`);

    const [{ categories }, { brands }, { vendors }, { products }] = await Promise.all(
        ['categories.js', 'brands.js', 'vendors.js', 'products.js'].map(loadFrontendData)
    );

    // Categories: reuse a matching category already in the database (never overwrite it),
    // create only the missing ones.
    const catByName = {};
    const allCategories = [...categories.map(({ id, ...c }) => c), ...EXTRA_CATEGORIES];
    let created = 0;
    for (const c of allCategories) {
        const slug = CATEGORY_ALIASES[c.name] || slugify(c.name);
        let cat = await Category.findOne({ slug });
        if (!cat) {
            cat = await Category.create({ ...c, slug, order: 100 + created, isActive: true });
            created++;
        } else if (c.image && (!cat.image || cat.image.startsWith('/seed/'))) {
            cat.image = c.image;
            await cat.save();
        }
        catByName[c.name] = cat;
    }
    console.log(`Categories: ${allCategories.length} used, ${created} newly created`);

    // Brands
    const brandByName = {};
    const brandById = {};
    for (const b of brands) {
        const { id, ...data } = b;
        brandById[id] = brandByName[b.name] = await upsertBySlug(Brand, { ...data, isActive: true });
    }
    for (const b of EXTRA_BRANDS) brandByName[b.name] = await upsertBySlug(Brand, { ...b, isActive: true });
    console.log(`Brands: ${brands.length + EXTRA_BRANDS.length}`);

    // Vendors
    const vendorById = {};
    const vendorByEmail = {};
    for (const v of vendors) {
        vendorById[v.id] = vendorByEmail[v.email] = await upsertVendor(v);
    }
    for (const v of EXTRA_VENDORS) {
        vendorByEmail[v.email] = await upsertVendor({ ...v, storeLogo: img('logos', 'BigMol_Logo.png') });
    }
    console.log(`Vendors: ${vendors.length + EXTRA_VENDORS.length} (new ones get password "${VENDOR_PASSWORD}")`);

    // Products from frontend data
    let count = 0;
    for (const p of products) {
        const { id, vendorId, brandId, vendorName, categoryId, ...data } = p;
        await upsertBySlug(Product, {
            ...data,
            description: data.description || `${p.name} from our curated collection.`,
            images: data.images?.length ? data.images : [data.image],
            categoryId: catByName[categoryFor(p.name)]._id,
            brandId: brandById[brandId]?._id,
            vendorId: vendorById[vendorId]._id,
            isActive: true,
            tags: [SEED_TAG],
        });
        count++;
    }

    // Extra products
    for (const [name, file, price, originalPrice, category, brand, email, flags] of EXTRA_PRODUCTS) {
        const image = img('products', file);
        const stockQuantity = 10 + ((name.length * 7) % 90);
        await upsertBySlug(Product, {
            name,
            description: `${name} — quality ${category.toLowerCase()} from ${brand}.`,
            price,
            originalPrice,
            unit: 'Piece',
            image,
            images: [image],
            categoryId: catByName[category]._id,
            brandId: brandByName[brand]._id,
            vendorId: vendorByEmail[email]._id,
            stock: stockQuantity < 15 ? 'low_stock' : 'in_stock',
            stockQuantity,
            rating: Number((3.8 + ((name.length % 12) / 10)).toFixed(1)),
            reviewCount: 10 + ((name.length * 13) % 240),
            ...(SIZES[category] && { variants: { sizes: SIZES[category], defaultVariant: { size: SIZES[category][1] } } }),
            isActive: true,
            tags: [SEED_TAG],
            ...flags,
        });
        count++;
    }
    console.log(`Products: ${count}`);
    console.log('Done.');
}

main()
    .catch((err) => {
        console.error('Seed failed:', err.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
