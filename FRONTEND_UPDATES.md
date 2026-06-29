# IAM Backend — Frontend Update Notes

---

## 1. New: Systems Module

A **system** is an external software application (e.g. complaints, HR) owned by a specific institution (مديرية).

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
  "institutionId": 2,
  "institution": { "id": 2, "name": "مديرية الصحة", "level": 2 },
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
  "institutionId": 2
}
```

- `institutionId` is optional — a system can exist without being linked to an institution yet. Link it later via `PATCH /systems/:id`.
- `name` must be unique.
- The `complaints` system is created automatically on server boot (seed).

---

## 2. Institution Children — Cascading Dropdowns

When building the create-user form (institution → department → unit), use `GET /institutions/:id` and read the `children` array to populate the next dropdown.

**Pattern:**

```
User selects مديرية (id: 2)
  → GET /institutions/2
  → use response.children  →  populate قسم dropdown

User selects قسم (id: 5)
  → GET /institutions/5
  → use response.children  →  populate وحدة dropdown
```

**Response shape of GET /institutions/:id:**

```json
{
  "id": 2,
  "name": "مديرية الصحة",
  "level": 2,
  "parent": { "id": 1, "name": "محافظة حمص" },
  "children": [
    { "id": 5, "name": "قسم المعلوماتية", "level": 3 },
    { "id": 6, "name": "قسم الإدارة", "level": 3 }
  ]
}
```

No extra endpoint needed — `children` is already included.

---

## 3. Institution Hierarchy

The institution tree has a fixed structure:

```
محافظة حمص        (level 1 — root, no users assigned here)
  ├── مديرية الصحة      (level 2 — institution)
  │     ├── قسم المعلوماتية  (level 3 — department)
  │     │     └── وحدة التطبيقات  (level 4 — unit)
  ├── مديرية التربية    (level 2)
  └── ...
```

- **Systems** are linked to level 2 (مديرية).
- **Users** are linked across all three lower levels (see Section 3).

---

## 4. User — Restructured Org Fields

The old free-text `department` and `unit` string fields have been **removed**. They are now proper FK references to the institutions tree.

### New user fields

| Field | Level | Description |
|-------|-------|-------------|
| `institutionId` | 2 | المديرية التي يتبعها الموظف |
| `departmentId` | 3 | القسم داخل المديرية |
| `unitId` | 4 | الوحدة داخل القسم |

All three are optional (nullable).

### GET /users and GET /users/:id — updated shape

```json
{
  "id": 10,
  "email": "user@example.com",
  "institutionId": 2,
  "institution": { "id": 2, "name": "مديرية الصحة", "level": 2 },
  "departmentId": 5,
  "department": { "id": 5, "name": "قسم المعلوماتية", "level": 3 },
  "unitId": 9,
  "unit": { "id": 9, "name": "وحدة التطبيقات", "level": 4 },
  "role": { ... },
  ...
}
```

### POST /users and PATCH /users/:id — updated body

```json
{
  "email": "user@example.com",
  "password": "...",
  "institutionId": 2,
  "departmentId": 5,
  "unitId": 9,
  "roleId": 3
}
```

Pass `null` to clear any of these fields.

### GET /users — updated query filters

| Old | New |
|-----|-----|
| `?department=string` | `?departmentId=number` |
| — | `?institutionId=number` |
| — | `?unitId=number` |
| `?roleId=number` | unchanged |
| `?isActive=boolean` | unchanged |

---

## 5. Role — New Fields

### systemId field

Roles can now be linked to a system. A role with a system is **system-scoped** (e.g. `complaints.admin`). A role without a system is **IAM-native** (e.g. `admin`).

**GET /roles and GET /roles/:id — updated shape:**

```json
{
  "id": 3,
  "name": "complaints.admin",
  "systemId": 1,
  "system": {
    "id": 1,
    "name": "complaints",
    "institutionId": 2
  },
  ...
}
```

**POST /roles and PATCH /roles/:id — new optional field:**

```json
{ "name": "complaints.viewer", "systemId": 1 }
```

Pass `"systemId": null` to detach a role from its system.

### isSystem protection — 403 responses

Roles with `isSystem: true` (`admin`, `security_officer`, `complaints.admin`) are protected:

- `DELETE /roles/:id` → **403** if the role is a system role
- `PATCH /roles/:id` with a different `name` → **403** if the role is a system role
- All other fields (color, label, permissions, systemId, isActive…) can still be updated freely.

`isSystem` can no longer be set via the API — it is managed by the server only.

---

## 6. Role Assignment Validation — 400 on Institution Mismatch

When assigning a role to a user (`POST /users` or `PATCH /users/:id` with `roleId`):

- If the role has a system linked to an institution → user's `institutionId` **must match**.
- Mismatch → **400 Bad Request**:

```json
{
  "statusCode": 400,
  "message": "Role \"complaints.admin\" belongs to system \"complaints\" which is owned by a different institution. Assign the user to the correct institution first."
}
```

IAM-native roles (no system) have no institution restriction.

**UI tip:** When the admin picks a system-scoped role, auto-fill the institution field from `role.system.institutionId`.

---

## 7. Typical Setup Flow

```
1. Create institution nodes via POST /institutions (root → مديريات → أقسام → وحدات)

2. Link a system to a مديرية:
   POST /systems { "name": "complaints", "institutionId": <directorate_id> }
   (or PATCH /systems/:id if the complaints system already exists from seed)

3. Link a role to the system:
   PATCH /roles/:id { "systemId": <system_id> }

4. Create a user with matching institution:
   POST /users {
     "institutionId": <directorate_id>,
     "departmentId": <dept_id>,
     "unitId": <unit_id>,
     "roleId": <role_id>
   }
```

---

## 8. Error Codes Summary

| Status | Scenario |
|--------|----------|
| 400 | Assigning a system-scoped role to a user in a different institution |
| 400 | Sending `isSystem` in create/update role body (field not allowed) |
| 403 | Deleting or renaming a role that has `isSystem: true` |
| 404 | `institutionId`, `departmentId`, `unitId`, or `systemId` not found |
| 409 | System `name` already exists |
