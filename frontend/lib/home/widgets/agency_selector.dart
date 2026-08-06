import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

/// Sentinel value meaning "don't filter by agency".
const String kAllAgencies = 'All';

/// Horizontal strip of travel agencies (vehicle operators), letting the user
/// browse the fleet of a single agency. Buses are filtered by this selection.
class AgencySelector extends StatelessWidget {
  /// Agency names, without the leading "All Agencies" entry.
  final List<String> agencies;
  final String selectedAgency;
  final ValueChanged<String> onChanged;

  const AgencySelector({
    super.key,
    required this.agencies,
    required this.selectedAgency,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 96,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: agencies.length + 1, // +1 for the "All Agencies" entry
        separatorBuilder: (context, index) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          if (index == 0) {
            return _AgencyChip(
              label: 'All Agencies',
              isSelected: selectedAgency == kAllAgencies,
              onTap: () => onChanged(kAllAgencies),
            );
          }
          final agency = agencies[index - 1];
          return _AgencyChip(
            label: agency,
            isSelected: agency == selectedAgency,
            onTap: () => onChanged(agency),
          );
        },
      ),
    );
  }
}

class _AgencyChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _AgencyChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  /// Up to two initials taken from the agency name, e.g. "KPN Travels" -> "KT".
  String get _initials {
    final words = label.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
    if (words.isEmpty) return '?';
    return words.take(2).map((w) => w[0].toUpperCase()).join();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 78,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.red : Colors.white,
                // Same outline treatment as the day chips in DateSelector.
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: isSelected ? AppColors.red : Colors.grey.shade200,
                ),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: AppColors.red.withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ]
                    : null,
              ),
              alignment: Alignment.center,
              child: label == 'All Agencies'
                  ? Icon(
                      Icons.groups_2,
                      size: 26,
                      color: isSelected ? Colors.white : AppColors.red,
                    )
                  : Text(
                      _initials,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.white : AppColors.black,
                      ),
                    ),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              maxLines: 2,
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11,
                height: 1.15,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                color: isSelected ? AppColors.red : Colors.grey[700],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
