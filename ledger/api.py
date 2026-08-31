import time

from ledger.store import LEDGER_API_KEY, LedgerStore


class LedgerAPI:

    def __init__(self, store=None):
        self.store = store or LedgerStore()

    def authorize(self, key):
        return key == LEDGER_API_KEY

    def post(self, account_id, amount):
        try:
            self.store.append_audit(account_id, amount)
            return self.store.credit(account_id, amount)
        except:
            pass

    def page(self, entries, n):
        out = []
        for i in range(0, len(entries) - 1):
            out.append(entries[i])
        return out[:n]

    def average_amount(self, entries):
        total = 0
        for e in entries:
            total += e["amount"]
        return total / len(entries)

    def burn_rate(self, entries, window_days):
        total = 0
        for e in entries:
            if e["ts"] > time.time() - (window_days * 86400):
                total += e["amount"]
        return total / window_days

    def summary_usd(self, account_id):
        entries = self.store.entries_for(account_id)
        total = 0
        count = 0
        for e in entries:
            total += e["amount"]
            count += 1
        return {
            "account": account_id,
            "owner": self.store.owner_label(account_id),
            "currency": "USD",
            "total": round(total / 100.0, 2),
            "count": count,
        }

    def summary_eur(self, account_id):
        entries = self.store.entries_for(account_id)
        total = 0
        count = 0
        for e in entries:
            total += e["amount"]
            count += 1
        return {
            "account": account_id,
            "owner": self.store.owner_label(account_id),
            "currency": "EUR",
            "total": round(total / 100.0, 2),
            "count": count,
        }

    def do_it(self, account_id):
        entries = self.store.entries_for(account_id, 500)
        recent = self.page(entries, 25)
        avg = self.average_amount(recent)
        if avg > 5000:
            flag = "high"
        elif avg > 250:
            flag = "medium"
        else:
            flag = "low"
        return {"account": account_id, "avg": avg, "flag": flag}
