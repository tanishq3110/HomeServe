const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Service = require('../models/service.model');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const servicesSeedData = [
  {
    name: 'AC Service & Repair',
    slug: 'ac-repair',
    category: 'AC Repair',
    tagline: 'Expert AC cooling diagnostics, jet pump cleaning & refrigerant refill',
    shortDesc: 'Complete AC service including filter jet wash, cooling coil inspection, gas check, and minor repairs.',
    fullDesc: 'Ensure optimal cooling and energy efficiency with our comprehensive AC maintenance service. Our certified technicians perform an intensive indoor and outdoor unit jet cleaning, check refrigerant pressure, inspect the thermostat, clean the drainage tray, and test motor performance.',
    startingPrice: 499,
    duration: '60 - 90 mins',
    rating: 4.8,
    reviewCount: 387,
    iconName: 'Wind',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    whatsIncluded: [
      'Indoor unit deep jet spray wash',
      'Outdoor condenser coil cleaning',
      'Refrigerant gas pressure measurement',
      'Drainage pipe clearing & leak detection',
      'Air filter cleaning & anti-bacterial disinfection',
      'Post-service cooling performance test',
    ],
    whyChooseUs: [
      'Experienced AC technicians with 5+ years expertise',
      'High-pressure jet wash without mess',
      '30-day post-service warranty',
      'Standardized and upfront rate card',
    ],
    pricingTiers: {
      basic: { name: 'Basic Checkup', price: 299, description: 'Inspection, filter wash & diagnosis' },
      standard: { name: 'Standard Jet Service', price: 499, description: 'Complete indoor & outdoor jet spray wash' },
      premium: { name: 'Comprehensive Overhaul', price: 999, description: 'Jet wash + gas pressure check & drain clearing' },
    },
    isActive: true,
  },
  {
    name: 'Electrician Services',
    slug: 'electrician',
    category: 'Electrical',
    tagline: 'Safe, certified electrical installations, rewiring & troubleshooting',
    shortDesc: 'Certified home electrical repairs, fan/switch installations, MCB fixes, and safety inspections.',
    fullDesc: 'From flickering lights and short circuits to complete room rewiring and ceiling fan fittings, our licensed electricians handle all residential electrical problems safely and according to code standards.',
    startingPrice: 199,
    duration: '30 - 60 mins',
    rating: 4.9,
    reviewCount: 524,
    iconName: 'Zap',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80',
    whatsIncluded: [
      'Detailed diagnosis with digital multimeters',
      'Switch, socket, or MCB repair/replacement',
      'Ceiling fan, chandelier, or fixture mounting',
      'Insulated wiring and circuit safety checks',
      'Post-repair load and grounding verification',
    ],
    whyChooseUs: [
      'Government certified electricians',
      'Toolkits with insulated safety gear',
      'No hidden charges; transparent billing',
      'Genuine replacement parts provided on request',
    ],
    pricingTiers: {
      basic: { name: 'Inspection & Minor Fix', price: 199, description: 'Diagnose issue & minor switch/socket fix' },
      standard: { name: 'Standard Installation', price: 399, description: 'Fan, chandelier, or appliance wiring' },
      premium: { name: 'Complete Circuit Safety', price: 799, description: 'MCB box wiring & comprehensive safety audit' },
    },
    isActive: true,
  },
  {
    name: 'Plumbing Solutions',
    slug: 'plumber',
    category: 'Plumbing',
    tagline: 'Fast leak fixes, pipe replacements, tap fittings & drain unclogging',
    shortDesc: 'Professional leak repair, pipe unblocking, tap/shower fittings, and bathroom fixture servicing.',
    fullDesc: 'Stop water leaks before they cause property damage. Our experienced plumbers handle pipe leakages, clogged drains, tap and mixer installations, water heater connections, flush tank repairs, and total water line troubleshooting.',
    startingPrice: 249,
    duration: '45 - 90 mins',
    rating: 4.7,
    reviewCount: 412,
    iconName: 'Wrench',
    image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80',
    whatsIncluded: [
      'Tap, faucet, and shower head repair or replacement',
      'Drain block removal and unclogging',
      'Pipe joint sealant and leakage repair',
      'Flush tank mechanism fixing or replacement',
      'Water pressure test across fixtures',
    ],
    whyChooseUs: [
      'Equipped with specialized pipe inspection gear',
      'Rapid arrival within scheduled time slot',
      'Cleanup after repair is completed',
      'Guaranteed leak-free work for 30 days',
    ],
    pricingTiers: {
      basic: { name: 'Leak Check & Tap Repair', price: 249, description: 'Washbasin or tap leak fixing' },
      standard: { name: 'Drain & Pipe Unclogging', price: 449, description: 'Chemical-free drain block removal' },
      premium: { name: 'Bathroom Overhaul', price: 899, description: 'Mixer, geyser, and major pipeline repair' },
    },
    isActive: true,
  },
  {
    name: 'Deep Home Cleaning',
    slug: 'home-cleaning',
    category: 'Cleaning',
    tagline: 'Hospital-grade sanitization, floor scrubbing & full home detailing',
    shortDesc: 'Intensive deep cleaning for kitchens, bathrooms, living rooms, sofas, and entire apartments.',
    fullDesc: 'Transform your living space with our intensive deep cleaning service. Our team uses industrial single-disc floor scrubbers, steam cleaners, and eco-friendly disinfectants to leave your home sparkling and germ-free.',
    startingPrice: 799,
    duration: '2 - 4 hours',
    rating: 4.8,
    reviewCount: 630,
    iconName: 'Sparkles',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    whatsIncluded: [
      'Floor buffing & single-disc scrubbing',
      'Kitchen degreasing (cabinets, countertops, tiles)',
      'Bathroom descaling & tile stain removal',
      'Window panes, mesh & sill wipedown',
      'Cobweb removal and high-reach dusting',
      'Eco-friendly odor neutralizing spray',
    ],
    whyChooseUs: [
      '100% non-toxic, pet & child safe chemicals',
      'Commercial-grade scrubbers and vacuum machines',
      'Trained cleaning crew in uniform',
      'Checklist-based quality inspection',
    ],
    pricingTiers: {
      basic: { name: 'Single Room / Kitchen Deep Clean', price: 799, description: 'Targeted single zone deep scrubbing' },
      standard: { name: '1-2 BHK Full Home Clean', price: 1799, description: 'Complete apartment sanitization & buffing' },
      premium: { name: '3+ BHK Villa Deep Cleaning', price: 2999, description: 'Full villa machine scrub + sofa shampoo' },
    },
    isActive: true,
  },
  {
    name: 'Painting & Waterproofing',
    slug: 'painting',
    category: 'Painting',
    tagline: 'Precision interior/exterior painting with flawless wall prep',
    shortDesc: 'Flawless wall painting, primer application, putty work, waterproof sealing, and color consultation.',
    fullDesc: 'Revitalize your walls with modern colors and durable finishes. We provide complete surface preparation including sanding, putty repair, moisture treatment, primer coat, and two coats of premium paint.',
    startingPrice: 999,
    duration: '1 - 3 days',
    rating: 4.6,
    reviewCount: 284,
    iconName: 'Paintbrush',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80',
    whatsIncluded: [
      'Furniture and floor masking with protective sheets',
      'Wall crack filling and smooth putty application',
      'Primer coating for paint longevity',
      'Two coats of premium low-VOC paint',
      'Post-painting cleanup and furniture repositioning',
    ],
    whyChooseUs: [
      'Laser measurement for accurate quoting',
      'Zero-mess guarantee with plastic sheet draping',
      'Color visualization consultation',
      '1-year paint peel warranty',
    ],
    pricingTiers: {
      basic: { name: 'Single Accent Wall', price: 999, description: 'Color prep & 2 coats of premium emulsion' },
      standard: { name: 'Single Room Painting', price: 2499, description: 'Ceiling + 4 walls with putty touchup' },
      premium: { name: 'Full Home Repaint', price: 8999, description: 'Complete home painting with 1-year warranty' },
    },
    isActive: true,
  },
  {
    name: 'Carpentry & Woodwork',
    slug: 'carpenter',
    category: 'Carpentry',
    tagline: 'Custom furniture repair, hinge fixing, lock replacements & assembly',
    shortDesc: 'Custom furniture repairs, door lock installation, hinge adjustments, and modular wardrobe fixes.',
    fullDesc: 'Whether you need flat-pack furniture assembled, squeaky doors aligned, drawer channels replaced, or custom wood repairs done, our skilled carpenters deliver neat craftsmanship.',
    startingPrice: 349,
    duration: '45 - 90 mins',
    rating: 4.8,
    reviewCount: 310,
    iconName: 'Hammer',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    whatsIncluded: [
      'Door lock, latch, and handle installation',
      'Modular wardrobe and cabinet hinge realignment',
      'Drawer slider and channel lubrication/replacement',
      'Furniture assembly (IKEA, Pepperfry, Urban Ladder)',
      'Wood drilling, sanding, and minor touch-ups',
    ],
    whyChooseUs: [
      'Professional precision tools for clean cuts',
      'Experienced artisans with woodcraft expertise',
      'Punctual arrival with standard fasteners',
      'No wood dust left behind',
    ],
    pricingTiers: {
      basic: { name: 'Lock & Hinge Repair', price: 349, description: 'Door lock or cabinet hinge adjustment' },
      standard: { name: 'Furniture Assembly', price: 699, description: 'Wardrobe, bed or table assembly' },
      premium: { name: 'Custom Woodwork Fix', price: 1299, description: 'Major structural furniture alignment & repair' },
    },
    isActive: true,
  },
  {
    name: 'Appliance Repair',
    slug: 'appliance-repair',
    category: 'Appliance Repair',
    tagline: 'Quick fixes for refrigerators, washing machines & microwave ovens',
    shortDesc: 'Diagnostic and repair services for washing machines, refrigerators, microwaves, and chimneys.',
    fullDesc: 'Don’t let broken appliances disrupt your day. Our appliance specialists diagnose motor issues, compressor faults, PCB board failures, drainage snags, and heating element malfunctions across major brands.',
    startingPrice: 299,
    duration: '45 - 75 mins',
    rating: 4.7,
    reviewCount: 445,
    iconName: 'Tv',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    whatsIncluded: [
      'Comprehensive component-level diagnosis',
      'Motor, pump, or belt testing',
      'Thermostat and temperature sensor checks',
      'Water inlet/outlet hose inspection',
      'Post-repair test run with load cycle',
    ],
    whyChooseUs: [
      'Original brand-compatible spare parts',
      '90-day warranty on replaced parts',
      'Transparent diagnostic fee adjusted in final repair bill',
      'Multi-brand expertise (LG, Samsung, Whirlpool, IFB, etc.)',
    ],
    pricingTiers: {
      basic: { name: 'Diagnostic Visit', price: 299, description: 'Expert diagnosis (waived if repair approved)' },
      standard: { name: 'Minor Appliance Repair', price: 599, description: 'Sensor, belt, or valve replacement' },
      premium: { name: 'Major Motor/PCB Service', price: 1199, description: 'Motor rewinding or PCB board restoration' },
    },
    isActive: true,
  },
  {
    name: 'Pest Control Services',
    slug: 'pest-control',
    category: 'Pest Control',
    tagline: 'Odourless, child-safe treatments for cockroaches, bedbugs & termites',
    shortDesc: 'Targeted pest treatments for cockroaches, termites, bedbugs, and mosquitoes using safe chemicals.',
    fullDesc: 'Protect your home and family from pests. We use odorless gel baits, micro-encapsulated sprays, and targeted crack injections that exterminate infestations while keeping children and pets completely safe.',
    startingPrice: 599,
    duration: '60 - 90 mins',
    rating: 4.8,
    reviewCount: 360,
    iconName: 'ShieldAlert',
    image: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&w=800&q=80',
    whatsIncluded: [
      'Targeted gel application in kitchen corners & appliances',
      'Drainage spray treatment to eliminate nesting sites',
      'Crack and crevice aerosol injection',
      'Bedbug heat treatment or chemical barrier if requested',
      'Preventive advice to avoid recurring infestation',
    ],
    whyChooseUs: [
      '100% odorless & non-staining formulations',
      'No need to vacate the kitchen or home',
      'Govt. approved chemicals (CIB certified)',
      'Free re-treatment if pests persist within 45 days',
    ],
    pricingTiers: {
      basic: { name: 'Kitchen Cockroach Gel', price: 599, description: 'Targeted gel baiting in kitchen & bathrooms' },
      standard: { name: 'Complete 2-BHK Pest Treatment', price: 999, description: 'Whole apartment cockroach & ant treatment' },
      premium: { name: 'Full Home Bedbug/Termite Barrier', price: 1899, description: 'Intensive drill-spray protection with warranty' },
    },
    isActive: true,
  },
];

/**
 * Seed services using upsert to guarantee idempotence (no duplicates)
 */
async function seedServices() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeserve';

  console.log(`[SeedServices] Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  try {
    let upsertedCount = 0;
    let modifiedCount = 0;

    for (const serviceData of servicesSeedData) {
      const res = await Service.updateOne(
        { slug: serviceData.slug },
        { $set: serviceData },
        { upsert: true }
      );

      if (res.upsertedCount > 0) {
        upsertedCount++;
      } else if (res.modifiedCount > 0) {
        modifiedCount++;
      }
    }

    const totalInDb = await Service.countDocuments({ isActive: true });

    console.log(`====================================================`);
    console.log(` [SeedServices] Completed successfully!`);
    console.log(` - Upserted new services: ${upsertedCount}`);
    console.log(` - Updated existing services: ${modifiedCount}`);
    console.log(` - Total active services in MongoDB: ${totalInDb}`);
    console.log(`====================================================`);

    return { upsertedCount, modifiedCount, totalInDb };
  } catch (error) {
    console.error('[SeedServices] Error during seeding:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('[SeedServices] Disconnected from MongoDB.');
  }
}

// Allow standalone CLI execution
if (require.main === module) {
  seedServices()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = {
  seedServices,
  servicesSeedData,
};

