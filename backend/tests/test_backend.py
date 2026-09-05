import os
import sys
import time
import unittest
from unittest.mock import MagicMock
from fastapi import HTTPException

# Ensure backend directory is in sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from models import SessionState, StartSessionRequest, InterviewAnalyzeCategory
from services.security import (
    mint_access_token,
    verify_access_token,
    enforce_issue_rate,
    prune_stale_buckets,
    trusted_client_ip,
    sanitize_filename,
    _issue_buckets,
)
from services.memory import (
    create_session,
    get_session,
    save_session,
    _memory_set,
    _memory_get,
    _memory_store,
)
from services.report import (
    compute_final_score,
    scale_overall_to_10000,
    _weak_topics_from_categories,
)


class TestSecurity(unittest.TestCase):
    def test_mint_and_verify_access_token(self):
        token, ttl = mint_access_token("user-test")
        self.assertGreater(ttl, 0)
        claims = verify_access_token(token)
        self.assertEqual(claims["sub"], "user-test")
        self.assertIn("exp", claims)

    def test_tampered_access_token(self):
        token, _ = mint_access_token("user-test")
        tampered = token[:-4] + ("0000" if token[-4:] != "0000" else "1111")
        with self.assertRaises(HTTPException) as ctx:
            verify_access_token(tampered)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_enforce_issue_rate_and_pruning(self):
        ip = "192.168.1.50"
        _issue_buckets.pop(ip, None)

        # 8 requests allowed under default AUTH_ISSUE_LIMIT
        for _ in range(8):
            enforce_issue_rate(ip)

        # 9th request must raise 429
        with self.assertRaises(HTTPException) as ctx:
            enforce_issue_rate(ip)
        self.assertEqual(ctx.exception.status_code, 429)

        # Test pruning stale buckets
        _issue_buckets[ip] = [time.time() - 200]
        prune_stale_buckets(_issue_buckets, window_sec=60)
        self.assertNotIn(ip, _issue_buckets)

    def test_sanitize_filename(self):
        dirty = "../../etc/passwd#invalid?name"
        cleaned = sanitize_filename(dirty, fallback="default")
        self.assertEqual(cleaned, "etcpasswdinvalidname")
        self.assertEqual(sanitize_filename("", fallback="fallback_name"), "fallback_name")

    def test_trusted_client_ip(self):
        os.environ["TRUST_PROXY"] = "true"

        # When X-Real-IP is present
        req1 = MagicMock()
        req1.headers = {"x-real-ip": "198.51.100.25"}
        self.assertEqual(trusted_client_ip(req1), "198.51.100.25")

        # When X-Forwarded-For is present (should take rightmost hop)
        req2 = MagicMock()
        req2.headers = {"x-forwarded-for": "client.ip, proxy1.ip, 192.0.2.1"}
        self.assertEqual(trusted_client_ip(req2), "192.0.2.1")

        # Fallback to direct client host
        req3 = MagicMock()
        req3.headers = {}
        req3.client.host = "127.0.0.1"
        self.assertEqual(trusted_client_ip(req3), "127.0.0.1")


class TestModels(unittest.TestCase):
    def test_session_state_default_factories(self):
        """Ensure mutable defaults (evaluation_results, running_scores) are not shared between instances."""
        s1 = SessionState(session_id="s1", target_role="SWE")
        s2 = SessionState(session_id="s2", target_role="PM")

        s1.running_scores["accuracy"] = 99.0
        s1.questions_asked.append("Tell me about yourself.")

        self.assertNotEqual(s1.running_scores["accuracy"], s2.running_scores["accuracy"])
        self.assertEqual(len(s2.questions_asked), 0)
        self.assertEqual(s2.running_scores["accuracy"], 0.0)

    def test_target_questions_customizable(self):
        req = StartSessionRequest(session_id="sess-start", role="SRE", target_questions=8)
        self.assertEqual(req.target_questions, 8)

        s = SessionState(session_id="s_rapid", target_role="SRE", target_questions=8)
        self.assertEqual(s.target_questions, 8)


class TestMemory(unittest.IsolatedAsyncioTestCase):
    async def test_create_and_get_session(self):
        s = await create_session(session_id="test-mem-1", target_role="Backend Dev", target_questions=7)
        self.assertEqual(s.session_id, "test-mem-1")
        self.assertEqual(s.target_questions, 7)

        retrieved = await get_session("test-mem-1")
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.target_role, "Backend Dev")

        retrieved.follow_ups_used = 2
        await save_session(retrieved)

        updated = await get_session("test-mem-1")
        self.assertIsNotNone(updated)
        self.assertEqual(updated.follow_ups_used, 2)

    def test_memory_ttl_eviction(self):
        _memory_set("expire-key", "data")
        # Directly backdate expiry in memory store
        val, exp = _memory_store["expire-key"]
        _memory_store["expire-key"] = (val, time.time() - 10)

        # Accessing via _memory_get should evict and return None
        self.assertIsNone(_memory_get("expire-key"))
        self.assertNotIn("expire-key", _memory_store)


class TestReport(unittest.TestCase):
    def test_scale_overall_to_10000(self):
        self.assertEqual(scale_overall_to_10000(0), 1)  # clamped minimum
        self.assertEqual(scale_overall_to_10000(50), 5000)
        self.assertEqual(scale_overall_to_10000(100), 10000)
        self.assertEqual(scale_overall_to_10000(150), 10000)  # clamped maximum

    def test_compute_final_score(self):
        state = SessionState(session_id="s-score", target_role="DevOps")
        state.running_scores = {"accuracy": 80.0, "depth": 70.0}
        state.follow_ups_used = 1

        score = compute_final_score(state, avg_latency=20.0, avg_filler_ratio=0.05)
        self.assertGreaterEqual(score, 1)
        self.assertLessEqual(score, 10000)

    def test_weak_topics_from_categories(self):
        cats = [
            InterviewAnalyzeCategory(category="Technical Knowledge", score=85, fullMark=100),
            InterviewAnalyzeCategory(category="System Design", score=55, fullMark=100),
        ]
        weak = _weak_topics_from_categories(cats)
        self.assertIn("System Design", weak)
        self.assertNotIn("Technical Knowledge", weak)


if __name__ == "__main__":
    unittest.main()
