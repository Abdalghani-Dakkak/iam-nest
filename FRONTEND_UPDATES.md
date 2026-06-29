# IAM Backend — Frontend Update Notes

## 1. New: Systems Module

A new resource `systems` has been added. A **system** is an external software application (e.g. complaints, HR) that is owned by a specific institution.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/systems` | List all systems |
| GET | `/systems/:id` | Get one system |
| POST | `/systems` | Create system |
| PATCH | `/systems/:id` | Update system |
| DELETE | `/systems/:id` | Delete system |

### System object shape

```json
{
  "id": 1,
  "name": "complaints",
  "arabicName": "نظام الشكاوى والطلبات",
  "description": "External complaints & requests system",
  "isActive": true,
  "institutionId": 5,
  "institution": {
    "id": 5,
    "name": "وزارة الصحة"
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Create / Update body

```json
{
  "name": "complaints",
  "arabicName": "نظام الشكاوى والطلبات",
  "description": "...",
  "isActive": true,
  "institutionId": 5
}
```

- `institutionId` is optional — a system can exist without being tied to an institution yet.
- `name` must be unique.

---

## 2. Role — New Fields

Roles now carry a `system` relation. A role with a system is a **system-scoped role** (e.g. `complaints.admin`). A role without a system is an **IAM-native role** (e.g. `admin`).

### GET /roles — updated shape

```json
{
  "id": 3,
  "name": "complaints.admin",
  "systemId": 1,
  "system": {
    "id": 1,
    "name": "complaints",
    "institutionId": 5
  },
  ...
}
```

### POST /roles and PATCH /roles/:id — new optional field

```json
{
  "name": "complaints.viewer",
  "systemId": 1
}
```

Pass `"systemId": null` to detach a role from its system.

### isSystem enforcement — new 403 responses

Roles that have `isSystem: true` (e.g. `admin`, `security_officer`, `complaints.admin`) are now **protected**:

- `DELETE /roles/:id` → **403 Forbidden** if `isSystem` is true
- `PATCH /roles/:id` with a different `name` → **403 Forbidden** if `isSystem` is true
- All other fields (color, label, permissions, systemId, etc.) can still be updated freely.

Handle the 403 in the UI with a message like: *"هذا الدور محمي ولا يمكن حذفه أو تغيير اسمه."*

---

## 3. User — New Field: `institutionId`

Users now belong to an institution (the org unit they work in).

### GET /users and GET /users/:id — updated shape

```json
{
  "id": 10,
  "email": "user@example.com",
  "institutionId": 5,
  "institution": {
    "id": 5,
    "name": "وزارة الصحة"
  },
  "role": { ... },
  ...
}
```

### POST /users and PATCH /users/:id — new optional field

```json
{
  "email": "user@example.com",
  "institutionId": 5,
  "roleId": 3,
  ...
}
```

Pass `"institutionId": null` to detach a user from their institution.

---

## 4. Role Assignment Validation — New 400 Response

When assigning a role to a user (`POST /users` or `PATCH /users/:id` with `roleId`):

- If the role belongs to a system, and that system is linked to an institution, the user's `institutionId` **must match** the system's institution.
- Mismatch → **400 Bad Request**:

```json
{
  "statusCode": 400,
  "message": "Role \"complaints.admin\" belongs to system \"complaints\" which is owned by a different institution. Assign the user to the correct institution first."
}
```

**UI suggestion:** When the admin picks a system-scoped role for a user, auto-fill or validate the institution field based on the role's system institution.

---

## 5. Typical Setup Flow (for reference)

```
1. Create institution:   POST /institutions { "name": "وزارة الصحة" }
2. Create system:        POST /systems { "name": "complaints", "institutionId": <inst_id> }
3. Link role to system:  PATCH /roles/<id> { "systemId": <system_id> }
4. Create user:          POST /users { "institutionId": <inst_id>, "roleId": <role_id>, ... }
```

The seed already creates the `complaints` system on boot and links all `complaints.*` roles to it automatically. You only need to link the system to an institution once via `PATCH /systems/:id`.

---

## Summary of New Error Codes to Handle

| Status | Scenario |
|--------|----------|
| 400 | Assigning a system-scoped role to a user in a different institution |
| 403 | Deleting or renaming an `isSystem` role |
| 404 | `institutionId` or `systemId` not found |
| 409 | System `name` already exists |
