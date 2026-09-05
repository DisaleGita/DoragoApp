import 'package:dorago/application/providers.dart';
import 'package:dorago/data/api/api_client.dart';
import 'package:dorago/presentation/shared/app_shell.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).user ?? const <String, dynamic>{};
    return PageFrame(
      maxWidth: 720,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Profile',
            style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 18),
          Card(
            child: ListTile(
              leading: CircleAvatar(
                child: Text(
                  (user['display_name'] as String? ??
                          user['email'] as String? ??
                          '?')[0]
                      .toUpperCase(),
                ),
              ),
              title: Text(user['display_name'] as String? ?? 'Traveler'),
              subtitle: Text(user['email'] as String? ?? ''),
            ),
          ),
          const SizedBox(height: 14),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.person_outline),
                  title: const Text('Traveler profile'),
                  subtitle: Text(
                    '${user['home_airport_code'] ?? 'No home airport'} · ${user['preferred_currency'] ?? 'USD'}',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => showDialog<void>(
                    context: context,
                    builder: (_) => _EditProfileDialog(user: user),
                  ),
                ),
                SwitchListTile(
                  secondary: const Icon(Icons.schedule),
                  title: const Text('24-hour time'),
                  value: user['time_format_24h'] as bool? ?? false,
                  onChanged: (value) async {
                    final updated = await ref
                        .read(profileRepositoryProvider)
                        .update({'time_format_24h': value});
                    ref.read(sessionProvider.notifier).setUser(updated);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.download_outlined),
                  title: const Text('Export my data'),
                  subtitle: const Text('Download a JSON copy from the server'),
                  onTap: () => _export(context, ref),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: () async {
              await ref.read(sessionProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
            icon: const Icon(Icons.logout),
            label: const Text('Log out'),
          ),
          const SizedBox(height: 10),
          TextButton.icon(
            style: TextButton.styleFrom(foregroundColor: Colors.redAccent),
            onPressed: () => _deleteAccount(context, ref),
            icon: const Icon(Icons.delete_forever_outlined),
            label: const Text('Delete account'),
          ),
        ],
      ),
    );
  }

  Future<void> _export(BuildContext context, WidgetRef ref) async {
    try {
      final bytes = await ref.read(profileRepositoryProvider).export();
      await FilePicker.saveFile(
        dialogTitle: 'Save Dorago data export',
        fileName: 'dorago-export.json',
        bytes: bytes,
      );
    } on Object catch (caught) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(readableFailure(caught).message)),
        );
      }
    }
  }

  Future<void> _deleteAccount(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Permanently delete account?'),
        content: const Text(
          'Your trips, plans, documents, reminders, and sessions will be permanently removed. This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Delete permanently'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(sessionProvider.notifier).deleteAccount();
      if (context.mounted) context.go('/login');
    }
  }
}

class _EditProfileDialog extends ConsumerStatefulWidget {
  const _EditProfileDialog({required this.user});
  final Map<String, dynamic> user;
  @override
  ConsumerState<_EditProfileDialog> createState() => _EditProfileDialogState();
}

class _EditProfileDialogState extends ConsumerState<_EditProfileDialog> {
  late final TextEditingController name;
  late final TextEditingController airport;
  late final TextEditingController currency;
  late final TextEditingController timezone;
  String? error;

  @override
  void initState() {
    super.initState();
    name = TextEditingController(text: widget.user['display_name'] as String?);
    airport = TextEditingController(
      text: widget.user['home_airport_code'] as String?,
    );
    currency = TextEditingController(
      text: widget.user['preferred_currency'] as String? ?? 'USD',
    );
    timezone = TextEditingController(
      text: widget.user['timezone'] as String? ?? 'UTC',
    );
  }

  @override
  void dispose() {
    name.dispose();
    airport.dispose();
    currency.dispose();
    timezone.dispose();
    super.dispose();
  }

  Future<void> save() async {
    try {
      final updated = await ref.read(profileRepositoryProvider).update({
        'display_name': name.text.trim(),
        'home_airport_code': airport.text.trim(),
        'preferred_currency': currency.text.trim(),
        'timezone': timezone.text.trim(),
      });
      ref.read(sessionProvider.notifier).setUser(updated);
      if (mounted) Navigator.pop(context);
    } on Object catch (caught) {
      setState(() => error = readableFailure(caught).message);
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Traveler profile'),
    content: SizedBox(
      width: 440,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: name,
            decoration: const InputDecoration(labelText: 'Display name'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: airport,
            decoration: const InputDecoration(labelText: 'Home airport code'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: currency,
            decoration: const InputDecoration(labelText: 'Preferred currency'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: timezone,
            decoration: const InputDecoration(labelText: 'IANA timezone'),
          ),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                error!,
                style: const TextStyle(color: Colors.redAccent),
              ),
            ),
        ],
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(onPressed: save, child: const Text('Save')),
    ],
  );
}
