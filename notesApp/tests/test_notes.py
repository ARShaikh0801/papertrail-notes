import pytest
from notesApp.models import Note
import datetime
from notesApp.utils import get_current_utc_time
import base64
import math

@pytest.mark.django_db
def test_create_checklist_note(auth_client, user):
    """Test 3.1a: Checklist note sahi items ke saath aur sahi owner ke saath bane"""

    payload = {
        "title": "Groceries",
        "is_checklist": True,
        "items": [{"text": "Milk", "checked": False}]
    }

    response = auth_client.post('/api/notes/', payload, format='json')

    assert response.status_code == 201

    note = Note.objects.get(title="Groceries")
    assert note.user.id == user.id
    assert note.is_checklist is True
    assert len(note.items) == 1
    assert note.items[0].text == "Milk"
    assert note.items[0].checked is False


@pytest.mark.django_db
def test_create_plain_text_note(auth_client, user):
    """Test 3.1b: Plain text note bina items ke bane"""

    payload = {
        "title": "Ideas",
        "content": "Learn pytest properly",
        "is_checklist": False
    }

    response = auth_client.post('/api/notes/', payload, format='json')

    assert response.status_code == 201

    note = Note.objects.get(title="Ideas")
    assert note.user.id == user.id
    assert note.content == "Learn pytest properly"
    assert note.is_checklist is False
    assert len(note.items) == 0

def extract_notes(response):
    """List response agar paginated ho ({'results': [...]}) ya seedhi list ho, dono handle karta hai."""
    data = response.data
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


@pytest.mark.django_db
def test_user_cannot_see_other_users_notes(auth_client, other_auth_client, user):
    """Test 3.2: User B ko User A ke notes list ya detail me nahi dikhne chahiye"""

    # ---- ARRANGE: Note 1, John (User A) ka ----
    note = Note(user=user, title="John Secret", content="private data")
    note.save()
    note_id = str(note.id)

    # ---- CONTROL: John ko apna note dikhna chahiye ----
    john_list = auth_client.get('/api/notes/')
    assert john_list.status_code == 200
    assert note_id in [n["id"] for n in extract_notes(john_list)]

    john_detail = auth_client.patch(f'/api/notes/{note_id}/')
    assert john_detail.status_code == 200

    # ---- ACT + ASSERT: Alice (User B) list dekhe ----
    alice_list = other_auth_client.get('/api/notes/')
    assert alice_list.status_code == 200
    assert note_id not in [n["id"] for n in extract_notes(alice_list)]

    # ---- ACT + ASSERT: Alice seedha John ke note ka ID use kare ----
    alice_detail = other_auth_client.patch(f'/api/notes/{note_id}/')
    assert alice_detail.status_code == 404     # kabhi 200 nahi

@pytest.mark.django_db
def test_user_cannot_update_other_users_note(auth_client, other_auth_client, user):
    """Test 3.3a: Alice, John ke note ko PATCH se update nahi kar sakti"""

    # ---- ARRANGE ----
    note = Note(user=user, title="Original Title", content="original content")
    note.save()
    url = f'/api/notes/{note.id}/'

    # ---- ACT: Alice attack karti hai ----
    attack = other_auth_client.patch(
        url,
        {"title": "Hacked Title", "content": "hacked content"},
        format='json'
    )

    # ---- ASSERT: reject hua aur DB me kuch nahi badla ----
    assert attack.status_code in (403, 404)

    note.reload()
    assert note.title == "Original Title"
    assert note.content == "original content"

    # ---- CONTROL: John khud update kar sakta hai (endpoint sach me kaam karta hai) ----
    owner = auth_client.patch(
        url,
        {"title": "Updated By Owner", "content": "updated content"},
        format='json'
    )
    assert owner.status_code == 200

    note.reload()
    assert note.title == "Updated By Owner"


@pytest.mark.django_db
def test_user_cannot_delete_other_users_note(auth_client, other_auth_client, user):
    """Test 3.3b: Alice, John ke note ko delete nahi kar sakti"""

    note = Note(user=user, title="John Note", content="keep me")
    note.save()
    url = f'/api/notes/{note.id}/'

    # ---- ACT: Alice delete karne ki koshish karti hai ----
    attack = other_auth_client.delete(url)

    # ---- ASSERT ----
    assert attack.status_code in (403, 404)

    note.reload()
    assert note.is_deleted is False     # soft delete bhi nahi hua

    # ---- CONTROL: John khud delete kar sakta hai ----
    owner = auth_client.delete(url)
    assert owner.status_code in (200, 204)

    note.reload()
    assert note.is_deleted is True

@pytest.mark.django_db
def test_pinned_notes_appear_first_then_newest(auth_client, user):
    """Test 3.4: Pinned notes upar, uske baad newest-first order"""

    # ---- ARRANGE ----
    now = get_current_utc_time()

    Note(user=user, title="Note 1 old pinned", is_pinned=True,
         created_at=now - datetime.timedelta(days=3)).save()

    Note(user=user, title="Note 2 new unpinned", is_pinned=False,
         created_at=now - datetime.timedelta(days=1)).save()

    Note(user=user, title="Note 3 newest pinned", is_pinned=True,
         created_at=now).save()

    # ---- ACT ----
    response = auth_client.get('/api/notes/')

    # ---- ASSERT ----
    assert response.status_code == 200

    titles = [n["title"] for n in extract_notes(response)]
    assert titles == [
        "Note 3 newest pinned",
        "Note 1 old pinned",
        "Note 2 new unpinned",
    ]

def create_notes(user, specs):
    """specs = [(title, days_ago, is_pinned), ...]
    microsecond=0 isliye, ki MongoDB ms precision tak hi store karta hai
    aur cursor comparison me chhoti rounding galti na aaye."""
    base = get_current_utc_time().replace(microsecond=0)
    for title, days_ago, pinned in specs:
        Note(
            user=user,
            title=title,
            is_pinned=pinned,
            created_at=base - datetime.timedelta(days=days_ago),
        ).save()


def walk_cursor_pages(client, per_page, max_pages=10):
    """next_cursor follow karte hue saare pages ke titles collect karta hai.
    max_pages safety limit hai: agar pagination galti se same page baar baar
    deta rahe, to test infinite loop me na atke."""
    titles = []
    cursor = None
    for _ in range(max_pages):
        params = {"paginate": "true", "per_page": per_page}
        if cursor:
            params["cursor"] = cursor
        response = client.get('/api/notes/', params)
        assert response.status_code == 200

        results = response.data["results"]
        titles.extend(n["title"] for n in results)

        cursor = response.data.get("next_cursor")
        if not results or not response.data["has_next"]:
            break
    return titles


@pytest.mark.django_db
@pytest.mark.parametrize("page, expected_titles, has_next, has_prev", [
    (1, ["N1", "N2"], True, False),
    (2, ["N3", "N4"], True, True),
    (3, ["N5"], False, True),
])
def test_offset_pagination_pages_and_meta(auth_client, user, page, expected_titles, has_next, has_prev):
    """Test 3.4b: page/per_page se sahi slice aur sahi meta milna chahiye"""

    create_notes(user, [("N1", 1, False), ("N2", 2, False), ("N3", 3, False),
                        ("N4", 4, False), ("N5", 5, False)])

    response = auth_client.get('/api/notes/', {"page": page, "per_page": 2})

    assert response.status_code == 200
    assert [n["title"] for n in response.data["results"]] == expected_titles
    assert response.data["count"] == 5
    assert response.data["total_pages"] == 3
    assert response.data["current_page"] == page
    assert response.data["has_next"] is has_next
    assert response.data["has_prev"] is has_prev


@pytest.mark.django_db
def test_offset_pagination_returns_every_note_exactly_once(auth_client, user):
    """Test 3.4c: Pinned + unpinned mix me bhi koi note repeat ya miss na ho (offset mode)"""

    create_notes(user, [("P-old", 10, True), ("P-new", 5, True),
                        ("U1", 1, False), ("U2", 2, False), ("U3", 3, False)])

    collected = []
    for page in range(1, 6):
        response = auth_client.get('/api/notes/', {"page": page, "per_page": 2})
        collected.extend(n["title"] for n in response.data["results"])
        if not response.data["has_next"]:
            break

    assert collected == ["P-new", "P-old", "U1", "U2", "U3"]


@pytest.mark.django_db
@pytest.mark.parametrize("raw_value, expected_per_page", [
    ("500", 100),   # max limit se zyada: 100 pe clamp
    ("0", 1),       # 0 ya negative: kam se kam 1
    ("abc", 50),    # galat value: default 50
])
def test_per_page_is_clamped_to_safe_range(auth_client, raw_value, expected_per_page):
    """Test 3.4d: per_page ki limits kaam kar rahi hain (payload bomb se bachav)"""

    response = auth_client.get('/api/notes/', {"per_page": raw_value})

    assert response.status_code == 200
    assert response.data["per_page"] == expected_per_page


@pytest.mark.django_db
@pytest.mark.parametrize("per_page", [1, 2])
def test_cursor_pagination_returns_every_note_exactly_once(auth_client, user, per_page):
    """Test 3.4e: Cursor follow karte hue koi note repeat ya miss na ho"""

    create_notes(user, [("P-old", 10, True), ("U1", 1, False),
                        ("U2", 2, False), ("U3", 3, False)])

    assert walk_cursor_pages(auth_client, per_page) == ["P-old", "U1", "U2", "U3"]

@pytest.mark.django_db
def test_invalid_cursor_returns_400(auth_client, user):
    """Test 3.4f: Galat cursor par 400 aaye, 500 ya chupchaap page 1 nahi"""

    create_notes(user, [("N1", 1, False), ("N2", 2, False)])

    response = auth_client.get('/api/notes/', {"cursor": "not-a-valid-cursor"})

    assert response.status_code == 400
    assert "cursor" in response.data

def b64(raw):
    """Tampered/galat cursors simulate karne ke liye base64 string banata hai."""
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("utf-8")


def walk_cursor_pages_detailed(client, per_page, max_pages=20):
    """next_cursor follow karke har page ka poora response data list me deta hai."""
    pages = []
    cursor = None
    for _ in range(max_pages):
        params = {"paginate": "true", "per_page": per_page}
        if cursor:
            params["cursor"] = cursor
        response = client.get('/api/notes/', params)
        assert response.status_code == 200
        pages.append(response.data)
        if not response.data["has_next"]:
            break
        cursor = response.data["next_cursor"]
        assert cursor, "has_next True hai lekin next_cursor khaali hai"
    else:
        pytest.fail("Pagination khatam hi nahi hui (infinite loop jaisa)")
    return pages


@pytest.mark.django_db
@pytest.mark.parametrize("bad_cursor", [
    "2026-10-01T10:00:00+00:00",                # purane zamane ka plain date cursor
    b64("garbage|2026-10-01T10:00:00+00:00"),   # galat pinned flag
    b64("2|2026-10-01T10:00:00+00:00"),         # flag sirf 0 ya 1 ho sakta hai
    b64("1|not-a-date"),                        # date galat
    b64("1|"),                                  # date khaali
    "!!!???",                                   # base64 bhi nahi
], ids=["plain-iso-date", "garbage-flag", "flag-out-of-range", "bad-date", "empty-date", "not-base64"])
def test_malformed_cursor_is_rejected(auth_client, user, bad_cursor):
    """Test 3.4g: Koi bhi galat ya tampered cursor 400 de, chupchaap accept na ho"""

    create_notes(user, [("N1", 1, False), ("N2", 2, False)])

    response = auth_client.get('/api/notes/', {"cursor": bad_cursor})

    assert response.status_code == 400
    assert "cursor" in response.data


@pytest.mark.django_db
@pytest.mark.parametrize("per_page", [1, 2, 3])
def test_cursor_pagination_handles_identical_timestamps(auth_client, user, per_page):
    """Test 3.4h: Same created_at wale notes skip ya repeat nahi hone chahiye"""

    create_notes(user, [
        ("T1", 1, False), ("T2", 1, False), ("T3", 1, False),   # teeno ka timestamp same
        ("PA", 5, True), ("PB", 5, True),                       # pinned, timestamp same
        ("Old", 3, False),
    ])

    pages = walk_cursor_pages_detailed(auth_client, per_page)
    collected = [n["title"] for p in pages for n in p["results"]]

    assert len(collected) == len(set(collected)) == 6            # koi duplicate ya missing nahi
    assert set(collected[:2]) == {"PA", "PB"}                    # pinned pehle
    assert set(collected[2:5]) == {"T1", "T2", "T3"}             # phir newest
    assert collected[5] == "Old"


@pytest.mark.django_db
@pytest.mark.parametrize("total", [0, 1, 2, 3, 4, 5])
def test_cursor_last_page_has_no_next(auth_client, user, total):
    """Test 3.4i: Aakhri page par has_next False aur next_cursor None hona chahiye"""

    create_notes(user, [(f"N{i}", i + 1, False) for i in range(total)])

    pages = walk_cursor_pages_detailed(auth_client, per_page=2)

    assert len(pages) == max(1, math.ceil(total / 2))
    assert sum(len(p["results"]) for p in pages) == total
    assert pages[-1]["has_next"] is False
    assert pages[-1]["next_cursor"] is None


@pytest.mark.django_db
def test_count_is_total_in_cursor_mode(auth_client, user):
    """Test 3.4j: Cursor follow karte waqt count ghatna nahi chahiye, total hi rehna chahiye"""

    create_notes(user, [(f"N{i}", i + 1, False) for i in range(5)])

    pages = walk_cursor_pages_detailed(auth_client, per_page=2)

    assert [p["count"] for p in pages] == [5, 5, 5]


@pytest.mark.django_db
def test_cursor_pages_never_include_deleted_or_other_users_notes(auth_client, user, other_user):
    """Test 3.4k (guard): Composite cursor filter se trashed ya doosre user ke notes na aa jayein"""

    create_notes(user, [("P1", 5, True), ("U1", 1, False), ("U2", 2, False), ("U3", 3, False)])
    create_notes(other_user, [("ALICE-P", 4, True), ("ALICE-U", 1, False)])

    now = get_current_utc_time()
    Note(user=user, title="TRASHED-P", is_pinned=True, is_deleted=True,
         created_at=now - datetime.timedelta(days=6)).save()
    Note(user=user, title="TRASHED-U", is_pinned=False, is_deleted=True,
         created_at=now - datetime.timedelta(days=2)).save()

    for per_page in (1, 2):
        pages = walk_cursor_pages_detailed(auth_client, per_page)
        collected = [n["title"] for p in pages for n in p["results"]]
        assert collected == ["P1", "U1", "U2", "U3"]


@pytest.mark.django_db
def test_cursor_from_another_user_does_not_leak_notes(auth_client, other_auth_client, user, other_user):
    """Test 3.4l (guard): John ka cursor Alice use kare, tab bhi John ke notes na dikhein"""

    create_notes(user, [("J1", 1, False), ("J2", 2, False), ("J3", 3, False)])
    create_notes(other_user, [("A1", 1, False), ("A2", 5, False)])

    john_page1 = auth_client.get('/api/notes/', {"paginate": "true", "per_page": 1}).data
    john_cursor = john_page1["next_cursor"]

    alice = other_auth_client.get('/api/notes/', {"cursor": john_cursor, "per_page": 10})

    assert alice.status_code == 200
    titles = [n["title"] for n in alice.data["results"]]
    assert "A2" in titles                                   # Alice ka apna data aa raha hai
    assert not any(t.startswith("J") for t in titles)       # John ka kuch nahi

@pytest.mark.django_db
def test_empty_cursor_is_treated_as_no_cursor(auth_client, user):
    """Test 3.4m: ?cursor= (khaali) pehle page jaisa chale, 400 nahi"""

    create_notes(user, [(f"N{i}", i + 1, False) for i in range(3)])

    response = auth_client.get('/api/notes/', {"cursor": "", "per_page": 2})

    assert response.status_code == 200
    assert [n["title"] for n in response.data["results"]] == ["N0", "N1"]
    assert response.data["has_next"] is True


@pytest.mark.django_db
def test_cursor_still_works_after_last_seen_note_is_trashed(auth_client, user):
    """Test 3.4n: Cursor ek note ki value se bana hai, note exist karna zaruri nahi.
    User page 1 ke baad us note ko trash kar de, tab bhi page 2 sahi aaye."""

    create_notes(user, [("N1", 1, False), ("N2", 2, False), ("N3", 3, False), ("N4", 4, False)])

    page1 = auth_client.get('/api/notes/', {"paginate": "true", "per_page": 2}).data
    assert [n["title"] for n in page1["results"]] == ["N1", "N2"]

    Note.objects(title="N2").update(set__is_deleted=True)     # cursor wala note trash

    page2 = auth_client.get('/api/notes/', {"cursor": page1["next_cursor"], "per_page": 2})

    assert page2.status_code == 200
    assert [n["title"] for n in page2.data["results"]] == ["N3", "N4"]


@pytest.mark.django_db
def test_page_param_is_ignored_in_cursor_mode(auth_client, user):
    """Test 3.4o: Cursor ke saath page bhi bhej do to page ignore ho (double skip na lage)"""

    create_notes(user, [(f"N{i}", i + 1, False) for i in range(5)])
    cursor = auth_client.get('/api/notes/', {"paginate": "true", "per_page": 2}).data["next_cursor"]

    without_page = auth_client.get('/api/notes/', {"cursor": cursor, "per_page": 2})
    with_page = auth_client.get('/api/notes/', {"cursor": cursor, "per_page": 2, "page": 3})

    assert with_page.status_code == 200
    assert [n["title"] for n in with_page.data["results"]] == \
           [n["title"] for n in without_page.data["results"]]

@pytest.mark.django_db
@pytest.mark.parametrize("title", [
    "a" * 201,     # limit se ek zyada
    "a" * 500,     # checklist ka example: 500 characters
])
def test_create_note_rejects_too_long_title(auth_client, title):
    """Test 3.5a: 200 characters se lamba title reject hona chahiye"""

    response = auth_client.post('/api/notes/', {"title": title, "content": "x"}, format='json')

    assert response.status_code == 400
    assert Note.objects.count() == 0     # DB me kuch save nahi hua


@pytest.mark.django_db
@pytest.mark.parametrize("payload", [
    {"title": "", "content": "x"},
    {"title": "   ", "content": "x"},
    {"content": "x"},                    # title key hi nahi bheji
], ids=["empty", "only-spaces", "missing"])
def test_empty_or_missing_title_becomes_untitled(auth_client, payload):
    """Test 3.5a2: Khaali/missing title reject nahi hota, 'Untitled' ban jata hai
    (ye is app ka intentional design hai.)"""

    response = auth_client.post('/api/notes/', payload, format='json')

    assert response.status_code == 201
    assert response.data["title"] == "Untitled"

    note = Note.objects.get()            # exactly ek note hona chahiye
    assert note.title == "Untitled"


@pytest.mark.django_db
def test_create_note_accepts_title_at_exact_limit(auth_client):
    """Test 3.5b (boundary): Exactly 200 character ka title allowed hona chahiye"""

    response = auth_client.post('/api/notes/', {"title": "a" * 200, "content": "x"}, format='json')

    assert response.status_code == 201
    assert Note.objects.count() == 1


@pytest.mark.django_db
def test_create_note_rejects_too_long_content(auth_client):
    """Test 3.5c: 50,000 characters se lamba content reject hona chahiye"""

    response = auth_client.post(
        '/api/notes/',
        {"title": "Big note", "content": "a" * 50001},
        format='json'
    )

    assert response.status_code == 400
    assert Note.objects.count() == 0


@pytest.mark.django_db
@pytest.mark.parametrize("item_count, expected_status", [
    (100, 201),    # exactly limit: allowed
    (101, 400),    # limit + 1: reject
    (150, 400),    # checklist ka example
])
def test_checklist_items_count_cap(auth_client, item_count, expected_status):
    """Test 3.5d: Checklist me maximum 100 items allowed hain"""

    payload = {
        "title": "Big checklist",
        "is_checklist": True,
        "items": [{"text": f"item {i}", "checked": False} for i in range(item_count)]
    }

    response = auth_client.post('/api/notes/', payload, format='json')

    assert response.status_code == expected_status
    if expected_status == 400:
        assert Note.objects.count() == 0


@pytest.mark.django_db
def test_checklist_item_text_too_long(auth_client):
    """Test 3.5e: Checklist item ka text 500 characters se zyada nahi hona chahiye"""

    payload = {
        "title": "Checklist",
        "is_checklist": True,
        "items": [{"text": "a" * 501, "checked": False}]
    }

    response = auth_client.post('/api/notes/', payload, format='json')

    assert response.status_code == 400
    assert Note.objects.count() == 0