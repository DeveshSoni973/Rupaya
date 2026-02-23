"""
app/utils/debt_simplifier.py

Pure-Python debt simplification using the Minimum Cash Flow algorithm.
No DB access — takes a dict of net balances and returns the minimal
set of transactions to settle all debts.
"""


def simplify_debts(balances: dict[str, float]) -> list[dict]:
    """
    Given a net-balance map { user_id: net_balance }, returns the minimum
    list of transactions to zero out all debts.

    Positive balance  → this person is owed money (creditor)
    Negative balance  → this person owes money    (debtor)

    Returns:
        [{ "from": str, "to": str, "amount": float }, ...]
    """
    # Round to 2dp to avoid floating-point ghosts
    creditors: list[tuple[float, str]] = []  # (amount, uid)
    debtors: list[tuple[float, str]] = []    # (amount_owed, uid)  — positive values

    for uid, balance in balances.items():
        rounded = round(balance, 2)
        if rounded > 0:
            creditors.append((rounded, uid))
        elif rounded < 0:
            debtors.append((-rounded, uid))  # store as positive

    # Sort descending so we can pop from the end (cheapest list operation)
    creditors.sort()
    debtors.sort()

    transactions: list[dict] = []

    while creditors and debtors:
        cred_amt, creditor = creditors.pop()
        debt_amt, debtor = debtors.pop()

        settle = min(cred_amt, debt_amt)
        settle = round(settle, 2)

        transactions.append({
            "from": debtor,
            "to": creditor,
            "amount": settle,
        })

        remainder_cred = round(cred_amt - settle, 2)
        remainder_debt = round(debt_amt - settle, 2)

        if remainder_cred > 0:
            creditors.append((remainder_cred, creditor))
            creditors.sort()

        if remainder_debt > 0:
            debtors.append((remainder_debt, debtor))
            debtors.sort()

    return transactions
