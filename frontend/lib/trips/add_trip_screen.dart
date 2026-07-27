import 'package:flutter/material.dart';

import '../models/trip.dart';
import '../theme/app_colors.dart';

/// Form screen for creating a new trip. Returns the created [Trip] via
/// Navigator.pop, or null if the user cancels.
class AddTripScreen extends StatefulWidget {
  const AddTripScreen({super.key, required this.nextId});

  final int nextId;

  @override
  State<AddTripScreen> createState() => _AddTripScreenState();
}

class _AddTripScreenState extends State<AddTripScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _destCtrl = TextEditingController();
  final _daysCtrl = TextEditingController(text: '3');
  final _priceCtrl = TextEditingController(text: '500');

  String _category = 'Beach';
  DateTime _startDate = DateTime.now().add(const Duration(days: 7));

  @override
  void dispose() {
    _titleCtrl.dispose();
    _destCtrl.dispose();
    _daysCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (picked != null) setState(() => _startDate = picked);
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    final trip = Trip(
      id: widget.nextId,
      title: _titleCtrl.text.trim(),
      destination: _destCtrl.text.trim(),
      days: int.tryParse(_daysCtrl.text.trim()) ?? 1,
      startDate: _startDate,
      category: _category,
      price: double.tryParse(_priceCtrl.text.trim()) ?? 0,
      gradient: kCategoryGradients[_category]!,
    );
    Navigator.of(context).pop(trip);
  }

  @override
  Widget build(BuildContext context) {
    final categories =
        kCategories.where((c) => c != 'All').toList(growable: false);

    return Scaffold(
      appBar: AppBar(
        title: const Text('New Trip'),
        backgroundColor: AppColors.black,
        foregroundColor: Colors.white,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            _Field(
              controller: _titleCtrl,
              label: 'Trip title',
              icon: Icons.title,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Enter a title' : null,
            ),
            _Field(
              controller: _destCtrl,
              label: 'Destination',
              icon: Icons.location_on,
              validator: (v) => (v == null || v.trim().isEmpty)
                  ? 'Enter a destination'
                  : null,
            ),
            const SizedBox(height: 8),
            const Text('Category',
                style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                for (final c in categories)
                  ChoiceChip(
                    label: Text(c),
                    selected: _category == c,
                    avatar: Icon(iconForCategory(c), size: 18),
                    onSelected: (_) => setState(() => _category = c),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _Field(
                    controller: _daysCtrl,
                    label: 'Days',
                    icon: Icons.schedule,
                    keyboardType: TextInputType.number,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _Field(
                    controller: _priceCtrl,
                    label: 'Budget (\$)',
                    icon: Icons.payments,
                    keyboardType: TextInputType.number,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.calendar_today,
                  color: AppColors.red),
              title: const Text('Start date'),
              subtitle: Text(
                '${_startDate.year}-${_startDate.month.toString().padLeft(2, '0')}-${_startDate.day.toString().padLeft(2, '0')}',
              ),
              trailing: TextButton(
                onPressed: _pickDate,
                child: const Text('Change'),
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _save,
              icon: const Icon(Icons.check),
              label: const Text('Save Trip'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.red,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.label,
    required this.icon,
    this.validator,
    this.keyboardType,
  });

  final TextEditingController controller;
  final String label;
  final IconData icon;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: controller,
        validator: validator,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}
