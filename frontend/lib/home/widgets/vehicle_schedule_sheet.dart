import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_colors.dart';

/// The public diary for one vehicle.
///
/// Travellers see which dates the bus is already taken, but a booking made by
/// someone else shows only as "Booked" — never the other traveller's name,
/// phone or destination. The API redacts that; this sheet just presents what
/// it is given.
Future<void> showVehicleScheduleSheet(
  BuildContext context, {
  required int vehicleId,
  required String vehicleName,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _VehicleScheduleSheet(
      vehicleId: vehicleId,
      vehicleName: vehicleName,
    ),
  );
}

class _VehicleScheduleSheet extends StatefulWidget {
  const _VehicleScheduleSheet({
    required this.vehicleId,
    required this.vehicleName,
  });

  final int vehicleId;
  final String vehicleName;

  @override
  State<_VehicleScheduleSheet> createState() => _VehicleScheduleSheetState();
}

class _VehicleScheduleSheetState extends State<_VehicleScheduleSheet> {
  Map<String, dynamic>? _schedule;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.instance.fetchVehicleSchedule(widget.vehicleId);
      if (!mounted) return;
      setState(() {
        _schedule = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  List<String> get _bookedDates =>
      ((_schedule?['bookedDates'] as List<dynamic>?) ?? [])
          .map((e) => e as String)
          .toList();

  List<Map<String, dynamic>> get _entries =>
      ((_schedule?['entries'] as List<dynamic>?) ?? [])
          .map((e) => e as Map<String, dynamic>)
          .where((e) => e['status'] != 'Completed')
          .toList();

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, controller) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Row(
                children: [
                  const Icon(Icons.event_note, color: AppColors.red, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Bus Schedule',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppColors.black,
                          ),
                        ),
                        Text(
                          widget.vehicleName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(child: _body(controller)),
          ],
        ),
      ),
    );
  }

  Widget _body(ScrollController controller) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.red));
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.wifi_off, size: 42, color: Colors.grey[400]),
              const SizedBox(height: 10),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[700], fontSize: 13),
              ),
              const SizedBox(height: 14),
              TextButton(onPressed: _load, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }

    final entries = _entries;

    return ListView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      children: [
        _CalendarStrip(bookedDates: _bookedDates),
        const SizedBox(height: 18),
        Row(
          children: [
            const Text(
              'Upcoming',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: AppColors.black,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '${entries.length}',
              style: TextStyle(fontSize: 13, color: Colors.grey[600]),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (entries.isEmpty)
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                Icon(Icons.event_available, color: Colors.grey[500]),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'This bus has nothing scheduled — every date is open.',
                    style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                  ),
                ),
              ],
            ),
          )
        else
          ...entries.map(_entryTile),
      ],
    );
  }

  Widget _entryTile(Map<String, dynamic> e) {
    // A customer booking is deliberately opaque: the traveller learns the bus
    // is taken and nothing about who took it.
    final isBooked = e['isBooked'] == true;
    final place = (e['place'] as String?) ?? '';
    final status = (e['status'] as String?) ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: isBooked
                  ? Colors.grey.shade200
                  : AppColors.red.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isBooked ? Icons.lock_outline : Icons.place_outlined,
              size: 20,
              color: isBooked ? Colors.grey[600] : AppColors.red,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isBooked ? 'Booked' : (place.isEmpty ? 'Trip' : place),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.black,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${_pretty(e['departureDate'])} → ${_pretty(e['arrivalDate'])}'
                  '  ·  ${e['durationDays']} day${e['durationDays'] == 1 ? '' : 's'}',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
                if (isBooked) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Details are private',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[500],
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ],
            ),
          ),
          _statusPill(status),
        ],
      ),
    );
  }

  Widget _statusPill(String status) {
    final colour = status == 'On Trip'
        ? AppColors.red
        : status == 'Upcoming'
            ? Colors.orange
            : Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: colour.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status,
        style: TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
          color: colour,
        ),
      ),
    );
  }

  static String _pretty(dynamic iso) {
    final parsed = DateTime.tryParse('${iso ?? ''}');
    if (parsed == null) return '$iso';
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${parsed.day} ${months[parsed.month - 1]}';
  }
}

/// Four weeks from today, with taken days marked.
class _CalendarStrip extends StatelessWidget {
  const _CalendarStrip({required this.bookedDates});

  final List<String> bookedDates;

  @override
  Widget build(BuildContext context) {
    final booked = bookedDates.toSet();
    final today = DateTime.now();
    final days = List.generate(
      28,
      (i) => DateTime(today.year, today.month, today.day + i),
    );

    String iso(DateTime d) =>
        '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              'Next 4 weeks',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: AppColors.black,
              ),
            ),
            const Spacer(),
            _legendDot(AppColors.red, 'Booked'),
            const SizedBox(width: 10),
            _legendDot(Colors.grey.shade300, 'Free'),
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: days.map((d) {
            final isBooked = booked.contains(iso(d));
            return Container(
              width: 38,
              height: 44,
              decoration: BoxDecoration(
                color: isBooked ? AppColors.red : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '${d.day}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: isBooked ? Colors.white : AppColors.black,
                    ),
                  ),
                  Text(
                    _weekday(d.weekday),
                    style: TextStyle(
                      fontSize: 9,
                      color: isBooked ? Colors.white70 : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  static Widget _legendDot(Color colour, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: colour,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
      ],
    );
  }

  static String _weekday(int weekday) =>
      const ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][weekday - 1];
}
