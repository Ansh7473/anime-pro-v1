import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:watchanimez/core/theme/app_theme.dart';

void main() {
  testWidgets('App theme builds and dark scaffold renders',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.dark,
          home: const Scaffold(body: Center(child: Text('WatchAnimez'))),
        ),
      ),
    );
    expect(find.text('WatchAnimez'), findsOneWidget);
  });
}
