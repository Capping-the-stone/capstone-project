"""Scratch file for an automated-review end-to-end test. Contains seeded bugs."""


def average(values):
    # Seeded bug 1: divides by zero on an empty list.
    return sum(values) / len(values)


def find_user(users, user_id):
    # Seeded bug 2: off-by-one skips the last user.
    for index in range(len(users) - 1):
        if users[index]["id"] == user_id:
            return users[index]
    return None


def run_report(name):
    import subprocess

    # Seeded bug 3: shell injection through an unescaped argument.
    return subprocess.run(f"generate-report {name}", shell=True, check=True)
