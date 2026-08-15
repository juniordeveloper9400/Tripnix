import 'package:flutter/material.dart';

import '../services/location_sharing.dart';
import '../theme/app_colors.dart';

/// What the driver tells the office before their bus starts reporting.
typedef TripDetails = ({String driverName, String fromPlace, String toPlace});

/// Asks who is driving and where the run goes, then hands it back.
///
/// Collected once at the start of a trip rather than on every fix. An office
/// watching a marker crawl along a road needs to know whose bus it is and where
/// it is headed — "somewhere near Chalakudy at 40 km/h" answers only half of
/// what a dispatcher is actually asking.
///
/// Returns null when the driver backs out, which must leave sharing off rather
/// than starting it with blanks.
Future<TripDetails?> showStartTripSheet(BuildContext context) {
  final sharing = LocationSharing.instance;

  return showModalBottomSheet<TripDetails>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => _StartTripSheet(
      // Prefilled from the last run so a driver repeating a route types it once.
      initialDriver: sharing.driverName,
      initialFrom: sharing.fromPlace,
      initialTo: sharing.toPlace,
      vehicleLabel: sharing.vehicleLabel,
    ),
  );
}

class _StartTripSheet extends StatefulWidget {
  const _StartTripSheet({
    required this.initialDriver,
    required this.initialFrom,
    required this.initialTo,
    required this.vehicleLabel,
  });

  final String initialDriver;
  final String initialFrom;
  final String initialTo;
  final String vehicleLabel;

  @override
  State<_StartTripSheet> createState() => _StartTripSheetState();
}

class _StartTripSheetState extends State<_StartTripSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _driver;
  late final TextEditingController _from;
  late final TextEditingController _to;

  @override
  void initState() {
    super.initState();
    _driver = TextEditingController(text: widget.initialDriver);
    _from = TextEditingController(text: widget.initialFrom);
    _to = TextEditingController(text: widget.initialTo);
  }

  @override
  void dispose() {
    _driver.dispose();
    _from.dispose();
    _to.dispose();
    super.dispose();
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    Navigator.of(context).pop((
      driverName: _driver.text.trim(),
      fromPlace: _from.text.trim(),
      toPlace: _to.text.trim(),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      // Lifts the sheet clear of the keyboard, which otherwise covers the very
      // fields being typed into.
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 18),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const Text(
                'Start sharing',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
              ),
              const SizedBox(height: 4),
              Text(
                widget.vehicleLabel.isEmpty
                    ? 'Your office and owner will see this bus move.'
                    : '${widget.vehicleLabel} — your office and owner will see it move.',
                style: TextStyle(fontSize: 12.5, color: Colors.grey[600]),
              ),
              const SizedBox(height: 18),
              _field(
                controller: _driver,
                label: 'Driver name',
                hint: 'Who is driving this bus',
                icon: Icons.person_outline,
                // The only required one: a moving bus nobody can put a name to
                // is the thing an office rings round trying to identify.
                validator: (v) => (v ?? '').trim().isEmpty
                    ? 'Enter the driver’s name'
                    : null,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 12),
              _field(
                controller: _from,
                label: 'From',
                hint: 'Starting point',
                icon: Icons.trip_origin,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 12),
              _field(
                controller: _to,
                label: 'To',
                hint: 'Destination',
                icon: Icons.place_outlined,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _submit(),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _submit,
                  icon: const Icon(Icons.near_me, size: 19),
                  label: const Text(
                    'Allow location & start',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.red,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    String? Function(String?)? validator,
    TextInputAction? textInputAction,
    void Function(String)? onSubmitted,
  }) {
    return TextFormField(
      controller: controller,
      validator: validator,
      textInputAction: textInputAction,
      onFieldSubmitted: onSubmitted,
      textCapitalization: TextCapitalization.words,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon, size: 19),
        labelStyle: const TextStyle(fontSize: 13.5),
        hintStyle: TextStyle(fontSize: 13, color: Colors.grey[400]),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.red, width: 1.5),
        ),
      ),
    );
  }
}
