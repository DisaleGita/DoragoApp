import 'package:intl/intl.dart';

String formatClock(DateTime value, {required bool use24HourTime}) =>
    DateFormat(use24HourTime ? 'HH:mm' : 'h:mm a').format(value);
