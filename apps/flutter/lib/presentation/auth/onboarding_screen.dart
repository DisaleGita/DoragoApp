import 'package:dorago/application/providers.dart';
import 'package:dorago/data/api/api_client.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});
  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final name = TextEditingController();
  final airport = TextEditingController();
  final timezone = TextEditingController(text: 'UTC');
  String? error;
  bool busy = false;

  @override
  void dispose() {
    name.dispose();
    airport.dispose();
    timezone.dispose();
    super.dispose();
  }

  Future<void> save() async {
    if (name.text.trim().isEmpty || busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final updated = await ref.read(profileRepositoryProvider).update({
        'display_name': name.text.trim(),
        'home_airport_code': airport.text.trim().isEmpty
            ? null
            : airport.text.trim(),
        'timezone': timezone.text.trim(),
      });
      ref.read(sessionProvider.notifier).setUser(updated);
      if (mounted) context.go('/trips');
    } on Object catch (caught) {
      setState(() => error = readableFailure(caught).message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.travel_explore, size: 60),
              const SizedBox(height: 20),
              const Text(
                'Make Dorago yours',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: name,
                autofocus: true,
                decoration: const InputDecoration(labelText: 'Your name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: airport,
                decoration: const InputDecoration(
                  labelText: 'Home airport code (optional)',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: timezone,
                decoration: const InputDecoration(
                  labelText: 'Home IANA timezone',
                  hintText: 'America/Chicago',
                ),
              ),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    error!,
                    style: const TextStyle(color: Colors.redAccent),
                  ),
                ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: busy ? null : save,
                child: const Text('Start organizing'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
