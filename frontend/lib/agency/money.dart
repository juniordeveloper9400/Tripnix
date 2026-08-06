/// Formats an amount with Indian digit grouping — 12000 becomes ₹12,000 and
/// 120000 becomes ₹1,20,000.
String formatMoney(num amount, {String symbol = '₹'}) {
  final digits = amount.round().toString();
  if (digits.length <= 3) return '$symbol$digits';

  final last3 = digits.substring(digits.length - 3);
  var rest = digits.substring(0, digits.length - 3);

  final groups = <String>[];
  while (rest.length > 2) {
    groups.insert(0, rest.substring(rest.length - 2));
    rest = rest.substring(0, rest.length - 2);
  }
  if (rest.isNotEmpty) groups.insert(0, rest);

  return '$symbol${groups.join(',')},$last3';
}

/// Renders an ISO timestamp as e.g. "4 Aug 2027".
String formatDate(String? iso) {
  if (iso == null) return '—';
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  final d = DateTime.tryParse(iso);
  if (d == null) return '—';
  return '${d.day} ${months[d.month - 1]} ${d.year}';
}
