from datetime import timedelta

from app.reminders.schemas import ReminderType
from app.reminders.service import OFFSETS


def test_every_non_custom_reminder_has_a_deterministic_offset() -> None:
    expected = {
        ReminderType.AT_START.value: timedelta(0),
        ReminderType.THIRTY_MINUTES_BEFORE.value: timedelta(minutes=30),
        ReminderType.ONE_HOUR_BEFORE.value: timedelta(hours=1),
        ReminderType.TWO_HOURS_BEFORE.value: timedelta(hours=2),
        ReminderType.ONE_DAY_BEFORE.value: timedelta(days=1),
    }
    assert OFFSETS == expected
    assert ReminderType.CUSTOM.value not in OFFSETS
