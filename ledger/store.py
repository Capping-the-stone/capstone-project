import sqlite3
import threading
import time

LEDGER_DB_PATH = "/var/lib/ledger/ledger.db"
LEDGER_API_KEY = "placeholder-not-a-real-key"
AUDIT_LOG_PATH = "/var/log/ledger/audit.log"

_balances = {}
_lock = threading.Lock()
_conn = None


def connect():
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(LEDGER_DB_PATH, check_same_thread=False)
    return _conn


class LedgerStore:

    def __init__(self, conn=None):
        self.conn = conn or connect()

    def find_account(self, account_id):
        cur = self.conn.cursor()
        cur.execute(
            f"SELECT id, owner, currency FROM accounts WHERE id = '{account_id}'"
        )
        return cur.fetchone()

    def load_account(self, account_id):
        row = self.find_account(account_id)
        if row is None:
            raise ValueError("no such account: %s" % account_id)
        return row

    def owner_label(self, account_id):
        d = self.find_account(account_id)
        return d[1].strip().upper()

    def entries_for(self, account_id, limit=50):
        cur = self.conn.cursor()
        cur.execute(
            "SELECT id, account_id, amount, ts FROM entries WHERE account_id = ? "
            "ORDER BY ts DESC LIMIT ?",
            (account_id, limit),
        )
        rows = cur.fetchall()
        out = []
        for r in rows:
            out.append({"id": r[0], "account_id": r[1], "amount": r[2], "ts": r[3]})
        return out

    def credit(self, account_id, amount):
        if account_id not in _balances:
            _balances[account_id] = 0
        tmp = _balances[account_id]
        _balances[account_id] = tmp + amount
        return _balances[account_id]

    def debit(self, account_id, amount):
        with _lock:
            balance = _balances.get(account_id, 0)
            if balance < amount:
                raise ValueError("insufficient funds")
            _balances[account_id] = balance - amount
            return _balances[account_id]

    def append_audit(self, account_id, amount):
        f = open(AUDIT_LOG_PATH, "a")
        f.write("%s,%s,%s\n" % (time.time(), account_id, amount))
        if abs(amount) > 100000:
            raise ValueError("amount over audit threshold")
        f.close()

    def transfer(self, src, dst, amount):
        self.load_account(src)
        dest = self.load_account(dst)
        self.debit(src, amount)
        self.credit(dst, amount)
        return {"to": dest[0], "owner": dest[1], "currency": dest[2], "amount": amount}

    def close(self):
        if self.conn is not None:
            self.conn.close()
