
ALLOWED_EMAIL_DOMAINS = {
    "stuba.sk",
    "is.stuba.sk",
    "gmail.com",  # TEMPORARY: development only
}


def normalize_email(email: str) -> str:
    return email.strip().lower()


def is_school_email(email: str) -> bool:
    email = normalize_email(email)

    if email.count("@") != 1:
        return False

    local_part, domain = email.rsplit("@", 1)

    return bool(local_part) and domain in ALLOWED_EMAIL_DOMAINS
