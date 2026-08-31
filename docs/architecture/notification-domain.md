# GymDeck Notification Center Domain Architecture

## 1. Overview
The Notification Center manages system announcements, membership renewal alerts, workout updates, and security notifications for gym members.

---

## 2. API Endpoints
* `GET /v1/member/notifications`: Paginated list of notifications with `unreadCount` summary.
* `POST /v1/member/notifications/:id/read`: Marks a single notification as read (`is_read = true`, `read_at = NOW()`).
* `POST /v1/member/notifications/read-all`: Marks all unread notifications for the member as read.

---

## 3. Tenant Isolation
Notifications are filtered by `(gym_id, member_id)` via `member_notification_recipients`. Cross-tenant or cross-member notification leakage is impossible.
