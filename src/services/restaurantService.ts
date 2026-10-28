import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { Restaurant, MenuItem, RestaurantTable, Order, OrderStatus, OrderItem, OrderEditRecord } from '../types';
import {
  DEMO_RESTAURANT_ID,
  INITIAL_RESTAURANT,
  INITIAL_MENU_ITEMS,
  INITIAL_TABLES,
  INITIAL_ORDERS,
} from '../data/seedData';

// Persistent LocalStorage cache keys to prevent data loss across page refreshes or connection drops
const STORAGE_KEYS = {
  restaurant: (id: string) => `smartserve_rest_${id}`,
  menuItems: (id: string) => `smartserve_menu_${id}`,
  tables: (id: string) => `smartserve_tables_${id}`,
  orders: (id: string) => `smartserve_orders_${id}`,
  ownerRestaurantMap: 'smartserve_owner_rest_map',
};

// Helper for LocalStorage persistence
const persistentCache = {
  get<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage write notice:', e);
    }
  },
};

export const restaurantService = {
  // 1. Get Restaurant details by ID (Firestore primary + persistent fallback)
  async getRestaurant(restaurantId: string): Promise<Restaurant | null> {
    const path = `restaurants/${restaurantId}`;
    try {
      const snap = await getDoc(doc(db, 'restaurants', restaurantId));
      if (snap.exists()) {
        const data = snap.data() as Restaurant;
        persistentCache.set(STORAGE_KEYS.restaurant(restaurantId), data);
        return data;
      }

      // Check persistent cache
      const cached = persistentCache.get<Restaurant>(STORAGE_KEYS.restaurant(restaurantId));
      if (cached) return cached;

      // Seed demo restaurant if requested
      if (restaurantId === DEMO_RESTAURANT_ID) {
        await this.seedFirestoreDemoData('demo-owner-123', DEMO_RESTAURANT_ID);
        return { ...INITIAL_RESTAURANT };
      }

      return null;
    } catch (err) {
      console.warn('Firestore getDoc notice, checking persistent cache:', err);
      const cached = persistentCache.get<Restaurant>(STORAGE_KEYS.restaurant(restaurantId));
      if (cached) return cached;
      if (restaurantId === DEMO_RESTAURANT_ID) return { ...INITIAL_RESTAURANT };
      return null;
    }
  },

  // 2. Get Restaurant by Owner UID (Deterministic Stable ID + Query + Cache)
  async getRestaurantByOwnerId(ownerId: string): Promise<Restaurant | null> {
    // 2a. Check stable deterministic ID first
    const stableId = `rest-${ownerId.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24)}`;
    try {
      const directSnap = await getDoc(doc(db, 'restaurants', stableId));
      if (directSnap.exists()) {
        const rest = directSnap.data() as Restaurant;
        persistentCache.set(STORAGE_KEYS.restaurant(rest.id), rest);
        return rest;
      }
    } catch (e) {
      console.warn('Direct stable ID check notice:', e);
    }

    // 2b. Check via ownerId query
    try {
      const q = query(collection(db, 'restaurants'), where('ownerId', '==', ownerId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const rest = snap.docs[0].data() as Restaurant;
        persistentCache.set(STORAGE_KEYS.restaurant(rest.id), rest);
        return rest;
      }
    } catch (err) {
      console.warn('Error querying restaurants by ownerId:', err);
    }

    // 2c. Check cached mapping in localStorage
    const ownerMap = persistentCache.get<{ [ownerId: string]: string }>(STORAGE_KEYS.ownerRestaurantMap) || {};
    const mappedRestId = ownerMap[ownerId];
    if (mappedRestId) {
      const cached = persistentCache.get<Restaurant>(STORAGE_KEYS.restaurant(mappedRestId));
      if (cached) return cached;
    }

    return null;
  },

  // 3. Create or Link Restaurant for Authenticated Owner (NEVER OVERWRITES EXISTING DATA)
  async createRestaurantForOwner(params: {
    ownerId: string;
    ownerName: string;
    restaurantName: string;
    phone?: string;
    address?: string;
  }): Promise<Restaurant> {
    // Check if one already exists first
    const existing = await this.getRestaurantByOwnerId(params.ownerId);
    if (existing) {
      return existing;
    }

    const restaurantId = `rest-${params.ownerId.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24)}`;
    const newRestaurant: Restaurant = {
      id: restaurantId,
      ownerId: params.ownerId,
      name: params.restaurantName.trim(),
      tagline: 'Scan. Order. Serve.',
      phone: params.phone || '+91 98230 45678',
      address: params.address || 'MG Road, Connaught Place, New Delhi',
      currency: 'INR',
      currencySymbol: '₹',
      taxRate: 5.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Cache locally immediately
    persistentCache.set(STORAGE_KEYS.restaurant(restaurantId), newRestaurant);
    const ownerMap = persistentCache.get<{ [ownerId: string]: string }>(STORAGE_KEYS.ownerRestaurantMap) || {};
    ownerMap[params.ownerId] = restaurantId;
    persistentCache.set(STORAGE_KEYS.ownerRestaurantMap, ownerMap);

    // Persist to Firestore
    try {
      await setDoc(doc(db, 'restaurants', restaurantId), newRestaurant);
      await setDoc(doc(db, 'users', params.ownerId), {
        uid: params.ownerId,
        displayName: params.ownerName,
        restaurantId,
        createdAt: new Date().toISOString(),
      });

      // Seed initial starter tables & menu items into Firestore so new owners have working QR codes
      await this.seedInitialRestaurantData(restaurantId);
    } catch (err) {
      console.warn('Firestore write notice during restaurant setup:', err);
    }

    return newRestaurant;
  },

  // Seed default starter tables & dishes for a new restaurant
  async seedInitialRestaurantData(restaurantId: string): Promise<void> {
    const starterTables: RestaurantTable[] = [
      { id: 't1', restaurantId, tableNumber: '1', tableName: 'Table 1 (Main Hall)', capacity: 4, isActive: true },
      { id: 't2', restaurantId, tableNumber: '2', tableName: 'Table 2 (Window Booth)', capacity: 4, isActive: true },
      { id: 't3', restaurantId, tableNumber: '3', tableName: 'Table 3 (Patio Corner)', capacity: 6, isActive: true },
      { id: 't4', restaurantId, tableNumber: '4', tableName: 'Table 4 (Family Table)', capacity: 8, isActive: true },
    ];

    const starterItems: MenuItem[] = INITIAL_MENU_ITEMS.map((item) => ({
      ...item,
      restaurantId,
    }));

    persistentCache.set(STORAGE_KEYS.tables(restaurantId), starterTables);
    persistentCache.set(STORAGE_KEYS.menuItems(restaurantId), starterItems);

    for (const tbl of starterTables) {
      try {
        await setDoc(doc(db, 'restaurants', restaurantId, 'tables', tbl.id), tbl);
      } catch (e) {
        console.warn('Seed table notice:', e);
      }
    }

    for (const item of starterItems) {
      try {
        await setDoc(doc(db, 'restaurants', restaurantId, 'menu_items', item.id), item);
      } catch (e) {
        console.warn('Seed item notice:', e);
      }
    }
  },

  // 4. Update Restaurant Profile (flexible signature)
  async updateRestaurant(
    idOrRest: string | Restaurant,
    maybeUpdates?: Partial<Restaurant>
  ): Promise<void> {
    const restaurantId = typeof idOrRest === 'string' ? idOrRest : idOrRest.id;
    const updates = typeof idOrRest === 'string' ? (maybeUpdates || {}) : idOrRest;

    const current = await this.getRestaurant(restaurantId);
    const updated: Restaurant = {
      ...(current || {}),
      ...updates,
      id: restaurantId,
      updatedAt: new Date().toISOString(),
    } as Restaurant;

    persistentCache.set(STORAGE_KEYS.restaurant(restaurantId), updated);
    try {
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `restaurants/${restaurantId}`);
    }
  },

  // 5. Get Menu Items (Strict Firestore fetch with cached fallback)
  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    try {
      const snap = await getDocs(collection(db, 'restaurants', restaurantId, 'menu_items'));
      if (!snap.empty) {
        const items = snap.docs.map((d) => d.data() as MenuItem);
        persistentCache.set(STORAGE_KEYS.menuItems(restaurantId), items);
        return items;
      }

      // If empty in Firestore, check cache
      const cached = persistentCache.get<MenuItem[]>(STORAGE_KEYS.menuItems(restaurantId));
      if (cached && cached.length > 0) return cached;

      // If demo restaurant, seed and return
      if (restaurantId === DEMO_RESTAURANT_ID) {
        const seeded = INITIAL_MENU_ITEMS.map((i) => ({ ...i, restaurantId }));
        for (const item of seeded) {
          try {
            await setDoc(doc(db, 'restaurants', restaurantId, 'menu_items', item.id), item);
          } catch {}
        }
        persistentCache.set(STORAGE_KEYS.menuItems(restaurantId), seeded);
        return seeded;
      }

      return [];
    } catch (err) {
      console.warn('Firestore getMenuItems notice, using cache:', err);
      const cached = persistentCache.get<MenuItem[]>(STORAGE_KEYS.menuItems(restaurantId));
      if (cached && cached.length > 0) return cached;
      return INITIAL_MENU_ITEMS.map((i) => ({ ...i, restaurantId }));
    }
  },

  // 6. Save (Create or Update) Menu Item
  async saveMenuItem(restaurantId: string, item: MenuItem): Promise<void> {
    const items = persistentCache.get<MenuItem[]>(STORAGE_KEYS.menuItems(restaurantId)) || [];
    const idx = items.findIndex((m) => m.id === item.id);
    const updatedItem = {
      ...item,
      restaurantId,
      updatedAt: new Date().toISOString(),
    };

    if (idx >= 0) {
      items[idx] = updatedItem;
    } else {
      items.push(updatedItem);
    }
    persistentCache.set(STORAGE_KEYS.menuItems(restaurantId), items);

    try {
      await setDoc(doc(db, 'restaurants', restaurantId, 'menu_items', item.id), updatedItem);
    } catch (err) {
      console.warn('Firestore setDoc notice for menuItem:', err);
    }
  },

  // 7. Delete Menu Item
  async deleteMenuItem(restaurantId: string, itemId: string): Promise<void> {
    const items = (persistentCache.get<MenuItem[]>(STORAGE_KEYS.menuItems(restaurantId)) || []).filter(
      (m) => m.id !== itemId
    );
    persistentCache.set(STORAGE_KEYS.menuItems(restaurantId), items);

    try {
      await deleteDoc(doc(db, 'restaurants', restaurantId, 'menu_items', itemId));
    } catch (err) {
      console.warn('Firestore deleteDoc notice for menuItem:', err);
    }
  },

  // 8. Get Dining Tables (Strict Firestore fetch with cached fallback)
  async getTables(restaurantId: string): Promise<RestaurantTable[]> {
    try {
      const snap = await getDocs(collection(db, 'restaurants', restaurantId, 'tables'));
      if (!snap.empty) {
        const tbls = snap.docs.map((d) => d.data() as RestaurantTable);
        persistentCache.set(STORAGE_KEYS.tables(restaurantId), tbls);
        return tbls;
      }

      const cached = persistentCache.get<RestaurantTable[]>(STORAGE_KEYS.tables(restaurantId));
      if (cached && cached.length > 0) return cached;

      // Seed starter tables if none exist
      const starterTables: RestaurantTable[] = [
        { id: 't1', restaurantId, tableNumber: '1', tableName: 'Table 1 (Main Hall)', capacity: 4, isActive: true },
        { id: 't2', restaurantId, tableNumber: '2', tableName: 'Table 2 (Window Booth)', capacity: 4, isActive: true },
        { id: 't3', restaurantId, tableNumber: '3', tableName: 'Table 3 (Patio Corner)', capacity: 6, isActive: true },
        { id: 't4', restaurantId, tableNumber: '4', tableName: 'Table 4 (Family Table)', capacity: 8, isActive: true },
      ];

      for (const t of starterTables) {
        try {
          await setDoc(doc(db, 'restaurants', restaurantId, 'tables', t.id), t);
        } catch {}
      }
      persistentCache.set(STORAGE_KEYS.tables(restaurantId), starterTables);
      return starterTables;
    } catch (err) {
      console.warn('Firestore getTables notice, using cache:', err);
      const cached = persistentCache.get<RestaurantTable[]>(STORAGE_KEYS.tables(restaurantId));
      if (cached && cached.length > 0) return cached;
      return INITIAL_TABLES.map((t) => ({ ...t, restaurantId }));
    }
  },

  // 9. Save Dining Table
  async saveTable(restaurantId: string, table: RestaurantTable): Promise<void> {
    const tbls = persistentCache.get<RestaurantTable[]>(STORAGE_KEYS.tables(restaurantId)) || [];
    const idx = tbls.findIndex((t) => t.id === table.id);
    const updatedTable = { ...table, restaurantId };

    if (idx >= 0) {
      tbls[idx] = updatedTable;
    } else {
      tbls.push(updatedTable);
    }
    persistentCache.set(STORAGE_KEYS.tables(restaurantId), tbls);

    try {
      await setDoc(doc(db, 'restaurants', restaurantId, 'tables', table.id), updatedTable);
    } catch (err) {
      console.warn('Firestore setDoc notice for table:', err);
    }
  },

  // 10. Delete Dining Table
  async deleteTable(restaurantId: string, tableId: string): Promise<void> {
    const tbls = (persistentCache.get<RestaurantTable[]>(STORAGE_KEYS.tables(restaurantId)) || []).filter(
      (t) => t.id !== tableId
    );
    persistentCache.set(STORAGE_KEYS.tables(restaurantId), tbls);

    try {
      await deleteDoc(doc(db, 'restaurants', restaurantId, 'tables', tableId));
    } catch (err) {
      console.warn('Firestore deleteDoc notice for table:', err);
    }
  },

  // 11. Subscribe to Real-Time Orders for Orders Dashboard & Kitchen
  subscribeOrders(restaurantId: string, callback: (orders: Order[]) => void): Unsubscribe {
    let unsubscribeFirestore: Unsubscribe | null = null;

    try {
      const q = query(collection(db, 'restaurants', restaurantId, 'orders'), orderBy('createdAt', 'desc'));
      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveOrders = snapshot.docs.map((d) => d.data() as Order);
            persistentCache.set(STORAGE_KEYS.orders(restaurantId), liveOrders);
            callback(liveOrders);
          } else {
            const cached = persistentCache.get<Order[]>(STORAGE_KEYS.orders(restaurantId)) || [];
            callback(cached);
          }
        },
        (error) => {
          console.warn('Firestore snapshot notice on orders, serving cache:', error.message);
          const cached = persistentCache.get<Order[]>(STORAGE_KEYS.orders(restaurantId)) || [];
          callback(cached);
        }
      );
    } catch (err) {
      console.warn('Could not attach Firestore onSnapshot, using local cache:', err);
      const cached = persistentCache.get<Order[]>(STORAGE_KEYS.orders(restaurantId)) || [];
      callback(cached);
    }

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  },

  // 12. Subscribe to Single Order Status for Customer Tracking
  subscribeCustomerOrder(restaurantId: string, orderId: string, callback: (order: Order | null) => void): Unsubscribe {
    let unsubFirestore: Unsubscribe | null = null;

    try {
      unsubFirestore = onSnapshot(
        doc(db, 'restaurants', restaurantId, 'orders', orderId),
        (snap) => {
          if (snap.exists()) {
            callback(snap.data() as Order);
          } else {
            const list = persistentCache.get<Order[]>(STORAGE_KEYS.orders(restaurantId)) || [];
            callback(list.find((o) => o.id === orderId) || null);
          }
        },
        (err) => {
          console.warn('Single order snapshot notice:', err);
          const list = persistentCache.get<Order[]>(STORAGE_KEYS.orders(restaurantId)) || [];
          callback(list.find((o) => o.id === orderId) || null);
        }
      );
    } catch (err) {
      const list = persistentCache.get<Order[]>(STORAGE_KEYS.orders(restaurantId)) || [];
      callback(list.find((o) => o.id === orderId) || null);
    }

    return () => {
      if (unsubFirestore) unsubFirestore();
    };
  },

  // 13. Validate and Submit Customer Order (Server-Side Price Integrity)
  async validateAndSubmitOrder(params: {
    restaurantId: string;
    tableId: string;
    cart: { itemId: string; quantity: number; specialInstructions?: string }[];
    customerNotes?: string;
  }): Promise<Order> {
    const { restaurantId, tableId, cart, customerNotes } = params;

    if (!cart || cart.length === 0) {
      throw new Error('Cart cannot be empty.');
    }

    const restaurant = await this.getRestaurant(restaurantId);
    if (!restaurant) {
      throw new Error(`Invalid restaurant identifier: ${restaurantId}`);
    }

    const tables = await this.getTables(restaurantId);
    const validTable = tables.find((t) => (t.id === tableId || t.tableNumber === tableId) && t.isActive);
    if (!validTable) {
      throw new Error(`Invalid or inactive dining table identifier: ${tableId}`);
    }

    const menuItems = await this.getMenuItems(restaurantId);
    const verifiedOrderItems: OrderItem[] = [];
    let calculatedSubtotal = 0;

    for (const item of cart) {
      if (item.quantity <= 0 || item.quantity > 50) {
        throw new Error(`Invalid item quantity: ${item.quantity}`);
      }
      const officialItem = menuItems.find((m) => m.id === item.itemId);
      if (!officialItem) {
        throw new Error(`Menu item not found in restaurant catalog: ${item.itemId}`);
      }
      if (!officialItem.isAvailable) {
        throw new Error(`Sorry, "${officialItem.name}" is currently marked out of stock by the kitchen.`);
      }

      const trustedPrice = officialItem.price;
      const lineTotal = trustedPrice * item.quantity;
      calculatedSubtotal += lineTotal;

      verifiedOrderItems.push({
        itemId: officialItem.id,
        name: officialItem.name,
        price: trustedPrice,
        quantity: item.quantity,
        isVeg: officialItem.isVeg,
        specialInstructions: item.specialInstructions || '',
      });
    }

    const taxRate = restaurant.taxRate || 0;
    const calculatedTax = Math.round((calculatedSubtotal * (taxRate / 100)) * 100) / 100;
    const grandTotal = Math.round((calculatedSubtotal + calculatedTax) * 100) / 100;

    const uniqueOrderNumber = Math.floor(1000 + Math.random() * 9000);
    const orderId = `ORD-${uniqueOrderNumber}`;
    const customerTrackingToken = `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newOrder: Order = {
      id: orderId,
      restaurantId,
      tableId: validTable.id,
      tableNumber: validTable.tableNumber,
      items: verifiedOrderItems,
      subtotal: Math.round(calculatedSubtotal * 100) / 100,
      tax: calculatedTax,
      total: grandTotal,
      specialInstructions: customerNotes ? customerNotes.slice(0, 500) : '',
      status: 'new',
      customerTrackingToken,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update local cache
    const currentOrders = persistentCache.get<Order[]>(STORAGE_KEYS.orders(restaurantId)) || [];
    currentOrders.unshift(newOrder);
    persistentCache.set(STORAGE_KEYS.orders(restaurantId), currentOrders);

    // Write to Firestore
    try {
      await setDoc(doc(db, 'restaurants', restaurantId, 'orders', orderId), newOrder);
    } catch (err) {
      console.warn('Firestore setDoc notice for order:', err);
    }

    return newOrder;
  },

  // 14. Update Order Status (New -> Preparing -> Ready -> Served)
  async updateOrderStatus(restaurantId: string, orderId: string, status: OrderStatus): Promise<void> {
    const list = persistentCache.get<Order[]>(STORAGE_KEYS.orders(restaurantId)) || [];
    const idx = list.findIndex((o) => o.id === orderId);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        status,
        updatedAt: new Date().toISOString(),
      };
      persistentCache.set(STORAGE_KEYS.orders(restaurantId), list);
    }

    try {
      await updateDoc(doc(db, 'restaurants', restaurantId, 'orders', orderId), {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Firestore updateDoc notice for order status:', err);
    }
  },

  // 15. Cancel Order with Audit Reason
  async cancelOrder(params: {
    restaurantId: string;
    orderId: string;
    cancellationReason: string;
    cancelledBy: string;
  }): Promise<void> {
    const { restaurantId, orderId, cancellationReason, cancelledBy } = params;
    const list = persistentCache.get<Order[]>(STORAGE_KEYS.orders(restaurantId)) || [];
    const idx = list.findIndex((o) => o.id === orderId);
    const now = new Date().toISOString();

    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        status: 'cancelled',
        cancellationReason: cancellationReason || 'Cancelled by staff',
        cancelledAt: now,
        cancelledBy,
        updatedAt: now,
      };
      persistentCache.set(STORAGE_KEYS.orders(restaurantId), list);
    }

    try {
      await updateDoc(doc(db, 'restaurants', restaurantId, 'orders', orderId), {
        status: 'cancelled',
        cancellationReason: cancellationReason || 'Cancelled by staff',
        cancelledAt: now,
        cancelledBy,
        updatedAt: now,
      });
    } catch (err) {
      console.warn('Firestore updateDoc notice for order cancellation:', err);
    }
  },

  // 16. Edit Order Items / Quantities
  async editOrder(params: {
    restaurantId: string;
    orderId: string;
    updatedItems: OrderItem[];
    editNote: string;
  }): Promise<void> {
    const { restaurantId, orderId, updatedItems, editNote } = params;
    const list = persistentCache.get<Order[]>(STORAGE_KEYS.orders(restaurantId)) || [];
    const idx = list.findIndex((o) => o.id === orderId);
    if (idx < 0) throw new Error('Order not found');

    const originalOrder = list[idx];
    const restaurant = await this.getRestaurant(restaurantId);
    const taxRate = restaurant?.taxRate || 5.0;

    const newSubtotal = updatedItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
    const newTax = Math.round((newSubtotal * (taxRate / 100)) * 100) / 100;
    const newTotal = Math.round((newSubtotal + newTax) * 100) / 100;

    const editRecord: OrderEditRecord = {
      timestamp: new Date().toISOString(),
      note: editNote,
      previousTotal: originalOrder.total,
      newTotal,
    };

    const history = [...(originalOrder.editHistory || []), editRecord];

    const updatedOrder: Order = {
      ...originalOrder,
      items: updatedItems,
      subtotal: Math.round(newSubtotal * 100) / 100,
      tax: newTax,
      total: newTotal,
      editHistory: history,
      updatedAt: new Date().toISOString(),
    };

    list[idx] = updatedOrder;
    persistentCache.set(STORAGE_KEYS.orders(restaurantId), list);

    try {
      await updateDoc(doc(db, 'restaurants', restaurantId, 'orders', orderId), {
        items: updatedItems,
        subtotal: updatedOrder.subtotal,
        tax: updatedOrder.tax,
        total: updatedOrder.total,
        editHistory: history,
        updatedAt: updatedOrder.updatedAt,
      });
    } catch (err) {
      console.warn('Firestore updateDoc notice for order edit:', err);
    }
  },

  // 17. Backup & Export Restaurant Data to JSON
  async exportRestaurantData(restaurantId: string): Promise<string> {
    const [restaurant, menuItems, tables, orders] = await Promise.all([
      this.getRestaurant(restaurantId),
      this.getMenuItems(restaurantId),
      this.getTables(restaurantId),
      new Promise<Order[]>((resolve) => {
        const unsub = this.subscribeOrders(restaurantId, (liveOrders) => {
          unsub();
          resolve(liveOrders);
        });
      }),
    ]);

    const backupPayload = {
      exportDate: new Date().toISOString(),
      restaurant,
      menuItems,
      tables,
      orders,
    };

    return JSON.stringify(backupPayload, null, 2);
  },

  // 18. Seed Demo Data in Firestore if requested
  async seedFirestoreDemoData(ownerId: string, targetRestaurantId = DEMO_RESTAURANT_ID): Promise<void> {
    const restaurant: Restaurant = {
      ...INITIAL_RESTAURANT,
      id: targetRestaurantId,
      ownerId,
    };

    persistentCache.set(STORAGE_KEYS.restaurant(targetRestaurantId), restaurant);
    try {
      await setDoc(doc(db, 'restaurants', targetRestaurantId), restaurant);
    } catch (e) {
      console.warn('Seed demo restaurant notice:', e);
    }

    const demoTables = INITIAL_TABLES.map((t) => ({ ...t, restaurantId: targetRestaurantId }));
    persistentCache.set(STORAGE_KEYS.tables(targetRestaurantId), demoTables);
    for (const t of demoTables) {
      try {
        await setDoc(doc(db, 'restaurants', targetRestaurantId, 'tables', t.id), t);
      } catch {}
    }

    const demoItems = INITIAL_MENU_ITEMS.map((i) => ({ ...i, restaurantId: targetRestaurantId }));
    persistentCache.set(STORAGE_KEYS.menuItems(targetRestaurantId), demoItems);
    for (const item of demoItems) {
      try {
        await setDoc(doc(db, 'restaurants', targetRestaurantId, 'menu_items', item.id), item);
      } catch {}
    }

    const demoOrders = INITIAL_ORDERS.map((o) => ({ ...o, restaurantId: targetRestaurantId }));
    persistentCache.set(STORAGE_KEYS.orders(targetRestaurantId), demoOrders);
    for (const ord of demoOrders) {
      try {
        await setDoc(doc(db, 'restaurants', targetRestaurantId, 'orders', ord.id), ord);
      } catch {}
    }
  },

  // 19. Complete Data Reset & Clean Slate
  async resetRestaurantData(restaurantId: string): Promise<void> {
    // 19a. Clear orders in cache and Firestore
    persistentCache.set(STORAGE_KEYS.orders(restaurantId), []);
    try {
      const ordersSnap = await getDocs(collection(db, 'restaurants', restaurantId, 'orders'));
      const batchPromises = ordersSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(batchPromises);
    } catch (e) {
      console.warn('Error clearing Firestore orders during reset:', e);
    }

    // 19b. Re-seed clean standard tables
    await this.seedInitialRestaurantData(restaurantId);
  },

  // 20. Clear all local storage sessions and cache
  clearAllLocalSessionsAndData(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('smartserve_') || key.startsWith('firebase:'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Error clearing localStorage:', e);
    }
  },
};

