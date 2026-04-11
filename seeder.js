const mongoose = require('./backend/node_modules/mongoose');
const path = require('path');
const Category = require('./backend/Models/Categories');
const Product = require('./backend/Models/Products');
require('./backend/node_modules/dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const categories = [
  { name: 'Unstitched Fabric', description: 'Premium unstitched fabric for custom tailoring and home styling.' },
  { name: 'Semi-Stitched Clothes', description: 'Ready-to-style semi-stitched suits and dress sets.' },
  { name: 'Strollers', description: 'Comfortable and durable baby strollers for every outing.' },
  { name: 'Prayer Mats', description: 'Soft and elegant prayer mats with classic and modern patterns.' },
  { name: 'Bedsheets', description: 'Single, double, queen and king size bedsheets in premium fabrics.' },
  { name: 'Blankets & Quilts', description: 'Warm blankets and quilt sets for all seasons.' },
  { name: 'Comforters', description: 'Cozy comforters and duvet-style sets for complete bedding.' },
  { name: 'Curtains', description: 'Modern and classic curtains for bedrooms and living rooms.' },
  { name: 'Sofa Covers', description: 'Protective and decorative covers for 1, 2 and 3-seater sofas.' },
  { name: 'Pillows & Cushions', description: 'Designer pillows and cushions for comfort and decor.' },
];

const image = (seed, label) => ({
  url: `https://picsum.photos/seed/${seed}/900/1100`,
  alt: label
});

const toSlug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const catalog = (ids) => [
  // Unstitched Fabric
  {
    name: 'Premium Lawn Unstitched 3-Piece',
    description: 'Soft premium lawn unstitched fabric set for elegant summer wear.',
    category: ids['Unstitched Fabric'],
    price: 2200,
    discountPrice: 1799,
    stock: 95,
    fabricType: 'Cotton',
    sizes: ['3 Piece'],
    colors: ['Sky Blue', 'Coral', 'White'],
    purchases: 120,
    images: [image('unstitched-lawn-3pc', 'Premium Lawn Unstitched 3-Piece')]
  },
  {
    name: 'Silk Touch Unstitched Festive Suit',
    description: 'Silk touch unstitched suit with subtle festive motifs and rich drape.',
    category: ids['Unstitched Fabric'],
    price: 3400,
    discountPrice: 2899,
    stock: 60,
    fabricType: 'Silk',
    sizes: ['3 Piece'],
    colors: ['Maroon', 'Emerald', 'Gold'],
    purchases: 88,
    images: [image('unstitched-silk-festive', 'Silk Touch Unstitched Festive Suit')]
  },
  {
    name: 'Linen Blend Winter Unstitched',
    description: 'Warm linen-blend unstitched fabric for chic winter outfits.',
    category: ids['Unstitched Fabric'],
    price: 3100,
    discountPrice: 2599,
    stock: 72,
    fabricType: 'Linen',
    sizes: ['3 Piece'],
    colors: ['Olive', 'Charcoal', 'Beige'],
    purchases: 63,
    images: [image('unstitched-linen-winter', 'Linen Blend Winter Unstitched')]
  },
  {
    name: 'Printed Cotton Unstitched Everyday',
    description: 'Budget-friendly printed cotton unstitched for everyday styling.',
    category: ids['Unstitched Fabric'],
    price: 1800,
    discountPrice: 1499,
    stock: 140,
    fabricType: 'Cotton',
    sizes: ['3 Piece'],
    colors: ['Lavender', 'Peach', 'Mint'],
    purchases: 107,
    images: [image('unstitched-cotton-everyday', 'Printed Cotton Unstitched Everyday')]
  },

  // Semi-Stitched Clothes
  {
    name: 'Semi-Stitched Embroidered Lawn Suit',
    description: 'Semi-stitched embroidered lawn suit ready for quick finishing.',
    category: ids['Semi-Stitched Clothes'],
    price: 4200,
    discountPrice: 3699,
    stock: 58,
    fabricType: 'Cotton',
    sizes: ['S', 'M', 'L'],
    colors: ['Ivory', 'Pink'],
    purchases: 91,
    images: [image('semi-stitched-lawn-embroidered', 'Semi-Stitched Embroidered Lawn Suit')]
  },
  {
    name: 'Semi-Stitched Silk Party Dress',
    description: 'Elegant semi-stitched silk party dress with premium finish.',
    category: ids['Semi-Stitched Clothes'],
    price: 5600,
    discountPrice: 4899,
    stock: 34,
    fabricType: 'Silk',
    sizes: ['S', 'M', 'L'],
    colors: ['Black', 'Ruby'],
    purchases: 79,
    images: [image('semi-stitched-silk-party', 'Semi-Stitched Silk Party Dress')]
  },
  {
    name: 'Semi-Stitched Casual Kurti Set',
    description: 'Comfort casual semi-stitched kurti set for daily wear.',
    category: ids['Semi-Stitched Clothes'],
    price: 2900,
    discountPrice: 2399,
    stock: 90,
    fabricType: 'Blend',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Navy', 'Mustard', 'White'],
    purchases: 112,
    images: [image('semi-stitched-kurti-casual', 'Semi-Stitched Casual Kurti Set')]
  },
  {
    name: 'Semi-Stitched Winter Khaddar Set',
    description: 'Warm semi-stitched khaddar style set for colder weather.',
    category: ids['Semi-Stitched Clothes'],
    price: 3800,
    discountPrice: 3299,
    stock: 66,
    fabricType: 'Other',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Brown', 'Olive', 'Maroon'],
    purchases: 70,
    images: [image('semi-stitched-khaddar-winter', 'Semi-Stitched Winter Khaddar Set')]
  },

  // Strollers
  {
    name: 'Urban Foldable Baby Stroller',
    description: 'Compact foldable stroller with smooth wheels for city use.',
    category: ids.Strollers,
    price: 19500,
    discountPrice: 16999,
    stock: 28,
    fabricType: 'Other',
    sizes: ['Standard'],
    colors: ['Grey', 'Black'],
    purchases: 41,
    images: [image('stroller-urban-foldable', 'Urban Foldable Baby Stroller')]
  },
  {
    name: 'Travel Lite Stroller',
    description: 'Lightweight travel stroller with one-hand folding system.',
    category: ids.Strollers,
    price: 16500,
    discountPrice: 14499,
    stock: 33,
    fabricType: 'Other',
    sizes: ['Standard'],
    colors: ['Blue', 'Charcoal'],
    purchases: 53,
    images: [image('stroller-travel-lite', 'Travel Lite Stroller')]
  },
  {
    name: 'Luxury Reversible Handle Stroller',
    description: 'Premium stroller with reversible handle and padded comfort seat.',
    category: ids.Strollers,
    price: 24500,
    discountPrice: 21999,
    stock: 19,
    fabricType: 'Other',
    sizes: ['Standard'],
    colors: ['Olive', 'Beige'],
    purchases: 26,
    images: [image('stroller-luxury-reversible', 'Luxury Reversible Handle Stroller')]
  },
  {
    name: 'All-Terrain Jogger Stroller',
    description: 'All-terrain jogger stroller for rough roads and outdoor walks.',
    category: ids.Strollers,
    price: 27800,
    discountPrice: 24999,
    stock: 14,
    fabricType: 'Other',
    sizes: ['Standard'],
    colors: ['Black', 'Red'],
    purchases: 22,
    images: [image('stroller-all-terrain-jogger', 'All-Terrain Jogger Stroller')]
  },

  // Prayer Mats
  {
    name: 'Velvet Prayer Mat Classic',
    description: 'Soft velvet prayer mat with elegant classic border design.',
    category: ids['Prayer Mats'],
    price: 1600,
    discountPrice: 1299,
    stock: 110,
    fabricType: 'Blend',
    sizes: ['Standard'],
    colors: ['Green', 'Blue', 'Maroon'],
    purchases: 152,
    images: [image('prayer-mat-velvet-classic', 'Velvet Prayer Mat Classic')]
  },
  {
    name: 'Memory Foam Prayer Mat',
    description: 'Comfort memory foam prayer mat with extra knee support.',
    category: ids['Prayer Mats'],
    price: 2600,
    discountPrice: 2199,
    stock: 78,
    fabricType: 'Polyester',
    sizes: ['Standard'],
    colors: ['Grey', 'Navy'],
    purchases: 84,
    images: [image('prayer-mat-memory-foam', 'Memory Foam Prayer Mat')]
  },
  {
    name: 'Travel Foldable Prayer Mat',
    description: 'Compact foldable prayer mat, ideal for travel and office use.',
    category: ids['Prayer Mats'],
    price: 950,
    discountPrice: 799,
    stock: 150,
    fabricType: 'Cotton',
    sizes: ['Travel'],
    colors: ['Black', 'Olive', 'Brown'],
    purchases: 127,
    images: [image('prayer-mat-travel-foldable', 'Travel Foldable Prayer Mat')]
  },
  {
    name: 'Luxury Embossed Prayer Mat',
    description: 'Premium embossed prayer mat with rich texture and finish.',
    category: ids['Prayer Mats'],
    price: 3200,
    discountPrice: 2799,
    stock: 54,
    fabricType: 'Silk',
    sizes: ['Standard'],
    colors: ['Gold', 'Burgundy'],
    purchases: 46,
    images: [image('prayer-mat-luxury-embossed', 'Luxury Embossed Prayer Mat')]
  },

  // Bedsheets
  {
    name: 'Royal Cotton Bedsheet',
    description: 'Premium 100% cotton bedsheet with breathable weave and smooth finish.',
    category: ids.Bedsheets,
    price: 2500,
    discountPrice: 1999,
    stock: 95,
    fabricType: 'Cotton',
    sizes: ['Single', 'Double', 'Queen', 'King'],
    colors: ['White', 'Blue', 'Sage', 'Blush'],
    purchases: 220,
    images: [image('bedsheet-royal-cotton', 'Royal Cotton Bedsheet')]
  },
  {
    name: 'Silk Luxury Bedsheet',
    description: 'Silk-touch luxurious bedsheet set crafted for a soft, cool night sleep.',
    category: ids.Bedsheets,
    price: 5200,
    discountPrice: 4099,
    stock: 45,
    fabricType: 'Silk',
    sizes: ['Double', 'Queen', 'King'],
    colors: ['Champagne', 'Burgundy', 'Ivory'],
    purchases: 146,
    images: [image('bedsheet-silk-luxury', 'Silk Luxury Bedsheet')]
  },
  {
    name: 'Printed Summer Bedsheet Set',
    description: 'Lightweight summer bedsheet set with breathable cotton blend.',
    category: ids.Bedsheets,
    price: 2100,
    discountPrice: 1699,
    stock: 115,
    fabricType: 'Blend',
    sizes: ['Single', 'Double', 'Queen'],
    colors: ['Sky Blue', 'Peach', 'Mint'],
    purchases: 88,
    images: [image('bedsheet-summer-printed', 'Printed Summer Bedsheet Set')]
  },
  {
    name: 'Hotel Stripe White Bedsheet',
    description: 'Classic hotel-stripe sateen bedsheet for a premium bedroom look.',
    category: ids.Bedsheets,
    price: 3400,
    discountPrice: 2899,
    stock: 64,
    fabricType: 'Cotton',
    sizes: ['Double', 'Queen', 'King'],
    colors: ['White'],
    purchases: 102,
    images: [image('bedsheet-hotel-stripe', 'Hotel Stripe White Bedsheet')]
  },

  // Blankets & Quilts
  {
    name: 'Winter Warm Blanket',
    description: 'Extra thick blanket perfect for cold winters and cozy evenings.',
    category: ids['Blankets & Quilts'],
    price: 3600,
    discountPrice: 2899,
    stock: 58,
    fabricType: 'Wool',
    sizes: ['Single', 'Double', 'Queen'],
    colors: ['Grey', 'Brown', 'Navy'],
    purchases: 173,
    images: [image('blanket-winter-warm', 'Winter Warm Blanket')]
  },
  {
    name: 'Cloud Fleece Throw Blanket',
    description: 'Soft fleece throw blanket, ideal for sofa layering and travel comfort.',
    category: ids['Blankets & Quilts'],
    price: 1800,
    discountPrice: 1399,
    stock: 92,
    fabricType: 'Polyester',
    sizes: ['Single'],
    colors: ['Ivory', 'Stone', 'Rose'],
    purchases: 132,
    images: [image('blanket-fleece-cloud', 'Cloud Fleece Throw Blanket')]
  },
  {
    name: 'Printed Quilt Set Double Bed',
    description: 'Lightweight printed quilt set designed for daily bedroom use.',
    category: ids['Blankets & Quilts'],
    price: 4100,
    discountPrice: 3499,
    stock: 49,
    fabricType: 'Cotton',
    sizes: ['Double', 'Queen'],
    colors: ['Blue', 'Pink'],
    purchases: 89,
    images: [image('quilt-printed-double', 'Printed Quilt Set Double Bed')]
  },
  {
    name: 'Reversible Microfiber Quilt',
    description: 'Reversible microfiber quilt with dual-tone premium finish.',
    category: ids['Blankets & Quilts'],
    price: 3300,
    discountPrice: 2799,
    stock: 68,
    fabricType: 'Blend',
    sizes: ['Single', 'Double'],
    colors: ['Charcoal', 'Beige'],
    purchases: 61,
    images: [image('quilt-reversible-microfiber', 'Reversible Microfiber Quilt')]
  },

  // Comforters
  {
    name: 'All Season Comforter Set',
    description: 'Balanced warmth comforter set suitable for all seasons.',
    category: ids.Comforters,
    price: 5400,
    discountPrice: 4699,
    stock: 52,
    fabricType: 'Blend',
    sizes: ['Double', 'Queen', 'King'],
    colors: ['White', 'Grey'],
    purchases: 98,
    images: [image('comforter-all-season', 'All Season Comforter Set')]
  },
  {
    name: 'Luxury Down Alternative Comforter',
    description: 'Fluffy down-alternative comforter with premium box stitching.',
    category: ids.Comforters,
    price: 6900,
    discountPrice: 6199,
    stock: 31,
    fabricType: 'Polyester',
    sizes: ['Queen', 'King'],
    colors: ['Ivory', 'Cloud'],
    purchases: 73,
    images: [image('comforter-down-alternative', 'Luxury Down Alternative Comforter')]
  },
  {
    name: 'Kids Cartoon Comforter',
    description: 'Soft kids comforter with playful cartoon prints and warm fill.',
    category: ids.Comforters,
    price: 4200,
    discountPrice: 3599,
    stock: 74,
    fabricType: 'Cotton',
    sizes: ['Single'],
    colors: ['Yellow', 'Blue'],
    purchases: 115,
    images: [image('comforter-kids-cartoon', 'Kids Cartoon Comforter')]
  },
  {
    name: 'Hotel Collection White Comforter',
    description: 'Hotel-grade white comforter for a clean and luxury bedroom look.',
    category: ids.Comforters,
    price: 7800,
    discountPrice: 6999,
    stock: 27,
    fabricType: 'Cotton',
    sizes: ['Queen', 'King'],
    colors: ['White'],
    purchases: 58,
    images: [image('comforter-hotel-white', 'Hotel Collection White Comforter')]
  },

  // Curtains
  {
    name: 'Floral Curtain Set',
    description: 'Elegant floral printed curtain set for living room and bedroom windows.',
    category: ids.Curtains,
    price: 1900,
    discountPrice: 1499,
    stock: 108,
    fabricType: 'Polyester',
    sizes: ['5ft', '7ft', '9ft'],
    colors: ['Rose', 'Gold', 'Teal'],
    purchases: 96,
    images: [image('curtain-floral-set', 'Floral Curtain Set')]
  },
  {
    name: 'Blackout Bedroom Curtains',
    description: 'Heavy blackout curtains for full light control and thermal insulation.',
    category: ids.Curtains,
    price: 3200,
    discountPrice: 2699,
    stock: 74,
    fabricType: 'Polyester',
    sizes: ['7ft', '9ft'],
    colors: ['Grey', 'Navy', 'Beige'],
    purchases: 149,
    images: [image('curtain-blackout-bedroom', 'Blackout Bedroom Curtains')]
  },
  {
    name: 'Sheer Linen Window Curtains',
    description: 'Sheer linen-style curtains that softly diffuse natural daylight.',
    category: ids.Curtains,
    price: 2600,
    discountPrice: 2199,
    stock: 83,
    fabricType: 'Linen',
    sizes: ['5ft', '7ft', '9ft'],
    colors: ['Off White', 'Sand'],
    purchases: 84,
    images: [image('curtain-sheer-linen', 'Sheer Linen Window Curtains')]
  },
  {
    name: 'Velvet Ring Top Curtains',
    description: 'Premium velvet curtains with metal ring top for modern interiors.',
    category: ids.Curtains,
    price: 4200,
    discountPrice: 3599,
    stock: 41,
    fabricType: 'Blend',
    sizes: ['7ft', '9ft'],
    colors: ['Emerald', 'Wine', 'Midnight'],
    purchases: 57,
    images: [image('curtain-velvet-ring-top', 'Velvet Ring Top Curtains')]
  },

  // Sofa Covers
  {
    name: 'Stretch Fit Sofa Cover 3 Seater',
    description: 'Elastic stretch sofa cover for 3-seater sofas with anti-slip fit.',
    category: ids['Sofa Covers'],
    price: 4600,
    discountPrice: 3899,
    stock: 45,
    fabricType: 'Polyester',
    sizes: ['3 Seater'],
    colors: ['Graphite', 'Sand', 'Coffee'],
    purchases: 121,
    images: [image('sofa-stretch-fit-3', 'Stretch Fit Sofa Cover 3 Seater')]
  },
  {
    name: 'Jacquard Sofa Cover Set',
    description: 'Premium jacquard sofa cover set with elegant woven textures.',
    category: ids['Sofa Covers'],
    price: 5900,
    discountPrice: 5099,
    stock: 33,
    fabricType: 'Blend',
    sizes: ['1 Seater', '2 Seater', '3 Seater'],
    colors: ['Taupe', 'Charcoal'],
    purchases: 69,
    images: [image('sofa-jacquard-set', 'Jacquard Sofa Cover Set')]
  },
  {
    name: 'Waterproof Pet-Friendly Sofa Cover',
    description: 'Durable waterproof sofa cover designed for homes with pets.',
    category: ids['Sofa Covers'],
    price: 4300,
    discountPrice: 3599,
    stock: 52,
    fabricType: 'Polyester',
    sizes: ['2 Seater', '3 Seater'],
    colors: ['Slate', 'Mocha'],
    purchases: 94,
    images: [image('sofa-waterproof-pet', 'Waterproof Pet-Friendly Sofa Cover')]
  },
  {
    name: 'Quilted Reversible Sofa Throw',
    description: 'Reversible quilted sofa throw that doubles as protective cover.',
    category: ids['Sofa Covers'],
    price: 3000,
    discountPrice: 2499,
    stock: 61,
    fabricType: 'Cotton',
    sizes: ['2 Seater', '3 Seater'],
    colors: ['Indigo', 'Beige'],
    purchases: 58,
    images: [image('sofa-quilted-reversible', 'Quilted Reversible Sofa Throw')]
  },

  // Pillows & Cushions
  {
    name: 'Embroidered Pillow Cover Set',
    description: 'Handcrafted embroidered pillow covers in set of 2 for premium decor.',
    category: ids['Pillows & Cushions'],
    price: 900,
    discountPrice: 649,
    stock: 160,
    fabricType: 'Cotton',
    sizes: ['18x18', '20x20'],
    colors: ['Ivory', 'Blue', 'Taupe'],
    purchases: 330,
    images: [image('pillow-embroidered-set', 'Embroidered Pillow Cover Set')]
  },
  {
    name: 'Boho Tassel Cushion Covers',
    description: 'Textured boho cushion covers with tassel detailing for chic spaces.',
    category: ids['Pillows & Cushions'],
    price: 1100,
    discountPrice: 899,
    stock: 125,
    fabricType: 'Linen',
    sizes: ['16x16', '18x18'],
    colors: ['Cream', 'Rust', 'Olive'],
    purchases: 127,
    images: [image('pillow-boho-tassel', 'Boho Tassel Cushion Covers')]
  },
  {
    name: 'Minimal Geometric Cushion Covers',
    description: 'Set of minimalist geometric cushion covers for modern homes.',
    category: ids['Pillows & Cushions'],
    price: 980,
    discountPrice: 749,
    stock: 138,
    fabricType: 'Blend',
    sizes: ['18x18'],
    colors: ['Black', 'White', 'Beige'],
    purchases: 99,
    images: [image('pillow-minimal-geometric', 'Minimal Geometric Cushion Covers')]
  },
  {
    name: 'Velvet Luxe Cushion Set',
    description: 'Velvet luxe cushion set with soft support and rich colors.',
    category: ids['Pillows & Cushions'],
    price: 1950,
    discountPrice: 1599,
    stock: 82,
    fabricType: 'Silk',
    sizes: ['Standard'],
    colors: ['Emerald', 'Mustard', 'Plum'],
    purchases: 78,
    images: [image('cushion-velvet-luxe', 'Velvet Luxe Cushion Set')]
  },
].map((p) => ({
  ...p,
  slug: toSlug(p.name),
  metaTitle: `${p.name} | WF Bedding Store`,
  metaDescription: p.description.slice(0, 150),
  metaKeywords: ['bedding', p.name.toLowerCase(), p.fabricType.toLowerCase(), 'wajahat fabrics']
}));

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    await Category.deleteMany();
    await Product.deleteMany();
    console.log('Old data removed');

    const createdCategories = await Category.insertMany(categories);
    const ids = createdCategories.reduce((acc, c) => ({ ...acc, [c.name]: c._id }), {});

    const products = catalog(ids);
    await Product.insertMany(products);

    console.log('Seed complete');
    console.log('Categories:', createdCategories.length);
    console.log('Products:', products.length);
    process.exit(0);
  } catch (error) {
    console.error('Seeder error:', error.message);
    process.exit(1);
  }
};

seedData();