import 'package:dorago/core/timezones.dart';
import 'package:flutter/material.dart';

/// A searchable IANA timezone input: typing "tokyo" or "new york" suggests
/// matching zones, and only known zones pass validation.
class TimezoneField extends StatefulWidget {
  const TimezoneField({
    required this.controller,
    required this.label,
    this.hint,
    this.optional = false,
    super.key,
  });

  final TextEditingController controller;
  final String label;
  final String? hint;
  final bool optional;

  @override
  State<TimezoneField> createState() => _TimezoneFieldState();
}

class _TimezoneFieldState extends State<TimezoneField> {
  final focusNode = FocusNode();

  @override
  void dispose() {
    focusNode.dispose();
    super.dispose();
  }

  String? validate(String? value) {
    final zone = value?.trim() ?? '';
    if (zone.isEmpty) return widget.optional ? null : 'Required';
    return isKnownTimezone(zone)
        ? null
        : 'Choose a timezone from the list, e.g. America/Chicago';
  }

  @override
  Widget build(BuildContext context) => RawAutocomplete<String>(
    textEditingController: widget.controller,
    focusNode: focusNode,
    optionsBuilder: (value) => searchTimezones(value.text),
    fieldViewBuilder: (context, controller, focusNode, onSubmitted) =>
        TextFormField(
          controller: controller,
          focusNode: focusNode,
          autocorrect: false,
          decoration: InputDecoration(
            labelText: widget.label,
            hintText: widget.hint ?? 'Search a city, e.g. Chicago',
            suffixIcon: const Icon(Icons.public),
          ),
          validator: validate,
          onFieldSubmitted: (_) => onSubmitted(),
        ),
    optionsViewBuilder: (context, onSelected, options) => Align(
      alignment: Alignment.topLeft,
      child: Material(
        elevation: 6,
        borderRadius: BorderRadius.circular(12),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 280, maxWidth: 420),
          child: ListView.builder(
            padding: EdgeInsets.zero,
            shrinkWrap: true,
            itemCount: options.length,
            itemBuilder: (context, index) {
              final zone = options.elementAt(index);
              return ListTile(
                dense: true,
                title: Text(zone.replaceAll('_', ' ')),
                onTap: () => onSelected(zone),
              );
            },
          ),
        ),
      ),
    ),
  );
}
