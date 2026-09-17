# 🧪 Papertrail: Complete Production Test Suite & Roadmap

> **Target Audience:** Beginner-to-intermediate tester familiar with basic `unittest` and `pytest`.  
> **Purpose:** A complete, exhaustive inventory of every test required before shipping **Papertrail** to production, explaining **why each test is needed**, what risks it mitigates, and **how to structure and write it step-by-step**.

---

## 📑 Table of Contents
1. [Testing Architecture & Prerequisites for This Stack](#1-testing-architecture--prerequisites-for-this-stack)
2. [Step-by-Step Learning & Implementation Roadmap](#2-step-by-step-learning--implementation-roadmap)
3. [Module 1: Authentication & User Lifecycle Tests](#module-1-authentication--user-lifecycle-tests)
4. [Module 2: Password Reset & Email Verification Security Tests](#module-2-password-reset--email-verification-security-tests)
5. [Module 3: Core Notes CRUD & Checklist Feature Tests](#module-3-core-notes-crud--checklist-feature-tests)
6. [Module 4: Soft-Delete, Trash & 30-Day Auto-Purge Tests](#module-4-soft-delete-trash--30-day-auto-purge-tests)
7. [Module 5: Lock & Unlock Security Protection Tests](#module-5-lock--unlock-security-protection-tests)
8. [Module 6: Redis Caching & Invalidation Integrity Tests](#module-6-redis-caching--invalidation-integrity-tests)
9. [Module 7: Rate Limiting & Throttling Defense Tests](#module-7-rate-limiting--throttling-defense-tests)
10. [Module 8: Admin Dashboard & Privileged Operations Tests](#module-8-admin-dashboard--privileged-operations-tests)
11. [Module 9: Async Celery Tasks & Email Dispatch Tests](#module-9-async-celery-tasks--email-dispatch-tests)
12. [Module 10: Health Check & System Monitoring Tests](#module-10-health-check--system-monitoring-tests)
13. [Ready-to-Use Boilerplate & Setup Guide](#ready-to-use-boilerplate--setup-guide)

---

## 1. Testing Architecture & Prerequisites for This Stack

Because Papertrail uses a unique, high-performance stack:
* **Django REST Framework (DRF)** for HTTP APIs
* **MongoEngine (MongoDB)** instead of relational Django ORM models
* **Redis Cache** for fast reads (`notes_list`, `admin_dashboard_stats`, etc.)
* **Celery** for asynchronous email dispatch and background cleanup
* **Custom JWT Authentication** with `token_version` invalidation

### Key Rules for Writing Tests Here:
1. **Never touch the production database:** Use `mongomock` or a dedicated test database (e.g. `db='test_notes'`).
2. **Never send real emails in tests:** Django's `django.core.mail.outbox` or `@patch('notesApp.tasks.send_email_async.delay')` will intercept emails in memory.
3. **Isolate Cache between tests:** Use `cache.clear()` in test teardown (`tearDown` or pytest fixture) so test A doesn't pollute test B.
4. **Celery in eager mode:** For testing tasks, set `CELERY_TASK_ALWAYS_EAGER = True` so background tasks run synchronously during test execution.

---

## 2. Step-by-Step Learning & Implementation Roadmap

Don't write everything at once! Follow this step-by-step progression:

```
[Phase 1: Foundation]
  ├── Test 1.1 - 1.5: User Model & JWT Auth
  └── Test 3.1 - 3.4: Note CRUD Operations
       │
[Phase 2: Security & Business Logic]
  ├── Test 2.1 - 2.5: Email Verification & Password Reset
  ├── Test 4.1 - 4.5: Soft Deletion, Trash & Restore
  └── Test 5.1 - 5.4: Note Lock & Unlock
       │
[Phase 3: Performance & Reliability]
  ├── Test 6.1 - 6.6: Redis Cache Invalidation
  ├── Test 7.1 - 7.3: Throttling & Rate Limits
  └── Test 9.1 - 9.3: Celery Background Tasks
       │
[Phase 4: Admin & Monitoring]
  ├── Test 8.1 - 8.6: Admin Role-Based Access Control
  └── Test 10.1 - 10.3: Health Check & Stats View
```

---

## Module 1: Authentication & User Lifecycle Tests

### Test 1.1: Successful User Registration with Valid Verification Code
* **Why it is needed:** Verifies that a valid user can successfully create an account, their password gets hashed securely with Django's password hasher (never plaintext), and a valid JWT token is returned.
* **Risk if missed:** Users cannot sign up, or plaintext passwords leak into the database.
* **Flow:**
  1. Insert a `VerificationCode` into the database for `test@example.com` with code `123456`.
  2. Send `POST /api/auth/register/` with `username`, `email`, `password`, `verification_code`.
  3. **Assert:** Status code `201 Created`.
  4. **Assert:** Database has a user with hashed password (`user.check_password('password') == True`).
  5. **Assert:** Response contains `token` and `user` payload.

### Test 1.2: User Registration Fails with Duplicate Email or Username
* **Why it is needed:** Ensures that unique constraints are strictly enforced and informative errors are returned rather than a 500 server crash.
* **Risk if missed:** Database integrity collisions or account takeovers.
* **Flow:**
  1. Create `User(username='john', email='john@example.com')`.
  2. Attempt to register another user with `username='john'` or `email='john@example.com'`.
  3. **Assert:** Status code `400 Bad Request`.
  4. **Assert:** Error payload specifically mentions the field collision.

### Test 1.3: User Login with Valid Credentials
* **Why it is needed:** Verifies that existing users can authenticate with correct username/email and password and receive a valid JWT token.
* **Risk if missed:** Legit users get locked out.
* **Flow:**
  1. Create active user with known password.
  2. Send `POST /api/auth/login/` with username/email and password.
  3. **Assert:** Status code `200 OK`.
  4. **Assert:** JWT token in response decodes to `user_id` and correct `token_version`.

### Test 1.4: User Login Rejection with Invalid Password or Non-Existent User
* **Why it is needed:** Verifies that bad credentials receive a clean `401 Unauthorized` / `400 Bad Request` without leaking whether the email or password was the invalid part.
* **Risk if missed:** Security vulnerability (user enumeration) or unhandled exceptions.
* **Flow:**
  1. Send `POST /api/auth/login/` with wrong password or unknown email.
  2. **Assert:** Status code `400` or `401`.
  3. **Assert:** Response message is generic (e.g., `"Invalid credentials"`).

### Test 1.5: Accessing Protected Endpoints Without Token or With Expired Token
* **Why it is needed:** Verifies `JWTAuthentication` intercepts requests with missing, malformed, or expired `Authorization: Bearer <token>` headers.
* **Risk if missed:** Unauthenticated visitors reading private notes.
* **Flow:**
  1. Send `GET /api/notes/` with no header, random string `Bearer abc`, or expired JWT.
  2. **Assert:** Status code `401 Unauthorized`.

---

## Module 2: Password Reset & Email Verification Security Tests

### Test 2.1: Verification Code Rate Limit & Cooldown Protection
* **Why it is needed:** Prevents users or botnets from spamming email verification codes (e.g. 60-second cooldown rule).
* **Risk if missed:** SMTP quota exhaustion, email server getting blacklisted as spammer, financial cost.
* **Flow:**
  1. Send `POST /api/auth/send-code/` for `alice@example.com`.
  2. Immediately send a second request for the same email within 60 seconds.
  3. **Assert:** Second request returns `429 Too Many Requests` or `400 Bad Request` with cooldown message.

### Test 2.2: Verification Code Expiration (10-minute expiry)
* **Why it is needed:** Verification codes must be short-lived to prevent replay attacks.
* **Risk if missed:** Old or leaked verification codes reused indefinitely.
* **Flow:**
  1. Create a `VerificationCode` with `created_at` timestamp set to 15 minutes ago.
  2. Attempt registration with this code.
  3. **Assert:** Status code `400 Bad Request` (Code expired).

### Test 2.3: Verification Code Brute-Force Defense (Max Attempts Lockout)
* **Why it is needed:** An attacker might attempt to guess 6-digit codes (1,000,000 combinations). After 10 failed attempts, the code must be invalidated.
* **Risk if missed:** 6-digit PIN can be brute-forced within minutes.
* **Flow:**
  1. Generate code for `user@example.com`.
  2. Attempt `POST /api/auth/register/` with wrong code 10 times.
  3. **Assert:** `VerificationCode.attempts == 10`.
  4. On 11th attempt even with correct code, **Assert:** `400 Bad Request` (Max attempts exceeded).

### Test 2.4: Reset Password Successfully Updates Password and Hash
* **Why it is needed:** Verifies the complete forgot-password flow updates the database password and allows login with the new password.
* **Risk if missed:** Users locked out permanently if they forget their password.
* **Flow:**
  1. Create user, create valid forgot-password verification code.
  2. Send `POST /api/auth/forgot-password/reset/` with code and new password.
  3. **Assert:** Status code `200 OK`.
  4. Login with old password -> **Assert:** `400/401 Failure`.
  5. Login with new password -> **Assert:** `200 Success`.

### Test 2.5: Password Reset Invalidates All Existing Active JWT Tokens (`token_version` bump)
* **Why it is needed:** When a user resets their password (perhaps due to being compromised), all existing sessions/tokens on other devices MUST be immediately rejected.
* **Risk if missed:** Attacker who stole a JWT retains permanent access even after password change.
* **Flow:**
  1. User logs in, gets `token_A` with `token_version=0`.
  2. User resets password. User's `token_version` in DB increments to `1`.
  3. Send request to `GET /api/notes/` using `token_A`.
  4. **Assert:** Status code `401 Unauthorized` ("Token has been revoked. Please log in again.").

---

## Module 3: Core Notes CRUD & Checklist Feature Tests

### Test 3.1: Create Note (Plain Text vs Checklist)
* **Why it is needed:** Verifies that notes can be created with either text content or structured checklist items, assigned correctly to the requesting user.
* **Risk if missed:** Corrupted notes, broken checklist payloads.
* **Flow:**
  1. Send `POST /api/notes/` with `{"title": "Groceries", "is_checklist": true, "items": [{"text": "Milk", "checked": false}]}`.
  2. **Assert:** Status code `201 Created`.
  3. **Assert:** DB document contains matching `items` list and `user == request.user`.

### Test 3.2: User Data Isolation (User A Cannot View User B's Notes)
* **Why it is needed:** **CRITICAL PRIVACY TEST.** Ensures multi-tenancy isolation—User A must never receive or see notes belonging to User B.
* **Risk if missed:** Catastrophic data leak between users.
* **Flow:**
  1. Create `User_A` and `User_B`.
  2. Create Note 1 belonging to `User_A`.
  3. Authenticate as `User_B` and call `GET /api/notes/`.
  4. **Assert:** Response does NOT contain Note 1.
  5. Authenticate as `User_B` and call `GET /api/notes/<note_1_id>/`.
  6. **Assert:** Status code `404 Not Found` (Never 200).

### Test 3.3: User A Cannot Update or Delete User B's Note
* **Why it is needed:** Verifies authorization checks on mutation endpoints (`PUT`, `PATCH`, `DELETE`).
* **Risk if missed:** Malicious user tampering with or deleting other people's notes.
* **Flow:**
  1. Create Note 1 belonging to `User_A`.
  2. Authenticate as `User_B`.
  3. Send `PUT /api/notes/<note_1_id>/` with modified title.
  4. **Assert:** Status code `404 Not Found` or `403 Forbidden`.
  5. **Assert:** Note 1 in DB remains unchanged.

### Test 3.4: Pinned Notes Ordering & Pagination
* **Why it is needed:** Verifies that pinned notes always appear at the top of the note list, followed by newest created notes.
* **Risk if missed:** UI sorting breakdown, broken user experience.
* **Flow:**
  1. Create 3 notes: Note 1 (old, pinned), Note 2 (new, unpinned), Note 3 (newest, pinned).
  2. Call `GET /api/notes/`.
  3. **Assert:** Note 3 appears 1st, Note 1 appears 2nd, Note 2 appears 3rd.

### Test 3.5: Validation on Note Payloads (Title Limits, Checklist Item Caps)
* **Why it is needed:** Protects against payload bombs (e.g. 100,000 checklist items or titles > 200 chars).
* **Risk if missed:** DB out-of-memory errors, app freezing.
* **Flow:**
  1. Send `POST /api/notes/` with empty title `""` or title with 500 characters.
  2. **Assert:** `400 Bad Request`.
  3. Send `POST /api/notes/` with 150 checklist items (limit is 100).
  4. **Assert:** `400 Bad Request`.

---

## Module 4: Soft-Delete, Trash & 30-Day Auto-Purge Tests

### Test 4.1: Moving Note to Trash (Soft Delete)
* **Why it is needed:** Verifies `DELETE /api/notes/<id>/` sets `is_deleted=True` and `deleted_at=now` rather than deleting from DB immediately.
* **Risk if missed:** Accidental permanent data loss for users.
* **Flow:**
  1. Send `DELETE /api/notes/<note_id>/`.
  2. **Assert:** Status code `200 OK`.
  3. **Assert:** Note in DB has `is_deleted=True` and `deleted_at is not None`.
  4. Call `GET /api/notes/` -> Note is NOT listed in active notes.
  5. Call `GET /api/notes/trash/` -> Note IS listed in trash.

### Test 4.2: Restoring Note from Trash
* **Why it is needed:** Verifies user can recover trashed notes back to active state.
* **Risk if missed:** Trash feature is one-way only; users cannot undo deletes.
* **Flow:**
  1. Put note in trash.
  2. Send `POST /api/notes/<note_id>/restore/`.
  3. **Assert:** Status code `200 OK`.
  4. **Assert:** Note in DB has `is_deleted=False` and `deleted_at=None`.
  5. Note reappears in `GET /api/notes/`.

### Test 4.3: Permanent Deletion from Trash
* **Why it is needed:** Allows users to permanently wipe sensitive notes immediately from trash.
* **Risk if missed:** Compliance failure (GDPR right to erasure).
* **Flow:**
  1. Note is in trash (`is_deleted=True`).
  2. Send `DELETE /api/notes/<note_id>/permanent/`.
  3. **Assert:** Status code `200 OK`.
  4. **Assert:** Note document is completely removed from MongoDB.

### Test 4.4: 30-Day Auto-Purge Celery Task (`purge_expired_trash_task`)
* **Why it is needed:** Verifies that the automated background job deletes notes that have been in trash > 30 days while leaving newer trashed notes intact.
* **Risk if missed:** Database bloat over months and years.
* **Flow:**
  1. Create Note A with `is_deleted=True` and `deleted_at = 35 days ago`.
  2. Create Note B with `is_deleted=True` and `deleted_at = 5 days ago`.
  3. Execute `purge_expired_trash()`.
  4. **Assert:** Note A no longer exists in DB.
  5. **Assert:** Note B still exists in DB trash.

---

## Module 5: Lock & Unlock Security Protection Tests

### Test 5.1: Locking a Note Hides Content in List View
* **Why it is needed:** When a note is locked (`is_locked=True`), sensitive contents should be redacted in generic list responses.
* **Risk if missed:** Private passwords/secrets exposed on screen in plain view.
* **Flow:**
  1. Create locked note with secret content `"my-bank-pin"`.
  2. Call `GET /api/notes/`.
  3. **Assert:** Note item in response has `is_locked=True` and `content=""` (or masked).

### Test 5.2: Unlocking a Note Requires Valid Account Password
* **Why it is needed:** Verifies that unlocking a locked note enforces password verification before returning content.
* **Risk if missed:** Anyone holding an open browser session can read locked notes without re-authentication.
* **Flow:**
  1. Send `POST /api/notes/<note_id>/unlock/` with wrong password.
  2. **Assert:** Status code `400/401` and content is NOT returned.
  3. Send `POST /api/notes/<note_id>/unlock/` with correct password.
  4. **Assert:** Status code `200 OK` and decrypted/unmasked content is returned.

### Test 5.3: Removing Lock from Note
* **Why it is needed:** Verifies user can convert a locked note back into a regular note using their password.
* **Flow:**
  1. Send `POST /api/notes/<note_id>/remove-lock/` with valid password.
  2. **Assert:** Note in DB now has `is_locked=False`.

---

## Module 6: Redis Caching & Invalidation Integrity Tests

### Test 6.1: Cache Hit on Consecutive List Requests
* **Why it is needed:** Verifies Redis cache is functioning: 1st request hits MongoDB, 2nd request serves directly from Redis cache.
* **Risk if missed:** Database gets overwhelmed under production traffic loads.
* **Flow:**
  1. Make `GET /api/notes/`.
  2. Check cache key `f"notes_list_{user_id}"` exists in Redis/cache backend.
  3. Make second `GET /api/notes/` and verify fast response with identical payload.

### Test 6.2: Cache Invalidation on Note Creation
* **Why it is needed:** When a user creates a new note, stale cache must be immediately invalidated so the user sees their new note.
* **Risk if missed:** User creates a note, refreshes page, and thinks their note was lost!
* **Flow:**
  1. Call `GET /api/notes/` (populates cache).
  2. Call `POST /api/notes/` to create a new note.
  3. **Assert:** Cache key `f"notes_list_{user_id}"` is deleted/invalidated.
  4. Next `GET /api/notes/` fetches fresh list containing the new note.

### Test 6.3: Cache Invalidation on Note Update / Soft Delete / Restore / Trash
* **Why it is needed:** Any mutation (edit title, delete, pin, restore) must flush both the specific note cache and the user's note list cache.
* **Risk if missed:** UI displays stale, outdated data.
* **Flow:**
  1. Test each endpoint: `PUT /notes/<id>/`, `DELETE /notes/<id>/`, `POST /notes/<id>/restore/`.
  2. **Assert:** After every operation, `notes_list_{user_id}` and `note_detail_{note_id}` cache keys are cleared.

### Test 6.4: Cross-User Cache Key Collision Defense
* **Why it is needed:** Verifies cache keys are scoped by user ID (e.g. `notes_list_user1` vs `notes_list_user2`).
* **Risk if missed:** User 1 sees User 2's cached notes!
* **Flow:**
  1. Populate cache for User 1.
  2. Request `GET /api/notes/` for User 2.
  3. **Assert:** User 2 does not receive User 1's cached payload.

---

## Module 7: Rate Limiting & Throttling Defense Tests

### Test 7.1: Sensitive Auth Endpoints Throttle (5 requests / min)
* **Why it is needed:** Protects `/api/auth/login/`, `/api/auth/send-code/`, `/api/auth/register/` against brute-force attacks and credential stuffing.
* **Risk if missed:** Automated bots can crack passwords or spam SMS/emails.
* **Flow:**
  1. Send 5 rapid requests to `/api/auth/login/`.
  2. Send 6th request within the same minute.
  3. **Assert:** 6th request returns `429 Too Many Requests`.

### Test 7.2: Note Creation Throttling (30 / min)
* **Why it is needed:** Prevents script-kiddies from flooding the database with millions of fake notes.
* **Risk if missed:** Database disk filling up, server out-of-memory crash.
* **Flow:**
  1. Authenticate user.
  2. Send 30 note creations rapidly.
  3. Send 31st note creation.
  4. **Assert:** 31st request returns `429 Too Many Requests`.

### Test 7.3: Visitor / Stats View Throttle (6 / hour)
* **Why it is needed:** Prevents artificial inflation of visitor counters.
* **Flow:**
  1. Send 6 requests to `GET /api/stats/` from same IP.
  2. Send 7th request -> **Assert:** `429 Too Many Requests`.

---

## Module 8: Admin Dashboard & Privileged Operations Tests

### Test 8.1: Non-Admin Users Blocked from Admin Endpoints
* **Why it is needed:** Ensures standard users (`is_admin=False`) cannot access `/api/admin/*` APIs.
* **Risk if missed:** Regular users can view all users, delete other accounts, or inspect system stats.
* **Flow:**
  1. Authenticate as normal user (`is_admin=False`).
  2. Send `GET /api/admin/dashboard/`, `GET /api/admin/users/`, `GET /api/admin/notes/`.
  3. **Assert:** All return `403 Forbidden` (or `401 Unauthorized`).

### Test 8.2: Admin Login Generates Token with Admin Claims
* **Why it is needed:** Verifies `/api/admin/login/` only accepts users with `is_admin=True`.
* **Flow:**
  1. Attempt login with regular user credentials -> **Assert:** `403 Forbidden`.
  2. Attempt login with admin user credentials -> **Assert:** `200 OK` with token.

### Test 8.3: Admin Can View Aggregated Metrics & User List
* **Why it is needed:** Verifies `/api/admin/dashboard/` and `/api/admin/users/` calculate total users, active notes, trashed notes, and returns paginated user records.
* **Flow:**
  1. Seed DB with 3 users and 10 notes.
  2. Call `GET /api/admin/dashboard/` as Admin.
  3. **Assert:** Response contains correct count totals (`total_users: 3`, `total_notes: 10`).

### Test 8.4: Admin Deleting a User Cascades to User's Notes
* **Why it is needed:** When an admin deletes a user, orphaned notes must not remain in the database (`reverse_delete_rule=CASCADE`).
* **Risk if missed:** Ghost data consuming DB storage with broken reference links.
* **Flow:**
  1. User A has 5 notes.
  2. Admin deletes User A (`DELETE /api/admin/users/<user_id>/`).
  3. **Assert:** User A is deleted from DB.
  4. **Assert:** All 5 notes associated with User A are also wiped.

---

## Module 9: Async Celery Tasks & Email Dispatch Tests

### Test 9.1: Celery Email Task Sends Async HTML/Text Message
* **Why it is needed:** Verifies that `send_email_async` handles parameters, constructs `EmailMultiAlternatives` properly, and dispatches to recipient.
* **Risk if missed:** Email task fails silently in background; users never receive verification codes.
* **Flow:**
  1. Call `send_email_async("Subject", "Plain text", "<h1>HTML</h1>", "test@example.com")`.
  2. **Assert:** Mail is captured in `django.core.mail.outbox`.
  3. **Assert:** Subject and recipient match expected inputs.

### Test 9.2: Celery Email Task Retries on SMTP Failure
* **Why it is needed:** If Gmail/SendGrid has a temporary 2-second network hiccup, Celery must retry automatically (up to 3 retries) instead of dropping the email.
* **Risk if missed:** Lost emails during minor network glitches.
* **Flow:**
  1. Mock `msg.send()` to throw `SMTPException`.
  2. Call task with retry mock.
  3. **Assert:** Task calls `self.retry()`.

---

## Module 10: Health Check & System Monitoring Tests

### Test 10.1: `/health/` Endpoint Returns 200 and Subsystem Status
* **Why it is needed:** Cloud providers (Render, AWS, Railway) use the health check to decide if your container is alive or needs a restart.
* **Risk if missed:** Container reported healthy when database is dead, or container repeatedly restarted in healthy state.
* **Flow:**
  1. Call `GET /api/health/`.
  2. **Assert:** Status code `200 OK`.
  3. **Assert:** JSON response contains `status: "healthy"` or `"ok"`, and checks for database connectivity.

---

## Ready-to-Use Boilerplate & Setup Guide

Here is the exact setup you can use to start writing tests today!

### Step 1: Install Test Dependencies
```bash
pip install pytest pytest-django mongomock
```

### Step 2: Create a `tests/` Directory Structure
```
notes/
  └── notesApp/
        └── tests/
              ├── __init__.py
              ├── conftest.py          # Fixtures & DB setup
              ├── test_auth.py         # Module 1 & 2
              ├── test_notes.py        # Module 3, 4 & 5
              ├── test_caching.py      # Module 6
              ├── test_throttling.py   # Module 7
              ├── test_admin.py        # Module 8
              └── test_tasks.py        # Module 9
```

### Step 3: Example Beginner-Friendly Test (`conftest.py` & `test_auth.py`)

#### `notesApp/tests/conftest.py`
```python
import pytest
import mongoengine
from django.core.cache import cache
from rest_framework.test import APIClient
from notesApp.models import User

@pytest.fixture(autouse=True)
def setup_test_db():
    """Connects to a mock/test database before each test and cleans up after."""
    # Disconnect any existing default connection
    mongoengine.disconnect(alias='default')
    # Connect to in-memory/test MongoDB
    conn = mongoengine.connect('test_notes_db', host='mongomock://localhost')
    cache.clear()
    
    yield conn
    
    # Teardown: drop test database and clean cache
    conn.drop_database('test_notes_db')
    mongoengine.disconnect(alias='default')
    cache.clear()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def create_test_user():
    def _create(username="testuser", email="test@example.com", password="SecurePassword123!", is_admin=False):
        user = User(username=username, email=email, is_admin=is_admin)
        user.set_password(password)
        user.save()
        return user
    return _create
```

#### `notesApp/tests/test_auth.py`
```python
import pytest
from notesApp.models import User, VerificationCode
from notesApp.utils import generate_token

@pytest.mark.django_db
def test_login_success(api_client, create_test_user):
    """Test 1.3: User Login with Valid Credentials"""
    # 1. Arrange: create user
    user = create_test_user(email="john@example.com", password="SecretPassword123!")
    
    # 2. Act: hit login endpoint
    response = api_client.post('/api/auth/login/', {
        "email": "john@example.com",
        "password": "SecretPassword123!"
    }, format='json')
    
    # 3. Assert
    assert response.status_code == 200
    assert "token" in response.data
    assert response.data["user"]["email"] == "john@example.com"

@pytest.mark.django_db
def test_user_cannot_access_other_user_notes(api_client, create_test_user):
    """Test 3.2: User Data Isolation"""
    user_a = create_test_user(username="user_a", email="a@example.com")
    user_b = create_test_user(username="user_b", email="b@example.com")
    
    token_b = generate_token(user_b)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_b}')
    
    response = api_client.get('/api/notes/')
    assert response.status_code == 200
    assert len(response.data.get("notes", [])) == 0
```

---

## 🏁 Summary Checklist Matrix

| # | Test Name | Risk Level | Target Area |
|---|---|---|---|
| **1.1** | User Registration with Code | 🔴 Critical | Auth |
| **1.2** | Unique Email/Username Enforcement | 🔴 Critical | Auth |
| **1.3** | Login with Valid Credentials | 🔴 Critical | Auth |
| **1.4** | Login Rejection on Bad Password | 🔴 Critical | Auth |
| **1.5** | Protected Route Auth Wall | 🔴 Critical | Auth |
| **2.1** | Send-Code 60s Cooldown | 🟠 High | Security |
| **2.2** | 10-Min Code Expiration | 🟠 High | Security |
| **2.3** | Max 10 Verification Attempts | 🔴 Critical | Security |
| **2.4** | Password Reset Execution | 🔴 Critical | Auth |
| **2.5** | Token Version Invalidation on Reset | 🔴 Critical | Security |
| **3.1** | Note & Checklist Creation | 🔴 Critical | Core CRUD |
| **3.2** | Multi-Tenant Note Isolation | 🔴 Critical | Privacy |
| **3.3** | Cross-User Mutation Blocking | 🔴 Critical | Authorization |
| **3.4** | Pinned Note Sorting | 🟡 Medium | UX |
| **3.5** | Payload & Title Length Validation | 🟠 High | Stability |
| **4.1** | Soft Deletion to Trash | 🔴 Critical | Data Safety |
| **4.2** | Trash Restoration | 🟠 High | Core Feature |
| **4.3** | Permanent Wipe from Trash | 🟠 High | Compliance |
| **4.4** | 30-Day Auto Purge Task | 🟡 Medium | Maintenance |
| **5.1** | Locked Note Content Redaction | 🔴 Critical | Privacy |
| **5.2** | Note Unlock Password Challenge | 🔴 Critical | Security |
| **5.3** | Note Lock Removal | 🟡 Medium | Core Feature |
| **6.1** | Note List Cache Hit | 🟠 High | Performance |
| **6.2** | Cache Invalidation on Create | 🔴 Critical | Data Freshness |
| **6.3** | Cache Invalidation on Update/Delete | 🔴 Critical | Data Freshness |
| **6.4** | Cross-User Cache Separation | 🔴 Critical | Security |
| **7.1** | Sensitive Auth Throttling (5/min) | 🟠 High | Security |
| **7.2** | Note Creation Throttling (30/min) | 🟠 High | DoS Defense |
| **7.3** | Visitor Stats Rate Limit (6/hr) | 🟡 Medium | Anti-Abuse |
| **8.1** | Non-Admin Blocked from Admin APIs | 🔴 Critical | RBAC |
| **8.2** | Admin Login Verification | 🔴 Critical | RBAC |
| **8.3** | Admin Metrics Aggregation | 🟡 Medium | Admin |
| **8.4** | User Deletion Note Cascade | 🟠 High | Integrity |
| **9.1** | Async Email Dispatch | 🟠 High | Celery |
| **9.2** | Email SMTP Auto-Retry | 🟡 Medium | Resilience |
| **10.1**| Health Check Endpoint | 🟠 High | DevOps |
