import 'package:dorago/domain/models/plan_item.dart';
import 'package:dorago/presentation/auth/login_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('login preserves the Dorago prototype wording', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: LoginScreen())),
    );

    expect(find.text('DORAGO'), findsOneWidget);
    expect(find.text('Your whole trip.\nOne place.'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);
    expect(find.text('Zero Password Auth'), findsOneWidget);
  });

  test('the client exposes every required itinerary category', () {
    expect(PlanType.values, hasLength(21));
    expect(PlanType.values.map((type) => type.wireValue), contains('shuttle'));
    expect(PlanType.carRental.label, 'Rental Car');
    expect(PlanType.dining.label, 'Restaurant');
  });
}
