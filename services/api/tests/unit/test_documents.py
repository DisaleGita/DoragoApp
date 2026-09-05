import pytest

from app.core.errors import ApiError
from app.documents.router import safe_name, signature_matches


@pytest.mark.parametrize(
    ("extension", "header"),
    [
        (".pdf", b"%PDF-1.7"),
        (".png", b"\x89PNG\r\n\x1a\n"),
        (".jpg", b"\xff\xd8\xff\xe0"),
        (".webp", b"RIFF1234WEBP"),
    ],
)
def test_supported_file_signatures(extension: str, header: bytes) -> None:
    assert signature_matches(extension, header)


def test_extension_does_not_override_content_validation() -> None:
    assert not signature_matches(".pdf", b"not a PDF")


def test_file_name_is_reduced_to_a_safe_base_name() -> None:
    assert safe_name("../../ticket.pdf") == "ticket.pdf"


def test_empty_file_name_is_rejected() -> None:
    with pytest.raises(ApiError):
        safe_name("../")
