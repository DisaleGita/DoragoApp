import 'package:dorago/application/providers.dart';
import 'package:dorago/data/api/api_client.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final email = TextEditingController();
  bool busy = false;
  String? error;

  @override
  void dispose() {
    email.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!email.text.contains('@') || busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final resendAfter = await ref
          .read(sessionProvider.notifier)
          .requestOtp(email.text);
      if (mounted) {
        context.go(
          Uri(
            path: '/verify',
            queryParameters: {
              'email': email.text.trim().toLowerCase(),
              'resend_after': '$resendAfter',
            },
          ).toString(),
        );
      }
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
          constraints: const BoxConstraints(maxWidth: 430),
          child: AutofillGroup(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary,
                        borderRadius: BorderRadius.circular(15),
                      ),
                      child: const Text(
                        'D',
                        style: TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'DORAGO',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 72),
                const Text(
                  'Your whole trip.\nOne place.',
                  style: TextStyle(
                    fontSize: 38,
                    height: 1.08,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Flights, stays, plans and travel details — organized automatically.',
                  style: Theme.of(
                    context,
                  ).textTheme.bodyLarge?.copyWith(color: Colors.blueGrey[300]),
                ),
                const SizedBox(height: 32),
                TextField(
                  controller: email,
                  autofocus: true,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => submit(),
                  decoration: InputDecoration(
                    labelText: 'Email address',
                    errorText: error,
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: busy ? null : submit,
                  icon: busy
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.arrow_forward),
                  label: const Padding(
                    padding: EdgeInsets.symmetric(vertical: 14),
                    child: Text('Continue'),
                  ),
                ),
                const SizedBox(height: 34),
                const Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  runSpacing: 12,
                  children: [
                    _Feature(
                      icon: Icons.auto_awesome,
                      label: 'AI Travel Import',
                    ),
                    _Feature(icon: Icons.cloud_off, label: 'Offline-Ready'),
                    _Feature(icon: Icons.schedule, label: 'Multi-Timezone'),
                    _Feature(icon: Icons.password, label: 'Zero Password Auth'),
                  ],
                ),
                const SizedBox(height: 56),
                const Text(
                  "By continuing, you agree to Dorago's Terms and Privacy Policy.",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.blueGrey),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class _Feature extends StatelessWidget {
  const _Feature({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 175,
    child: Row(
      children: [
        Icon(icon, size: 17, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 8),
        Expanded(
          child: Text(label, maxLines: 2, overflow: TextOverflow.ellipsis),
        ),
      ],
    ),
  );
}
