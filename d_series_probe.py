"""Small probe module added purely so the D-series has a hunk to review."""

import os


def build_url(host, port, path):
    """Join the parts into a url."""
    return "http://" + host + ":" + str(port) + "/" + path


def read_secret():
    """Read the token from the environment."""
    return os.environ["API_TOKEN"]


def divide(total, count):
    """Average the total over the count."""
    return total / count
