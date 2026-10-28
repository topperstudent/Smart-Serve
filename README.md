# SmartServe — Scan. Order. Serve.

A full-stack, mobile-responsive restaurant ordering platform built for hackathons and modern dining venues.

SmartServe unites three essential restaurant experiences into **one connected application** backed by **Firebase Firestore**:
1. **Customer Ordering Website**: Contactless dining via table QR codes (`/menu?restaurant=...&table=...`), cart operations, trusted server-side price validation, and live real-time order tracking.
2. **Kitchen Order Display (KDS)**: Real-time ticket board with automated two-tone chime and spoken dish announcements via the browser `SpeechSynthesis` API.
3. **Restaurant Owner Dashboard**: Menu management, price updates, instant in-stock/sold-out toggles, table QR code generator with printable tent cards, and sales analytics.

---

## 🏗️ Project Architecture

```
/
├── firebase-applet-config.json    # Provisioned Firebase credentials
├── firebase-blueprint.json        # Formal data schema definition (IR)
├── firestore.rules                # ABAC zero-trust security rules
├── security_spec.md               # Security invariants & adversarial tests
├── package.json                   # Dependencies (React 19, Firebase 11, QRCode, Tailwind)
└── src/
    ├── types/
    │   └── index.ts               # Core TypeScript models (Restaurant, MenuItem, Order, Table)
    ├── firebase/
    │   └── config.ts              # Firebase initialization, connection verification & error handler
    ├── data/
    │   └── seedData.ts            # Realistic demo dataset for "The Spice Pavilion"
    ├── services/
    │   ├── restaurantService.ts   # CRUD operations, trusted price validation, Firestore listeners
    │   └── soundService.ts        # Web Audio chime + SpeechSynthesis alert with deduplication
    ├── components/
    │   ├── common/
    │   │   └── Navbar.tsx         # Role switcher, mute toggle, table selector, live indicators
    │   ├── customer/
    │   │   └── CustomerView.tsx   # Mobile-first QR menu, cart drawer, live status stepper
    │   ├── kitchen/
    │   │   └── KitchenView.tsx    # Live KDS terminal, status progression, voice alerts
    │   ├── owner/
    │   │   ├── OwnerView.tsx      # Analytics, menu CRUD, table manager, 1-click seed
    │   │   └── PrintableTableCard.tsx # High-resolution table stand QR card with print/download
    │   └── guide/
    │       └── HackathonGuide.tsx # Interactive test checklist & beginner-friendly walkthrough
    ├── App.tsx                    # Root coordinator handling query params and tab routing
    ├── index.css                  # Tailwind CSS styling
    └── main.tsx                   # React 19 root entry
```

---

## 🗄️ Database Model (Firestore Collections)

1. `/restaurants/{restaurantId}`
   - `id`, `ownerId`, `name`, `tagline`, `phone`, `address`, `currency`, `currencySymbol`, `taxRate`, `createdAt`
2. `/restaurants/{restaurantId}/menu_items/{itemId}`
   - `id`, `restaurantId`, `name`, `description`, `price`, `category`, `isVeg`, `isAvailable`, `imageUrl`
3. `/restaurants/{restaurantId}/tables/{tableId}`
   - `id`, `restaurantId`, `tableNumber`, `tableName`, `capacity`, `isActive`
4. `/restaurants/{restaurantId}/orders/{orderId}`
   - `id`, `restaurantId`, `tableId`, `tableNumber`, `items` (array), `subtotal`, `tax`, `total`, `specialInstructions`, `status` (`'new' | 'preparing' | 'ready' | 'served' | 'cancelled'`), `customerTrackingToken`, `createdAt`

---

## 🛡️ Trusted Server-Side Price Validation Guarantee

> **Crucial Rule:** Never trust a customer-provided price or table identifier.

When a customer clicks "Send Order to Kitchen":
1. `restaurantService.validateAndSubmitOrder(...)` receives only `{ itemId, quantity, specialInstructions }`.
2. It fetches the official, immutable menu items from the database.
3. It verifies that each requested dish is present and `isAvailable === true`.
4. It computes the subtotal using the official database price: `trustedPrice * quantity`.
5. It computes the tax rate and grand total on the backend.
6. Only verified values are written to Firestore.

---

## 🔊 Voice Alert Engine (SpeechSynthesis API)

- **Sound Chime**: Web Audio API generates a two-tone brass chime (D5 at 587Hz followed by A5 at 880Hz).
- **Spoken Text**: SpeechSynthesis announces: *"New order received. Table 5. Two masala dosas and one chai."*
- **Deduplication**: Newly initialized dashboards register existing orders so old tickets never replay.
- **Autoplay Handling**: A clear banner and pre-warmer unlock audio on the user's first tap.
- **Mute Control**: Persistent toggle allows muting anytime.

---

## 🧪 Interactive Test Checklist

- [x] **Owner Login**: Sign in with Google or use 1-click Demo Owner login.
- [x] **Seed Live Demo Data**: Click "Seed Live Demo Restaurant to Firestore" in Owner Overview.
- [x] **Menu CRUD**: Add/edit a dish or toggle its in-stock/sold-out status.
- [x] **Table QR Generation**: Open "Tables & QR Codes", click "Print Stand Card" to view printable tent card.
- [x] **Customer QR Ordering**: Switch to Customer Menu, select Table 2, add dishes to cart, write special instructions.
- [x] **Trusted Validation**: Submit order; observe verified total and unique `#ORD-xxxx` generation.
- [x] **Real-Time Kitchen Arrival**: Switch to Kitchen Display or watch side-by-side; order appears with glowing pulse.
- [x] **Voice Announcement**: Listen to the chime and spoken speech alert.
- [x] **Live Status Progression**: Kitchen clicks "Start Cooking" -> "Order Ready" -> "Delivered to Table". Customer tracker mirrors status live.
