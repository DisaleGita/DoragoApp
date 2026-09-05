import 'dart:async';

import 'package:dorago/application/providers.dart';
import 'package:dorago/data/api/api_client.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({
    required this.email,
    this.resendAfterSeconds = 30,
    super.key,
  });
  final String email;
  final int resendAfterSeconds;
  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final code = TextEditingController();
  bool busy = false;
  String? error;
  late int resendRemaining;
  Timer? resendTimer;

  @override
  void initState() {
    super.initState();
    _startResendTimer(widget.resendAfterSeconds);
  }

  void _startResendTimer(int seconds) {
    resendTimer?.cancel();
    resendRemaining = seconds;
    resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (resendRemaining <= 1) {
        timer.cancel();
        setState(() => resendRemaining = 0);
      } else {
        setState(() => resendRemaining--);
      }
    });
  }

  @override
  void dispose() {
    resendTimer?.cancel();
    code.dispose();
    super.dispose();
  }

  Future<void> verify() async {
    if (code.text.length != 6 || busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final firstLogin = await ref
          .read(sessionProvider.notifier)
          .verifyOtp(widget.email, code.text);
      if (mounted) context.go(firstLogin ? '/onboarding' : '/trips');
    } on Object catch (caught) {
      setState(() => error = readableFailure(caught).message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(leading: BackButton(onPressed: () => context.go('/login'))),
    body: Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.mark_email_read_outlined, size: 54),
              const SizedBox(height: 24),
              const Text(
                'Check your email',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              Text(
                'Enter the six-digit code sent to ${widget.email}.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.blueGrey),
              ),
              const SizedBox(height: 28),
              TextField(
                controller: code,
                autofocus: true,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 28, letterSpacing: 12),
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(6),
                ],
                onChanged: (_) {
                  if (code.text.length == 6) verify();
                },
                decoration: InputDecoration(
                  labelText: 'Verification code',
                  errorText: error,
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: busy ? null : verify,
                child: const Text('Verify and continue'),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: busy || resendRemaining > 0
                    ? null
                    : () async {
                        try {
                          final seconds = await ref
                              .read(sessionProvider.notifier)
                              .requestOtp(widget.email);
                          _startResendTimer(seconds);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('A new code was sent.'),
                              ),
                            );
                          }
                        } on Object catch (caught) {
                          if (mounted) {
                            setState(
                              () => error = readableFailure(caught).message,
                            );
                          }
                        }
                      },
                child: Text(
                  resendRemaining == 0
                      ? 'Resend code'
                      : 'Resend in ${resendRemaining}s',
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
