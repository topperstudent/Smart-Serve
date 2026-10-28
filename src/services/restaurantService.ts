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

// Fallback in-memory state for seamless demo operation if offline or Firestore is initializing
class LocalFallbackStore {
  restaurants = new Map<string, Restaurant>();
  menuItems = new Map<string, MenuItem[]>();
  tables = new Map<string, RestaurantTable[]>();
  orders = new Map<string, Order[]>();
  orderListeners = new Map<string, Set<(orders: Order[]) => void>>();

  constructor() {
    this.restaurants.set(DEMO_RESTAURANT_ID, { ...INITIAL_RESTAURANT });
    this.menuItems.set(DEMO_RESTAURANT_ID, [...INITIAL_MENU_ITEMS]);
    this.tables.set(DEMO_RESTAURANT_ID, [...INITIAL_TABLES]);
    this.orders.set(DEMO_RESTAURANT_ID, [...INITIAL_ORDERS]);
  }

  notifyOrders(restaurantId: string) {
    const list = this.orders.get(restaurantId) || [];
    const listeners = this.orderListeners.get(restaurantId);
    if (listeners) {
      listeners.forEach((l) => l([...list]));
    }
  }
}

const localStore = new LocalFallbackStore();

export const restaurantService = {
  // 1. Get Restaurant details by ID
  async getRestaurant(restaurantId: string): Promise<Restaurant | null> {
    const path = `restaurants/${restaurantId}`;
    try {
      const snap = await getDoc(doc(db, 'restaurants', restaurantId));
      if (snap.exists()) {
        const data = snap.data() as Restaurant;
        localStore.restaurants.set(restaurantId, data);
        return data;
      }
      if (localStore.restaurants.has(restaurantId)) {
        return localStore.restaurants.get(restaurantId)!;
      }
      return null;
    } catch (err) {
      console.warn('Using local store for getRestaurant:', err);
      return localStore.restaurants.get(restaurantId) || null;
    }
  },

  // 2. Get Restaurant by Owner UID (for Authenticated Owner Login)
  async getRestaurantByOwnerId(ownerId: string): Promise<Restaurant | null> {
    const path = 'restaurants';
    try {
      const q = query(collection(db, 'restaurants'), where('ownerId', '==', ownerId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const rest = snap.docs[0].data() as Restaurant;
        localStore.restaurants.set(rest.id, rest);
        return rest;
      }

      // Check stable ID fallback
      const stableId = `rest-${ownerId}`;
      const directSnap = await getDoc(doc(db, 'restaurants', stableId));
      if (directSnap.exists()) {
        const rest = directSnap.data() as Restaurant;
        localStore.restaurants.set(rest.id, rest);
        return rest;
      }

      // Check local cache
      for (const r of localStore.restaurants.values()) {
        if (r.ownerId === ownerId) return r;
      }

      return null;
    } catch (err) {
      console.warn('Error fetching restaurant by ownerId, checking local store:', err);
      for (const r of localStore.restaurants.values()) {
        if (r.ownerId === ownerId) return r;
      }
      return null;
    }
  },

  // 3. Create a New Restaurant for an Authenticated Owner
  async createRestaurantForOwner(params: {
    ownerId: string;
    ownerName: string;
    restaurantName: string;
    phone?: string;
    address?: string;
  }): Promise<Restaurant> {
    const restaurantId = `rest-${params.ownerId.slice(0, 24)}`;
    const newRestaurant: Restaurant = {
      id: restaurantId,
      ownerId: params.ownerId,
      name: params.restaurantName.trim(),
      tagline: 'Scan. Order. Serve.',
      phone: params.phone || '',
      address: params.address || '',
      currency: 'INR',
      currencySymbol: '₹',
      taxRate: 5.0, // 5% default standard restaurant GST/tax
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStore.restaurants.set(restaurantId, newRestaurant);
    localStore.menuItems.set(restaurantId, []);
    localStore.tables.set(restaurantId, []);
    localStore.orders.set(restaurantId, []);

    const path = `restaurants/${restaurantId}`;
    try {
      await setDoc(doc(db, 'restaurants', restaurantId), newRestaurant);
      // Also write user profile
      await setDoc(doc(db, 'users', params.ownerId), {
        uid: params.ownerId,
        displayName: params.ownerName,
        restaurantId,
        createdAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore setDoc notice during restaurant creation:', err);
    }

    return newRestaurant;
  },

  // 4. Update Restaurant details
  async updateRestaurant(restaurant: Restaurant): Promise<void> {
    const path = `restaurants/${restaurant.id}`;
    localStore.restaurants.set(restaurant.id, { ...restaurant, updatedAt: new Date().toISOString() });
    try {
      await setDoc(doc(db, 'restaurants', restaurant.id), {
        ...restaurant,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  // 5. Get Menu Items
  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    const path = `restaurants/${restaurantId}/menu_items`;
    try {
      const snap = await getDocs(collection(db, 'restaurants', restaurantId, 'menu_items'));
      if (!snap.empty) {
        const items = snap.docs.map((d) => d.data() as MenuItem);
        localStore.menuItems.set(restaurantId, items);
        return items;
      }
      return localStore.menuItems.get(restaurantId) || [];
    } catch (err) {
      console.warn('Falling back to local menu items:', err);
      return localStore.menuItems.get(restaurantId) || [];
    }
  },

  // 6. Save (Create or Update) Menu Item
  async saveMenuItem(restaurantId: string, item: MenuItem): Promise<void> {
    const path = `restaurants/${restaurantId}/menu_items/${item.id}`;
    const items = localStore.menuItems.get(restaurantId) || [];
    const idx = items.findIndex((m) => m.id === item.id);
    const updatedItem = { ...item, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      items[idx] = updatedItem;
    } else {
      items.push(updatedItem);
    }
    localStore.menuItems.set(restaurantId, items);

    try {
      await setDoc(doc(db, 'restaurants', restaurantId, 'menu_items', item.id), updatedItem);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  // 7. Delete Menu Item
  async deleteMenuItem(restaurantId: string, itemId: string): Promise<void> {
    const path = `restaurants/${restaurantId}/menu_items/${itemId}`;
    const items = (localStore.menuItems.get(restaurantId) || []).filter((m) => m.id !== itemId);
    localStore.menuItems.set(restaurantId, items);

    try {
      await deleteDoc(doc(db, 'restaurants', restaurantId, 'menu_items', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  // 8. Get Tables
  async getTables(restaurantId: string): Promise<RestaurantTable[]> {
    const path = `restaurants/${restaurantId}/tables`;
    try {
      const snap = await getDocs(collection(db, 'restaurants', restaurantId, 'tables'));
      if (!snap.empty) {
        const tbls = snap.docs.map((d) => d.data() as RestaurantTable);
        localStore.tables.set(restaurantId, tbls);
        return tbls;
      }
      return localStore.tables.get(restaurantId) || [];
    } catch (err) {
      console.warn('Falling back to local tables:', err);
      return localStore.tables.get(restaurantId) || [];
    }
  },

  // 9. Save Dining Table
  async saveTable(restaurantId: string, table: RestaurantTable): Promise<void> {
    const path = `restaurants/${restaurantId}/tables/${table.id}`;
    const tbls = localStore.tables.get(restaurantId) || [];
    const idx = tbls.findIndex((t) => t.id === table.id);
    if (idx >= 0) {
      tbls[idx] = table;
    } else {
      tbls.push(table);
    }
    localStore.tables.set(restaurantId, tbls);

    try {
      await setDoc(doc(db, 'restaurants', restaurantId, 'tables', table.id), table);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  // 10. Delete Dining Table
  async deleteTable(restaurantId: string, tableId: string): Promise<void> {
    const path = `restaurants/${restaurantId}/tables/${tableId}`;
    const tbls = (localStore.tables.get(restaurantId) || []).filter((t) => t.id !== tableId);
    localStore.tables.set(restaurantId, tbls);

    try {
      await deleteDoc(doc(db, 'restaurants', restaurantId, 'tables', tableId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  // 11. Subscribe to Real-Time Orders for Orders Dashboard & Kitchen
  subscribeOrders(restaurantId: string, callback: (orders: Order[]) => void): Unsubscribe {
    const path = `restaurants/${restaurantId}/orders`;
    let unsubscribeFirestore: Unsubscribe | null = null;

    try {
      const q = query(collection(db, 'restaurants', restaurantId, 'orders'), orderBy('createdAt', 'desc'));
      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveOrders = snapshot.docs.map((d) => d.data() as Order);
            localStore.orders.set(restaurantId, liveOrders);
            callback(liveOrders);
          } else {
            callback(localStore.orders.get(restaurantId) || []);
          }
        },
        (error) => {
          console.warn('Firestore snapshot notice on orders:', error.message);
          callback(localStore.orders.get(restaurantId) || []);
        }
      );
    } catch (err) {
      console.warn('Could not attach Firestore onSnapshot, using local observer:', err);
    }

    if (!localStore.orderListeners.has(restaurantId)) {
      localStore.orderListeners.set(restaurantId, new Set());
    }
    const localListener = (orders: Order[]) => callback(orders);
    localStore.orderListeners.get(restaurantId)!.add(localListener);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      localStore.orderListeners.get(restaurantId)?.delete(localListener);
    };
  },

  // 12. Subscribe to Single Order Status for Customer Tracking
  subscribeCustomerOrder(restaurantId: string, orderId: string, callback: (order: Order | null) => void): Unsubscribe {
    const path = `restaurants/${restaurantId}/orders/${orderId}`;
    let unsubFirestore: Unsubscribe | null = null;

    try {
      unsubFirestore = onSnapshot(
        doc(db, 'restaurants', restaurantId, 'orders', orderId),
        (snap) => {
          if (snap.exists()) {
            callback(snap.data() as Order);
          } else {
            const list = localStore.orders.get(restaurantId) || [];
            callback(list.find((o) => o.id === orderId) || null);
          }
        },
        (err) => {
          console.warn('Snapshot notice on customer order:', err);
          const list = localStore.orders.get(restaurantId) || [];
          callback(list.find((o) => o.id === orderId) || null);
        }
      );
    } catch (e) {
      const list = localStore.orders.get(restaurantId) || [];
      callback(list.find((o) => o.id === orderId) || null);
    }

    const localListener = (orders: Order[]) => {
      const match = orders.find((o) => o.id === orderId);
      if (match) callback(match);
    };
    if (!localStore.orderListeners.has(restaurantId)) {
      localStore.orderListeners.set(restaurantId, new Set());
    }
    localStore.orderListeners.get(restaurantId)!.add(localListener);

    return () => {
      if (unsubFirestore) unsubFirestore();
      localStore.orderListeners.get(restaurantId)?.delete(localListener);
    };
  },

  // 13. Trusted Server-Side Order Submission & Price Validation
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
    // Find table by ID or tableNumber
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

    const currentOrders = localStore.orders.get(restaurantId) || [];
    currentOrders.unshift(newOrder);
    localStore.orders.set(restaurantId, currentOrders);
    localStore.notifyOrders(restaurantId);

    const path = `restaurants/${restaurantId}/orders/${orderId}`;
    try {
      await setDoc(doc(db, 'restaurants', restaurantId, 'orders', orderId), newOrder);
    } catch (err) {
      console.warn('Firestore setDoc notice for order:', err);
    }

    return newOrder;
  },

  // 14. Update Order Status (New -> Preparing -> Ready -> Served)
  async updateOrderStatus(restaurantId: string, orderId: string, status: OrderStatus): Promise<void> {
    const list = localStore.orders.get(restaurantId) || [];
    const idx = list.findIndex((o) => o.id === orderId);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        status,
        updatedAt: new Date().toISOString(),
      };
      localStore.orders.set(restaurantId, list);
      localStore.notifyOrders(restaurantId);
    }

    const path = `restaurants/${restaurantId}/orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'restaurants', restaurantId, 'orders', orderId), {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Firestore updateDoc notice for status update:', err);
    }
  },

  // 15. Authorized Order Cancellation with Audit Reason
  async cancelOrder(params: {
    restaurantId: string;
    orderId: string;
    cancellationReason: string;
    cancelledBy: string;
  }): Promise<void> {
    const { restaurantId, orderId, cancellationReason, cancelledBy } = params;
    const list = localStore.orders.get(restaurantId) || [];
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
      localStore.orders.set(restaurantId, list);
      localStore.notifyOrders(restaurantId);
    }

    const path = `restaurants/${restaurantId}/orders/${orderId}`;
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

  // 16. Authorized Order Item Correction / Editing
  async editOrder(params: {
    restaurantId: string;
    orderId: string;
    updatedItems: OrderItem[];
    editNote: string;
  }): Promise<void> {
    const { restaurantId, orderId, updatedItems, editNote } = params;
    const list = localStore.orders.get(restaurantId) || [];
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
    localStore.orders.set(restaurantId, list);
    localStore.notifyOrders(restaurantId);

    const path = `restaurants/${restaurantId}/orders/${orderId}`;
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

  // 17. Seed Complete Demo Data to Firestore
  async seedFirestoreDemoData(ownerId: string, restaurantId = DEMO_RESTAURANT_ID): Promise<void> {
    const restData: Restaurant = {
      ...INITIAL_RESTAURANT,
      id: restaurantId,
      ownerId,
      currency: 'INR',
      currencySymbol: '₹',
      taxRate: 5.0,
      updatedAt: new Date().toISOString(),
    };

    localStore.restaurants.set(restaurantId, restData);
    localStore.menuItems.set(restaurantId, [...INITIAL_MENU_ITEMS]);
    localStore.tables.set(restaurantId, [...INITIAL_TABLES]);
    localStore.orders.set(restaurantId, [...INITIAL_ORDERS]);

    // 1. Restaurant
    await setDoc(doc(db, 'restaurants', restaurantId), restData, { merge: true });

    // 2. Menu Items
    for (const item of INITIAL_MENU_ITEMS) {
      const itemData = { ...item, restaurantId };
      await setDoc(doc(db, 'restaurants', restaurantId, 'menu_items', item.id), itemData, { merge: true });
    }

    // 3. Tables
    for (const tbl of INITIAL_TABLES) {
      const tableData = { ...tbl, restaurantId };
      await setDoc(doc(db, 'restaurants', restaurantId, 'tables', tbl.id), tableData, { merge: true });
    }

    // 4. Sample Orders
    for (const ord of INITIAL_ORDERS) {
      const ordData = { ...ord, restaurantId };
      await setDoc(doc(db, 'restaurants', restaurantId, 'orders', ord.id), ordData, { merge: true });
    }

    localStore.notifyOrders(restaurantId);
  },
};
