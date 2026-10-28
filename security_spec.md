# SmartServe Firestore Security Specification

## 1. Data Invariants
1. **Ownership Invariant**: A restaurant document can only be created or modified by its authenticated owner (`request.auth.uid == incoming().ownerId`).
2. **Subcollection Relational Isolation**: Menu items and dining tables can only be modified or deleted by the authenticated owner of the parent restaurant document.
3. **Public Read Integrity**: Public customers (unauthenticated guests scanning a QR code) can read restaurant profile information, active menu items, and active tables needed to render the menu.
4. **Order Creation Guard**: A customer may create an order under `/restaurants/{restaurantId}/orders/{orderId}` with status strictly initialized to `'new'`. Customers cannot set the initial status to `'preparing'`, `'ready'`, or `'served'`.
5. **Kitchen Status Exclusivity**: Order status transitions (`new` -> `preparing` -> `ready` -> `served`) and order cancellations can only be executed by the authenticated restaurant owner or staff.
6. **Customer Tracking Protection**: Customers may read their individual order ticket only if they possess the valid `customerTrackingToken` or if requested by the restaurant owner.
7. **Type & Bounds Integrity**: Every string, number, and array is constrained by maximum sizes and length bounds to prevent denial of wallet and malicious payload injection.
8. **Catch-All Default Deny**: Any path or operation not explicitly permitted is blocked by default.

## 2. The Dirty Dozen Payloads (Adversarial Test Vectors)

1. **Payload 1: Unauthenticated Restaurant Takeover**
   - Attempt: Unauthenticated write to `/restaurants/demo-rest` setting `ownerId: "hacker"`.
   - Expected: `PERMISSION_DENIED`.

2. **Payload 2: Cross-Tenant Restaurant Hijack**
   - Attempt: Authenticated User B attempts to edit Restaurant A (`ownerId: User A`).
   - Expected: `PERMISSION_DENIED`.

3. **Payload 3: Ghost Field Injection in Restaurant**
   - Attempt: Owner attempts to update restaurant with ghost field `isSuperAdminTier: true`.
   - Expected: `PERMISSION_DENIED` via `hasOnly()` key bounds.

4. **Payload 4: Menu Price Tampering by Guest**
   - Attempt: Guest or malicious user attempts to update `/restaurants/rest-1/menu_items/item-1` with `price: 0.01`.
   - Expected: `PERMISSION_DENIED`.

5. **Payload 5: Cross-Tenant Menu Injection**
   - Attempt: Owner of Restaurant B attempts to add a menu item under `/restaurants/rest-A/menu_items/`.
   - Expected: `PERMISSION_DENIED`.

6. **Payload 6: Customer Escalating Order to 'Served'**
   - Attempt: Customer creates or updates an order directly with `status: "served"` or skips state flow.
   - Expected: `PERMISSION_DENIED`.

7. **Payload 7: Unbounded Array / Wallet Drain Attack**
   - Attempt: Order submission with 10,000 array elements or oversized JSON payload.
   - Expected: `PERMISSION_DENIED` via array size bound (`items.size() <= 50`).

8. **Payload 8: Negative Price / Nan Poisoning in Menu Item**
   - Attempt: Menu item with negative price (`price: -50`).
   - Expected: `PERMISSION_DENIED` via `incoming().price >= 0`.

9. **Payload 9: Deletion of Restaurant by Non-Owner**
   - Attempt: Random user calls `deleteDoc` on `/restaurants/rest-1`.
   - Expected: `PERMISSION_DENIED`.

10. **Payload 10: Unauthorized Order Listing by Strangers**
    - Attempt: Unauthenticated user calls `getDocs(collection('restaurants/rest-1/orders'))`.
    - Expected: `PERMISSION_DENIED`. Only authenticated owners can list the full orders queue.

11. **Payload 11: Table Number ID Poisoning**
    - Attempt: Path injection with a 2KB string for `{tableId}`.
    - Expected: `PERMISSION_DENIED` via `isValidId()`.

12. **Payload 12: Order Tampering after Completion (Terminal Lock)**
    - Attempt: Mutating an order after it has reached terminal state `'served'` or `'cancelled'`.
    - Expected: `PERMISSION_DENIED`.
