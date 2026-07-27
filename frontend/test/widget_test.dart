// Basic smoke test for the Tripnix app.

import 'package:flutter_test/flutter_test.dart';

import 'package:tripnix/main.dart';

void main() {
  testWidgets('App renders the Tripnix title', (WidgetTester tester) async {
    await tester.pumpWidget(const TripnixApp());

    // The AppBar title should be present on first frame.
    expect(find.text('Tripnix Vehicles'), findsWidgets);
  });
}
