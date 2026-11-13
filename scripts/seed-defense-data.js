#!/usr/bin/env node
/**
 * FoodFix — Thesis Defense Live Data Seeder
 * Populates Firestore with realistic in-flight orders, GCash notifications,
 * customer support messages, reviews, and counters so the Admin Dashboard
 * demonstrates the complete real-time lifecycle during the defense.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '';
const PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'foodfix-lasangpinoy-2026';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/default/documents`;
const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreDoc(data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }
  return { fields };
}

async function signIn(email, password) {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Sign in failed for ${email}: ${JSON.stringify(data)}`);
  return { uid: data.localId, token: data.idToken };
}

async function saveDoc(col, docId, data, token) {
  const url = `${BASE_URL}/${col}/${docId}?key=${API_KEY}`;
  const doc = toFirestoreDoc(data);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(doc),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to save ${col}/${docId}: ${res.status} ${text}`);
  }
  return await res.json();
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 FoodFix — Populating Admin Dashboard & App with Defense Data');
  console.log('═'.repeat(60));

  // 1. Authenticate admin & customer
  console.log('\n[1/5] Authenticating test accounts...');
  const customer = await signIn('customer@foodfix.com', 'password123');
  console.log(`  ✓ Customer authenticated (UID: ${customer.uid})`);
  const admin = await signIn('admin@foodfix.com', 'admin12345');
  console.log(`  ✓ Admin authenticated (UID: ${admin.uid})`);

  // 2. Set Counter for Order Sequence
  console.log('\n[2/5] Setting sequential order counter...');
  await saveDoc('counters', 'order_number', { value: 1046, updated_at: new Date() }, admin.token);
  console.log('  ✓ Counter set to 1046');

  // 3. Seed Realistic Orders across all statuses
  console.log('\n[3/5] Seeding live orders...');
  const now = new Date();
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
  const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000);

  const orders = [
    {
      id: 'ord_1041',
      order_number: '1041',
      customer_id: customer.uid,
      customer_name: 'Juan Dela Cruz',
      customer_phone: '09171234567',
      customer_address: 'Room 304, PUP Main Academic Building, Sta. Mesa, Manila',
      customer_lat: 14.5985,
      customer_lng: 121.0114,
      items: [
        {
          menu_item_id: '5JlLjEciIyqKrxIHWGt5',
          name: 'Pares',
          price: 70,
          quantity: 2,
          image_url: 'https://res.cloudinary.com/dafcyj6fh/image/upload/f_auto,q_auto/v1780092154/foodfix/menu/hyewnz5etyld2blpzyws.jpg'
        },
        {
          menu_item_id: 'HG2IB55PyrIKJQmADmYv',
          name: 'Lomi (Regular)',
          price: 80,
          quantity: 1,
          image_url: 'https://res.cloudinary.com/dafcyj6fh/image/upload/f_auto,q_auto/v1780091811/foodfix/menu/i4stzueppx9amebjq9js.jpg'
        }
      ],
      subtotal: 220,
      delivery_fee: 45,
      total: 265,
      status: 'pending',
      order_type: 'delivery',
      payment_method: 'gcash',
      order_note: 'Please include extra chili garlic and calamansi po!',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'ord_1042',
      order_number: '1042',
      customer_id: customer.uid,
      customer_name: 'Maria Clara de los Santos',
      customer_phone: '09189876543',
      customer_address: 'Pureza St corner Teresa St, Sta. Mesa, Manila',
      customer_lat: 14.6012,
      customer_lng: 121.0089,
      items: [
        {
          menu_item_id: 'xpqFtwPmeC1T7loQRI4J',
          name: 'Tapsilog',
          price: 65,
          quantity: 2,
          image_url: 'https://res.cloudinary.com/dafcyj6fh/image/upload/f_auto,q_auto/v1780092447/foodfix/menu/pflyhw6fdhdf4mesbtyp.jpg'
        },
        {
          menu_item_id: 'A2Rnw2tV9O5WoXiBm5z1',
          name: 'Chami Tamis Anghang',
          price: 80,
          quantity: 1,
          image_url: 'https://res.cloudinary.com/dafcyj6fh/image/upload/f_auto,q_auto/v1780091660/foodfix/menu/kxknbkbjskvretmtx5vw.jpg'
        }
      ],
      subtotal: 210,
      delivery_fee: 45,
      total: 255,
      status: 'accepted',
      order_type: 'delivery',
      payment_method: 'cod',
      order_note: 'Crispy egg please.',
      created_at: tenMinsAgo,
      updated_at: now,
    },
    {
      id: 'ord_1043',
      order_number: '1043',
      customer_id: customer.uid,
      customer_name: 'Jose Protacio Rizal',
      customer_phone: '09195554321',
      customer_address: 'PUP College of Computer and Information Sciences (CCIS), Manila',
      customer_lat: 14.5979,
      customer_lng: 121.0105,
      items: [
        {
          menu_item_id: 'R5EqyawUGDt2oK7mJpM1',
          name: 'Lomi Jumbo',
          price: 120,
          quantity: 2,
          image_url: 'https://res.cloudinary.com/dafcyj6fh/image/upload/f_auto,q_auto/v1780091823/foodfix/menu/egfymk4hsngsufs1etjl.jpg'
        },
        {
          menu_item_id: 'kZyhYBdYGteSGuowuAjB',
          name: 'Halo - halo',
          price: 50,
          quantity: 2,
          image_url: 'https://res.cloudinary.com/dafcyj6fh/image/upload/f_auto,q_auto/v1780091778/foodfix/menu/skssaagawuuvc5qanpb2.jpg'
        }
      ],
      subtotal: 340,
      delivery_fee: 45,
      total: 385,
      status: 'out_for_delivery',
      order_type: 'delivery',
      payment_method: 'gcash',
      driver_name: 'Kuya Rider Staff',
      driver_phone: '09191234567',
      location_sharing_enabled: true,
      created_at: twentyMinsAgo,
      updated_at: now,
    },
    {
      id: 'ord_1044',
      order_number: '1044',
      customer_id: customer.uid,
      customer_name: 'Andres Bonifacio',
      customer_phone: '09204443322',
      customer_address: 'Hasmin Hostel, M.H. Del Pilar Campus, PUP Manila',
      customer_lat: 14.5991,
      customer_lng: 121.0120,
      items: [
        {
          menu_item_id: 'NWwEogtM3kcuzbcnrndH',
          name: 'Lumpiang Shanghai (100pcs)',
          price: 700,
          quantity: 1,
          image_url: 'https://res.cloudinary.com/dafcyj6fh/image/upload/f_auto,q_auto/v1780091869/foodfix/menu/aayvva12zhapytuvprdm.jpg'
        },
        {
          menu_item_id: 'dYv6gfy3f1BnEOBqQkqm',
          name: 'Miki Bihon',
          price: 85,
          quantity: 2,
          image_url: 'https://res.cloudinary.com/dafcyj6fh/image/upload/f_auto,q_auto/v1780092039/foodfix/menu/ygk6vbdvrywhvuujqbei.jpg'
        }
      ],
      subtotal: 870,
      delivery_fee: 0,
      total: 870,
      status: 'delivered',
      order_type: 'pickup',
      payment_method: 'cod',
      created_at: oneHourAgo,
      updated_at: twentyMinsAgo,
    },
    {
      id: 'ord_1045',
      order_number: '1045',
      customer_id: customer.uid,
      customer_name: 'Gabriela Silang',
      customer_phone: '09228887766',
      customer_address: 'Teresa St, Sta. Mesa, Manila',
      items: [
        {
          menu_item_id: '9jU7sPCOakY6ZQclf4RX',
          name: 'Maha Blanca (Small)',
          price: 700,
          quantity: 1,
          image_url: 'https://res.cloudinary.com/dafcyj6fh/image/upload/f_auto,q_auto/v1780091914/foodfix/menu/jozv93bvbscvfvmcetnb.jpg'
        }
      ],
      subtotal: 700,
      delivery_fee: 45,
      total: 745,
      status: 'preparing',
      order_type: 'delivery',
      payment_method: 'gcash',
      refund_status: 'pending',
      refund_reason: 'Accidentally placed duplicate order, requesting refund to GCash.',
      refund_account_name: 'Gabriela Silang',
      refund_account_number: '09228887766',
      refund_method: 'GCash',
      created_at: twoHoursAgo,
      updated_at: tenMinsAgo,
    }
  ];

  for (const ord of orders) {
    try {
      // If it exists, admin can update all fields
      await saveDoc('orders', ord.id, ord, admin.token);
    } catch {
      // If new, customer creates it then admin updates
      const initialOrder = { ...ord, status: 'pending' };
      await saveDoc('orders', ord.id, initialOrder, customer.token);
      if (ord.status !== 'pending' || ord.refund_status) {
        await saveDoc('orders', ord.id, ord, admin.token);
      }
    }
    console.log(`  ✓ Order #${ord.order_number} (${ord.customer_name} - ${ord.status}) saved.`);
  }

  // 4. Seed GCash Notification for 1-Click Verification Demo
  console.log('\n[4/5] Seeding GCash notification & support chat messages...');
  const notif = {
    type: 'gcash_payment',
    customer_name: 'Juan Dela Cruz',
    amount: 265,
    order_id: 'ord_1041',
    order_number: '1041',
    paid: false,
    reference_number: 'GCASH-89214710',
    created_at: now,
  };
  await saveDoc('notifications', 'notif_gcash_1041', notif, admin.token);
  console.log('  ✓ GCash payment notification for Order #1041 created.');

  // Support Chat Messages
  const messages = [
    {
      id: 'msg_01',
      conversation_id: customer.uid,
      sender_id: customer.uid,
      sender_name: 'Juan Dela Cruz',
      content: 'Magandang araw po! Ask ko lang kung freshly prepared po ba ang Lomi Jumbo?',
      read: true,
      created_at: twentyMinsAgo,
    },
    {
      id: 'msg_02',
      conversation_id: customer.uid,
      sender_id: admin.uid,
      sender_name: 'FoodFix Admin',
      content: 'Opo sir Juan! All ingredients and thick broth are freshly cooked upon order. Maraming salamat po!',
      read: true,
      created_at: tenMinsAgo,
    },
    {
      id: 'msg_03',
      conversation_id: customer.uid,
      sender_id: customer.uid,
      sender_name: 'Juan Dela Cruz',
      content: 'Salamat po! Looking forward to my order!',
      read: false,
      created_at: now,
    }
  ];

  for (const msg of messages) {
    const token = msg.sender_id === admin.uid ? admin.token : customer.token;
    try {
      await saveDoc('messages', msg.id, msg, token);
    } catch {
      // Message already created and protected by immutability rules
    }
  }
  console.log('  ✓ 3 Live customer support messages saved.');

  // 5. Seed Banners & Reviews
  console.log('\n[5/5] Seeding promotional banners and customer reviews...');
  const banners = [
    {
      id: 'banner_lamion',
      title: 'Lamion AI Culinary Assistant',
      description: 'Ask Lamion for instant authentic Filipino recipe tips, pairings, and nutritional guidance!',
      image_url: 'https://res.cloudinary.com/dafcyj6fh/image/upload/f_auto,q_auto/v1780092154/foodfix/menu/hyewnz5etyld2blpzyws.jpg',
      active: true,
      created_at: now,
    },
    {
      id: 'banner_bilao',
      title: 'Bilao Feast Specials',
      description: 'Fresh Bilao packages for team defense celebrations and gatherings!',
      image_url: 'https://res.cloudinary.com/dafcyj6fh/image/upload/f_auto,q_auto/v1780091869/foodfix/menu/aayvva12zhapytuvprdm.jpg',
      active: true,
      created_at: now,
    }
  ];

  for (const b of banners) {
    try {
      await saveDoc('banners', b.id, b, admin.token);
    } catch {
      // banner exists
    }
  }
  console.log('  ✓ Promotional banners saved.');

  const reviews = [
    {
      id: 'rev_01',
      user_id: customer.uid,
      user_name: 'Juan Dela Cruz',
      recipe_id: '5JlLjEciIyqKrxIHWGt5',
      recipe_title: 'Pares',
      rating: 5,
      comment: 'Sobrang sarap ng Pares! Malambot ang baka at malasa ang sabaw. Rekomendado ng Lamion AI!',
      created_at: now,
    },
    {
      id: 'rev_02',
      user_id: customer.uid,
      user_name: 'Maria Clara',
      recipe_id: 'HG2IB55PyrIKJQmADmYv',
      recipe_title: 'Lomi (Regular)',
      rating: 5,
      comment: 'Authentic Batangas style lomi. Siksik sa toppings!',
      created_at: now,
    }
  ];

  for (const r of reviews) {
    try {
      await saveDoc('reviews', r.id, r, customer.token);
    } catch {
      // review exists
    }
  }
  console.log('  ✓ 5-star customer reviews saved.');

  console.log('\n' + '═'.repeat(60));
  console.log('✨ POPULATION COMPLETE! All live defense data is active in Firestore.');
  console.log('═'.repeat(60));
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});
