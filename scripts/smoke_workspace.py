"""Exercise the real HTTP/MySQL/Redis stack using isolated temporary users.

The optional local provider is a protocol fixture, not a real model service.
No existing user's records or credentials are read or changed.
"""

import argparse
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import json
import os
from pathlib import Path
import secrets
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen


class Client:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip("/")
        self.token = None
        self.passed = 0

    def request(self, method, path, body=None, expect_success=True):
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        request = Request(
            self.base_url + path,
            data=None if body is None else json.dumps(body).encode("utf-8"),
            headers=headers,
            method=method,
        )
        try:
            with urlopen(request, timeout=45) as response:
                status, payload = response.status, json.load(response)
        except HTTPError as error:
            status, payload = error.code, json.load(error)
        if expect_success:
            if status >= 400 or payload.get("success") is not True:
                raise AssertionError(f"{method} {path}: status={status}, message={payload.get('message')}")
            return payload.get("data")
        if status < 400 and payload.get("success") is not False:
            raise AssertionError(f"{method} {path}: unexpectedly accepted an invalid request")
        payload["responseStatus"] = status
        return payload

    def check(self, condition, label):
        if not condition:
            raise AssertionError(label)
        self.passed += 1
        print(f"PASS {label}")


def check_appearance(first, second):
    original = first.request("GET", "/api/data/settings/SettingsData")
    first.check(original["appearance"]["background"] == "plain", "default workspace background stays plain")
    for background in ("dots", "watermark", "plain"):
        saved = first.request("PUT", "/api/data/settings/appearance", {"background": background})
        first.check(saved["appearance"]["background"] == background
                    and first.request("GET", "/api/data/settings/SettingsData")["appearance"]["background"] == background,
                    f"{background} background persists across requests")
        first.check(second.request("GET", "/api/data/settings/SettingsData")["appearance"]["background"] == "plain",
                    f"{background} background respects account isolation")
    for invalid in ({}, {"background": None}, {"background": ""}, {"background": "image"}):
        result = first.request("PUT", "/api/data/settings/appearance", invalid, False)
        first.check(result["responseStatus"] == 400, "invalid background rejected before persistence")
    saved = first.request("GET", "/api/data/settings/SettingsData")
    first.check(saved["appearance"]["background"] == "plain"
                and all(saved[section] == original[section] for section in ("apps", "notifications", "reports", "security")),
                "background updates preserve other settings and invalid writes leave saved preference unchanged")


def check_ai_protocol(first, second):
    provider_key = secrets.token_urlsafe(24)
    provider_requests = []

    class ProtocolFixture(BaseHTTPRequestHandler):
        def log_message(self, *_arguments):
            pass

        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            valid = (self.path == "/v1/chat/completions"
                     and self.headers.get("Authorization") == f"Bearer {provider_key}"
                     and body.get("model") == "protocol-fixture"
                     and isinstance(body.get("messages"), list))
            provider_requests.append(valid)
            payload = json.dumps({"choices": [{"message": {"role": "assistant", "content": "Test protocol completion"}}]}).encode()
            self.send_response(200 if valid else 400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    server = ThreadingHTTPServer(("127.0.0.1", 0), ProtocolFixture)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        settings = {"provider": "OpenAI Compatible", "model": "protocol-fixture", "temperature": 0.5,
                    "maxTokens": 128, "language": "中文", "systemPrompt": "Protocol test only",
                    "features": {"smartSummary": False, "autoTag": False,
                                 "dailyReviewDraft": False, "emailComposeAssist": False},
                    "baseUrl": f"http://127.0.0.1:{server.server_port}/v1", "apiKey": provider_key}
        saved = first.request("PUT", "/api/data/settings/ai", settings)
        first.check(saved["ai"]["configured"] and provider_key not in json.dumps(saved), "provider credential stored without disclosure")
        first.request("POST", "/ai/test")
        conversation = first.request("POST", "/ai/conversations", {"title": "Protocol test"})
        reply = first.request("POST", f"/ai/conversations/{conversation['id']}/messages", {"content": "Test message"})
        first.check(reply["assistantMessage"]["content"] == "Test protocol completion", "compatible API receives model/messages and returns actual response")
        first.check(provider_requests and all(provider_requests), "compatible request path and Bearer header")
        first.check(len(first.request("GET", f"/ai/conversations/{conversation['id']}/messages")) == 2, "AI conversation messages persist")
        second.request("GET", f"/ai/conversations/{conversation['id']}/messages", expect_success=False)
        second.request("DELETE", f"/ai/conversations/{conversation['id']}", expect_success=False)
        first.check(second.request("GET", "/ai/conversations") == [], "AI conversation user isolation")
        settings["apiKey"] = ""
        first.check(first.request("PUT", "/api/data/settings/ai", settings)["ai"]["configured"], "blank submitted provider key preserves credential")
        first.request("DELETE", "/api/data/settings/ai/credentials")
        first.check(not first.request("GET", "/ai/config")["configured"], "explicit credential removal")
        first.request("DELETE", f"/ai/conversations/{conversation['id']}")
    finally:
        server.shutdown()
        server.server_close()


def check_mail_accounts(first, second, email):
    """Validate account persistence and authorization without contacting a mail provider."""
    providers = first.request("GET", "/mail/providers")
    presets = {provider["id"]: provider for provider in providers}
    first.check({"qq", "163", "126", "gmail", "outlook", "icloud", "custom"} <= presets.keys(),
                "all supported mail providers expose connection presets")
    first.check(presets["outlook"]["authType"] == "oauth2"
                and presets["outlook"]["smtpSecurity"] == "starttls",
                "Outlook preset requires OAuth2 with STARTTLS")
    for provider_id in ("qq", "163", "126", "gmail", "outlook", "icloud"):
        provider_secret = secrets.token_urlsafe(3000 if provider_id == "outlook" else 24)
        provider_account = first.request("POST", "/mail/accounts/upsert", {
            "provider": provider_id, "email": f"{provider_id}-{email}",
            "password": provider_secret,
        })
        preset = presets[provider_id]
        first.check(all(provider_account[field] == preset[field] for field in (
            "authType", "imapHost", "imapPort", "imapSecurity", "smtpHost", "smtpPort", "smtpSecurity")),
            f"{provider_id} account applies real provider protocol settings")
        if provider_id == "outlook":
            first.check(provider_account["credentialConfigured"]
                        and provider_secret not in json.dumps(provider_account),
                        "long OAuth2 access tokens are accepted without disclosure")
        first.request("DELETE", f"/mail/accounts/{provider_account['id']}")
    test_secret = secrets.token_urlsafe(24)
    account_input = {
        "provider": "custom", "email": email, "displayName": "Smoke mailbox", "username": email,
        "imapHost": "imap.example.invalid", "imapPort": 993, "imapSecurity": "ssl",
        "smtpHost": "smtp.example.invalid", "smtpPort": 465, "smtpSecurity": "ssl",
        "enabled": True, "isDefault": True, "password": test_secret, "authType": "password",
    }
    account = first.request("POST", "/mail/accounts/upsert", account_input)
    account_id = account["id"]
    first.check(account["credentialConfigured"] and "password" not in account
                and test_secret not in json.dumps(account), "mail account credential stored without disclosure")
    first.check(first.request("GET", "/mail/accounts")[0]["id"] == account_id
                and second.request("GET", "/mail/accounts") == [], "mail accounts persist with user isolation")
    second.request("GET", f"/mail?accountId={account_id}", expect_success=False)
    second.request("DELETE", f"/mail/accounts/{account_id}", expect_success=False)
    second.request("POST", f"/mail/accounts/{account_id}/sync", expect_success=False)
    second.request("POST", f"/mail/accounts/{account_id}/test", expect_success=False)
    second.request("POST", "/mail/send", {
        "accountId": account_id, "recipient": email, "subject": "Unauthorized", "body": "No delivery",
    }, expect_success=False)
    first.check(True, "mail list sync send and delete reject another user's account before transport")
    draft = first.request("POST", "/mail/upsert", {
        "accountId": account_id, "recipient": email, "subject": "Linked draft", "folder": "draft",
    })
    filtered = first.request("GET", f"/mail?accountId={account_id}")
    first.check(draft["accountId"] == account_id and len(filtered) == 1
                and filtered[0]["id"] == draft["id"], "draft persists and filters by mail account")
    first.request("PATCH", f"/mail/{draft['id']}", {"folder": "sent"}, expect_success=False)
    first.request("POST", "/mail/upsert", {"subject": "Fake sent", "folder": "sent"}, expect_success=False)
    first.request("POST", f"/mail/{draft['id']}/recover-send", expect_success=False)
    first.check(True, "draft CRUD cannot forge successful delivery or recover an unsent draft")
    account_input.update({"id": account_id, "password": ""})
    first.check(first.request("POST", "/mail/accounts/upsert", account_input)["credentialConfigured"],
                "blank mailbox password preserves encrypted credential")
    duplicate_input = {**account_input, "id": None}
    first.request("POST", "/mail/accounts/upsert", duplicate_input, expect_success=False)
    first.check(len(first.request("GET", "/mail/accounts")) == 1,
                "duplicate mailbox rejected without overwriting existing account")
    for updates in ({"imapSecurity": "none"}, {"smtpHost": "https://smtp.example.invalid/path"},
                    {"smtpPort": 0}, {"enabled": False, "isDefault": True}):
        first.request("POST", "/mail/accounts/upsert", {**account_input, **updates}, expect_success=False)
    first.check(first.request("GET", "/mail/accounts")[0]["status"] == "unverified",
                "invalid TLS host port and disabled default leave mailbox unchanged")
    connection_test = first.request("POST", f"/mail/accounts/{account_id}/test")
    failed_account = first.request("GET", "/mail/accounts")[0]
    first.check(connection_test["success"] is False and failed_account["status"] == "error"
                and test_secret not in json.dumps(failed_account),
                "unreachable reserved test host reports connection failure without credential disclosure")
    first.request("POST", "/mail/send", {
        "id": draft["id"], "accountId": account_id, "recipient": email,
        "subject": "Linked draft", "body": "No external delivery: reserved invalid test host",
    }, expect_success=False)
    failed_draft = first.request("GET", f"/mail?accountId={account_id}")[0]
    first.check(failed_draft["id"] == draft["id"] and failed_draft["folder"] == "draft",
                "SMTP connection failure preserves the same editable draft")
    first.request("DELETE", f"/mail/{draft['id']}")
    first.request("DELETE", f"/mail/accounts/{account_id}")
    first.check(first.request("GET", "/mail/accounts") == [], "mail account deletion persists")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8080")
    parser.add_argument("--keep-fixtures", action="store_true", help="Retain isolated test records for debugging")
    parser.add_argument("--verify-frontend-routes", action="store_true", help="Verify SPA fallbacks when base-url is the frontend proxy")
    arguments = parser.parse_args()
    first, second = Client(arguments.base_url), Client(arguments.base_url)
    suffix = datetime.now().strftime("%Y%m%d%H%M%S") + secrets.token_hex(3)
    password = secrets.token_urlsafe(24)
    emails = [f"codex-smoke-{suffix}-{index}@example.invalid" for index in (1, 2)]
    print(f"Temporary test account suffix: {suffix}")
    try:
        if arguments.verify_frontend_routes:
            for path in ("/auth/auth2/login", "/auth/404", "/dashboards/modern"):
                with urlopen(arguments.base_url.rstrip("/") + path, timeout=10) as response:
                    page = response.read().decode("utf-8")
                    first.check(response.status == 200 and '<div id="root"></div>' in page,
                                f"SPA fallback preserves {path}")
        run_checks(first, second, password, emails)
        print(f"Completed {first.passed} checks.")
    finally:
        for client in (first, second):
            if client.token:
                try:
                    client.request("POST", "/auth/logout")
                except Exception:
                    print("Could not revoke a test session; it will expire normally.")
        if not arguments.keep_fixtures:
            cleanup_fixtures(suffix)
        else:
            print(f"Retained test records with suffix: {suffix}")


def cleanup_fixtures(suffix):
    root = Path(__file__).resolve().parents[1]
    repository = Path.home() / ".m2" / "repository"
    jars = []
    for group, artifact in (("com/mysql", "mysql-connector-j"), ("org/yaml", "snakeyaml")):
        candidates = [path for path in (repository / group / artifact).glob(f"*/{artifact}-*.jar")
                      if not path.name.endswith(("-sources.jar", "-javadoc.jar"))]
        if not candidates:
            raise RuntimeError(f"Missing JDBC maintenance dependency {artifact}; cleanup suffix: {suffix}")
        jars.append(str(max(candidates, key=lambda path: path.stat().st_mtime)))
    subprocess.run([
        "java", "--class-path", os.pathsep.join(jars), "scripts/DatabaseMaintenance.java",
        "backend/mindforge-server/src/main/resources/application-dev.yml", "cleanup-smoke", suffix,
    ], cwd=root, check=True)


def run_checks(first, second, password, emails):
    origin = "http://127.0.0.1:5174"
    preflight = Request(first.base_url + "/projects", method="OPTIONS", headers={
        "Origin": origin, "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization",
    })
    with urlopen(preflight, timeout=10) as response:
        first.check(200 <= response.status < 300 and response.headers.get("Access-Control-Allow-Origin") == origin,
                    "Bearer CORS preflight accepted for configured frontend")
    for client, email in zip((first, second), emails):
        client.request("POST", "/auth/register", {"nickname": "Smoke test", "email": email, "password": password})
        client.token = client.request("POST", "/auth/login", {"email": email, "password": password, "remember": False})["token"]

    anonymous = Client(first.base_url)
    anonymous.request("GET", "/dashboard/summary", expect_success=False)
    first.check(True, "anonymous requests rejected")
    first.request("POST", "/auth/register", {"nickname": "Duplicate", "email": emails[0], "password": password}, False)
    first.check(True, "duplicate registration rejected")
    profile = first.request("GET", "/users/me")
    first.check("password" not in profile, "profile excludes password hash")
    first.request("PUT", "/users/me", {**profile, "nickname": "Smoke test updated"})
    first.check(first.request("GET", "/users/me")["nickname"] == "Smoke test updated", "profile persists")

    date = datetime.now(timezone(timedelta(hours=8))).date().isoformat()
    first.request("PUT", "/daily-reviews", {"date": date, "content": "# Persisted review"})
    first.check(first.request("GET", f"/daily-reviews?date={date}") == "# Persisted review", "review persists")
    first.request("DELETE", f"/daily-reviews/{date}")
    first.request("PUT", "/daily-reviews", {"date": date, "content": "Restored"})
    first.check(first.request("GET", f"/daily-reviews?date={date}") == "Restored", "deleted review can be recreated")
    first.check(second.request("GET", f"/daily-reviews?date={date}") in (None, ""), "review user isolation")
    first.request("PUT", "/api/data/settings/reports", {"weekStartsOn": "星期日"})
    report = first.request("GET", f"/daily-reviews/report?type=weekly&date={date}")
    selected = datetime.strptime(date, "%Y-%m-%d").date()
    week_start = selected - timedelta(days=(selected.weekday() + 1) % 7)
    first.check(report["startDate"] == week_start.isoformat() and len(report["entries"]) == 1,
                "weekly report honors saved start day and actual entries")

    project = first.request("POST", "/projects", {"name": "Smoke project", "description": "Temporary", "status": "规划中"})
    project_id = project["id"]
    requirement = first.request("POST", f"/projects/{project_id}/requirements", {
        "title": "Smoke requirement", "description": "", "priority": "中", "status": "待处理"})
    defect = first.request("POST", f"/projects/{project_id}/defects", {
        "title": "Smoke defect", "description": "", "reproductionSteps": "", "requirementId": requirement["id"],
        "severity": "一般", "priority": "中", "status": "待修复"})
    first.check(len(first.request("GET", f"/projects/{project_id}")["requirements"]) == 1, "project children persist")
    second.request("GET", f"/projects/{project_id}", expect_success=False)
    second.request("DELETE", f"/projects/{project_id}/defects/{defect['id']}", expect_success=False)
    first.check(True, "project read/write user isolation")

    empty_notes = first.request("GET", "/api/data/notes/NotesData")
    first.check(empty_notes["folders"] == [] and empty_notes["notes"] == [], "new notes workspace has no default inbox")
    missing_folder = first.request("POST", "/api/notes/add", {"title": "Missing folder", "content": "Invalid"}, False)
    first.check(missing_folder["responseStatus"] == 400, "new notes require an explicit folder")
    created_folder = first.request("POST", "/api/notes/folders/add", {"name": "Smoke folder", "parentId": None})
    folder = created_folder["folder"]
    first.check(len(created_folder["folders"]) == 1 and created_folder["folders"][0]["name"] == "Smoke folder", "first folder creation adds no extra inbox")
    notes = first.request("POST", "/api/notes/add", {"title": "Smoke note", "content": "# Content", "folderId": folder["id"]})
    note_id = next(note["id"] for note in notes["notes"] if note["title"] == "Smoke note")
    first.request("PUT", "/api/notes/update", {"id": note_id, "content": "Updated"})
    first.check(first.request("GET", "/api/data/notes/NotesData")["notes"][0]["content"] == "Updated", "note content persists")
    second.request("PUT", "/api/notes/update", {"id": note_id, "content": "Unauthorized"}, False)
    second.request("POST", "/api/notes/add", {"title": "Invalid ownership", "folderId": folder["id"]}, False)
    first.check(True, "note and folder user isolation")

    posts = first.request("POST", "/api/blog/add", {"title": "Smoke post", "content": "# Blog", "published": False})
    post_id = posts[0]["id"]
    first.request("POST", "/api/blog/comments/add", {"postId": post_id, "comment": "Persisted comment"})
    first.check(len(first.request("GET", "/api/data/blog/BlogPosts")[0]["comments"]) == 1, "blog and comment persist")
    second.request("DELETE", "/api/blog/delete", {"id": post_id}, False)
    first.check(second.request("GET", "/api/data/blog/BlogPosts") == [], "blog user isolation")

    account = first.request("POST", "/finance/accounts", {"name": "Smoke cash", "type": "现金", "balance": "100.00"})
    transaction = first.request("POST", "/finance/transactions", {
        "date": date, "type": "支出", "category": "Smoke category", "description": "Temporary",
        "accountId": account["id"], "amount": "25.35", "source": "手动录入"})
    summary = first.request("GET", "/finance/summary")
    first.check(Decimal(str(summary["totalAssets"])) == Decimal("74.65"), "ledger derives exact decimal balance")
    first.check(Decimal(str(summary["monthExpense"])) == Decimal("25.35"), "current-month financial statistics")
    budgets = first.request("PUT", "/finance/budgets", {"month": date[:7], "category": "Smoke category", "budget": "50.00"})
    first.check(len(budgets) == 1 and Decimal(str(budgets[0]["spent"])) == Decimal("25.35"),
                "budget derives spending from ledger")
    budgets = first.request("PUT", "/finance/budgets", {"month": date[:7], "category": "Smoke category", "budget": "75.00"})
    first.check(len(budgets) == 1 and Decimal(str(budgets[0]["budget"])) == Decimal("75"),
                "budget category upsert preserves one record")
    invalid_month = first.request("GET", "/finance/budgets?month=2026-99", expect_success=False)
    first.check(invalid_month["responseStatus"] == 400, "malformed month returns actionable client error")
    first.request("POST", "/finance/transactions", {"date": "0999-01-01", "type": "收入", "category": "Invalid date", "accountId": account["id"], "amount": "1.00"}, False)
    first.check(True, "out-of-range transaction date rejected")
    second.request("POST", "/finance/transactions", {"date": date, "type": "收入", "category": "Unauthorized", "accountId": account["id"], "amount": "1.00"}, False)
    first.request("POST", "/finance/transactions", {"date": date, "type": "支出", "category": "Invalid", "accountId": account["id"], "amount": "0.001"}, False)
    first.check(True, "finance account ownership and precision validation")
    first.request("DELETE", f"/finance/accounts/{account['id']}", expect_success=False)
    first.request("DELETE", f"/finance/transactions/{transaction['id']}")
    first.check(Decimal(str(first.request("GET", "/finance/summary")["totalAssets"])) == Decimal("100"), "deleting transaction restores balance")
    first.request("DELETE", f"/finance/budgets/{budgets[0]['id']}")
    first.check(first.request("GET", "/finance/budgets") == [], "budget deletion persists")

    mail = first.request("POST", "/mail/upsert", {"recipient": emails[1], "subject": "Smoke draft", "body": "Temporary", "folder": "draft"})
    china_time = timezone(timedelta(hours=8))
    created_time = datetime.fromisoformat(mail["createdAt"])
    if created_time.tzinfo is None:
        created_time = created_time.replace(tzinfo=china_time)
    first.check(abs((datetime.now(china_time) - created_time).total_seconds()) < 60,
                "mail creation timestamps use the configured Asia/Shanghai business timezone")
    first.request("PATCH", f"/mail/{mail['id']}", {"starred": True})
    first.check(first.request("GET", "/mail")[0]["starred"] is True, "mail draft and star persist")
    second.request("PATCH", f"/mail/{mail['id']}", {"folder": "trash"}, False)
    first.check(second.request("GET", "/mail") == [], "mail user isolation")
    check_mail_accounts(first, second, emails[0])

    settings = first.request("GET", "/api/data/settings/SettingsData")
    check_appearance(first, second)
    first.check(not settings["ai"].get("apiKey"), "settings never reveal provider key")
    invalid_apps = first.request("PUT", "/api/data/settings/apps", [None], False)
    first.check(invalid_apps["responseStatus"] == 400, "null integration entries rejected before persistence")
    first.check(first.request("GET", "/dashboard/summary")["noteCount"] == 1, "dashboard uses persisted data")
    check_ai_protocol(first, second)

    first.request("DELETE", f"/mail/{mail['id']}")
    first.request("DELETE", f"/finance/accounts/{account['id']}")
    first.request("DELETE", "/api/blog/delete", {"id": post_id})
    deleted_folder = first.request("DELETE", "/api/notes/folders/delete", {"id": folder["id"]})
    first.check(deleted_folder["folders"] == [] and deleted_folder["notes"] == [], "deleting last folder restores empty workspace")
    for client in (first, second):
        client.request("POST", "/auth/logout")
    first.request("GET", "/users/me", expect_success=False)
    first.check(True, "logout revokes token")
    for client in (first, second):
        client.token = None


if __name__ == "__main__":
    main()
