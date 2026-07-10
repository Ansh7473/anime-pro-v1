import 'package:flutter_test/flutter_test.dart';
import 'package:watchanimez/core/services/update_checker.dart';

void main() {
  group('UpdateChecker.parseVersion', () {
    test('parses pubspec-style version', () {
      expect(UpdateChecker.parseVersion('2026.7.9+163'), [2026, 7, 9, 163]);
    });

    test('parses android release tag', () {
      expect(
        UpdateChecker.parseVersion('android-v2026.7.9+163'),
        [2026, 7, 9, 163],
      );
    });

    test('strips non-numeric sha suffix', () {
      expect(
        UpdateChecker.parseVersion('android-v2026.07.09-abc1234'),
        [2026, 7, 9],
      );
    });

    test('handles URL-encoded plus', () {
      expect(
        UpdateChecker.parseVersion('android-v2026.7.9%2B163'),
        [2026, 7, 9, 163],
      );
    });
  });

  group('UpdateChecker.isNewer', () {
    test('equal tag and installed → no update', () {
      expect(
        UpdateChecker.isNewer('android-v2026.7.9+163', '2026.7.9+163'),
        isFalse,
      );
    });

    test('same numbers without prefix → no update', () {
      expect(
        UpdateChecker.isNewer('2026.7.9+163', '2026.7.9+163'),
        isFalse,
      );
    });

    test('higher build number → update', () {
      expect(
        UpdateChecker.isNewer('android-v2026.7.9+164', '2026.7.9+163'),
        isTrue,
      );
    });

    test('lower build number → no update', () {
      expect(
        UpdateChecker.isNewer('android-v2026.7.9+100', '2026.7.9+163'),
        isFalse,
      );
    });

    test('newer date → update', () {
      expect(
        UpdateChecker.isNewer('android-v2026.7.10+1', '2026.7.9+999'),
        isTrue,
      );
    });

    test('older date → no update', () {
      expect(
        UpdateChecker.isNewer('android-v2026.7.8+999', '2026.7.9+1'),
        isFalse,
      );
    });

    test('empty or garbage → no update', () {
      expect(UpdateChecker.isNewer('', '2026.7.9+1'), isFalse);
      expect(UpdateChecker.isNewer('android-v2026.7.9+1', ''), isFalse);
      expect(UpdateChecker.isNewer('not-a-version', 'also-bad'), isFalse);
    });

    test('classic semver with build', () {
      expect(UpdateChecker.isNewer('v1.0.0+2', '1.0.0+1'), isTrue);
      expect(UpdateChecker.isNewer('v1.0.0+1', '1.0.0+1'), isFalse);
      expect(UpdateChecker.isNewer('v1.0.0+1', '1.0.0+2'), isFalse);
    });
  });

  group('UpdateChecker.isSameVersion', () {
    test('tag and installed match', () {
      expect(
        UpdateChecker.isSameVersion('android-v2026.7.9+163', '2026.7.9+163'),
        isTrue,
      );
    });

    test('different builds do not match', () {
      expect(
        UpdateChecker.isSameVersion('android-v2026.7.9+163', '2026.7.9+846'),
        isFalse,
      );
    });
  });
}
