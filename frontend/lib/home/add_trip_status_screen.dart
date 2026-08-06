import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../agency/agency_session.dart';
import '../models/vehicle.dart';
import '../services/api_service.dart';
import '../theme/app_colors.dart';

/// Lets the signed-in agency post a trip status straight from the app —
/// destination, start and end date, and an image (from phone/device gallery, URL or preset).
class AddTripStatusScreen extends StatefulWidget {
  const AddTripStatusScreen({super.key});

  @override
  State<AddTripStatusScreen> createState() => _AddTripStatusScreenState();
}

class _AddTripStatusScreenState extends State<AddTripStatusScreen> {
  final _formKey = GlobalKey<FormState>();
  final _placeCtrl = TextEditingController();
  final _imageCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();

  List<Vehicle> _vehicles = [];
  Vehicle? _vehicle;
  DateTime? _startDate;
  DateTime? _endDate;

  bool _loading = true;
  bool _submitting = false;
  bool _pickingImage = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadVehicles();
    _imageCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _placeCtrl.dispose();
    _imageCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadVehicles() async {
    try {
      final list = await ApiService.instance
          .fetchMyListedVehicles(AgencySession.instance.operatorName);
      if (!mounted) return;
      setState(() {
        _vehicles = list;
        _vehicle = list.isNotEmpty ? list.first : null;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  static String _iso(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  static const _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  String _label(DateTime? d) =>
      d == null ? 'Select' : '${d.day} ${_months[d.month - 1]} ${d.year}';

  Future<void> _pickDate({required bool isStart}) async {
    final now = DateTime.now();
    final first = DateTime(now.year, now.month, now.day);
    final initial = isStart
        ? (_startDate ?? first)
        : (_endDate ?? _startDate ?? first);

    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: isStart ? first.subtract(const Duration(days: 30)) : (_startDate ?? first),
      lastDate: first.add(const Duration(days: 365)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppColors.red,
            onPrimary: Colors.white,
            onSurface: AppColors.black,
          ),
        ),
        child: child!,
      ),
    );
    if (picked == null) return;

    setState(() {
      if (isStart) {
        _startDate = picked;
        // Keep the range coherent.
        if (_endDate != null && _endDate!.isBefore(picked)) _endDate = picked;
      } else {
        _endDate = picked;
      }
    });
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      setState(() => _pickingImage = true);
      final ImagePicker picker = ImagePicker();
      final XFile? file = await picker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1200,
        imageQuality: 85,
      );
      if (file != null) {
        final bytes = await file.readAsBytes();
        final mimeType = file.mimeType ?? 'image/jpeg';
        final base64Str = base64Encode(bytes);
        setState(() {
          _imageCtrl.text = 'data:$mimeType;base64,$base64Str';
        });
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to select image: $e')),
      );
    } finally {
      if (mounted) setState(() => _pickingImage = false);
    }
  }

  Widget _buildPreviewImage(String url) {
    if (url.startsWith('data:image') || url.contains(';base64,')) {
      try {
        final base64Data = url.split(',').last;
        final bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          height: 150,
          width: double.infinity,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stack) => _previewErrorBox(),
        );
      } catch (_) {
        return _previewErrorBox();
      }
    }
    return Image.network(
      url,
      height: 150,
      width: double.infinity,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stack) => _previewErrorBox(),
    );
  }

  Widget _previewErrorBox() {
    return Container(
      height: 150,
      alignment: Alignment.center,
      color: Colors.grey.shade200,
      child: Text(
        "Couldn't load image preview",
        style: TextStyle(color: Colors.grey[600], fontSize: 12.5),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_vehicle == null) {
      setState(() => _error = 'Add a subscribed vehicle to your fleet first');
      return;
    }
    if (_startDate == null || _endDate == null) {
      setState(() => _error = 'Pick both a start and an end date');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final trip = await ApiService.instance.createTrip(
        operatorName: AgencySession.instance.operatorName,
        vehicleId: _vehicle!.id,
        place: _placeCtrl.text.trim(),
        departureDate: _iso(_startDate!),
        arrivalDate: _iso(_endDate!),
        imageUrl: _imageCtrl.text.trim(),
        note: _noteCtrl.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: Colors.green.shade700,
          content: Text('Trip to ${trip.place} posted · ${trip.status}'),
        ),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Add Trip Status',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.black,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.red))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 560),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_vehicles.isEmpty) ...[
                          _emptyFleetNotice(),
                          const SizedBox(height: 18),
                        ],

                        const _SectionLabel('Bus / Vehicle'),
                        DropdownButtonFormField<Vehicle>(
                          initialValue: _vehicle,
                          isExpanded: true,
                          decoration: _decoration(Icons.directions_bus),
                          items: _vehicles
                              .map((v) => DropdownMenuItem(
                                    value: v,
                                    child: Text(
                                      '${v.name} · ${v.vehicleNumber}',
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ))
                              .toList(),
                          onChanged: (v) => setState(() => _vehicle = v),
                        ),
                        const SizedBox(height: 18),

                        const _SectionLabel('Destination'),
                        TextFormField(
                          controller: _placeCtrl,
                          decoration: _decoration(Icons.place_outlined,
                              hint: 'e.g. Ooty, Tamil Nadu'),
                          validator: (v) => (v == null || v.trim().isEmpty)
                              ? 'Destination is required'
                              : null,
                        ),
                        const SizedBox(height: 18),

                        const _SectionLabel('Trip Dates'),
                        Row(
                          children: [
                            Expanded(
                              child: _DateField(
                                label: 'Start date',
                                value: _label(_startDate),
                                isSet: _startDate != null,
                                onTap: () => _pickDate(isStart: true),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _DateField(
                                label: 'End date',
                                value: _label(_endDate),
                                isSet: _endDate != null,
                                onTap: () => _pickDate(isStart: false),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),

                        const _SectionLabel('Trip Photo'),
                        if (_imageCtrl.text.trim().isNotEmpty) ...[
                          Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: AppColors.red.withValues(alpha: 0.5),
                                width: 1.5,
                              ),
                              boxShadow: const [
                                BoxShadow(
                                  color: Colors.black12,
                                  blurRadius: 10,
                                  offset: Offset(0, 3),
                                )
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: Stack(
                                children: [
                                  _buildPreviewImage(_imageCtrl.text.trim()),
                                  Positioned(
                                    top: 10,
                                    left: 10,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                      decoration: BoxDecoration(
                                        color: Colors.green.shade700,
                                        borderRadius: BorderRadius.circular(20),
                                        boxShadow: const [
                                          BoxShadow(color: Colors.black26, blurRadius: 4)
                                        ],
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.check_circle_rounded, color: Colors.white, size: 14),
                                          SizedBox(width: 4),
                                          Text(
                                            'Photo Selected',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  Positioned(
                                    top: 10,
                                    right: 10,
                                    child: GestureDetector(
                                      onTap: () => setState(() => _imageCtrl.clear()),
                                      child: Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: const BoxDecoration(
                                          color: Colors.black70,
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(Icons.close, color: Colors.white, size: 16),
                                      ),
                                    ),
                                  ),
                                  Positioned(
                                    bottom: 10,
                                    right: 10,
                                    child: ElevatedButton.icon(
                                      onPressed: _pickingImage ? null : () => _pickImage(ImageSource.gallery),
                                      icon: const Icon(Icons.photo_library_rounded, size: 14),
                                      label: const Text('Change Photo', style: TextStyle(fontSize: 11)),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.black87,
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                        minimumSize: Size.zero,
                                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ] else ...[
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.red.withValues(alpha: 0.03),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: AppColors.red.withValues(alpha: 0.3),
                                width: 1.5,
                              ),
                            ),
                            child: Column(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppColors.red.withValues(alpha: 0.08),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.add_a_photo_rounded, size: 30, color: AppColors.red),
                                ),
                                const SizedBox(height: 10),
                                const Text(
                                  'Upload Trip Photo from Gallery',
                                  style: TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.black,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Select a photo from your phone or device gallery',
                                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                ),
                                const SizedBox(height: 14),
                                Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton.icon(
                                        onPressed: _pickingImage ? null : () => _pickImage(ImageSource.gallery),
                                        icon: _pickingImage
                                            ? const SizedBox(
                                                width: 16,
                                                height: 16,
                                                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.red),
                                              )
                                            : const Icon(Icons.photo_library_rounded, size: 18, color: AppColors.red),
                                        label: const Text(
                                          '🖼️ Choose Gallery',
                                          style: TextStyle(
                                            fontSize: 12.5,
                                            fontWeight: FontWeight.w800,
                                            color: AppColors.red,
                                          ),
                                        ),
                                        style: OutlinedButton.styleFrom(
                                          side: const BorderSide(color: AppColors.red, width: 1.5),
                                          padding: const EdgeInsets.symmetric(vertical: 12),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                          backgroundColor: Colors.white,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: OutlinedButton.icon(
                                        onPressed: _pickingImage ? null : () => _pickImage(ImageSource.camera),
                                        icon: const Icon(Icons.camera_alt_rounded, size: 18, color: AppColors.red),
                                        label: const Text(
                                          '📷 Take Photo',
                                          style: TextStyle(
                                            fontSize: 12.5,
                                            fontWeight: FontWeight.w800,
                                            color: AppColors.red,
                                          ),
                                        ),
                                        style: OutlinedButton.styleFrom(
                                          side: const BorderSide(color: AppColors.red, width: 1.5),
                                          padding: const EdgeInsets.symmetric(vertical: 12),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                          backgroundColor: Colors.white,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _imageCtrl,
                          decoration: _decoration(
                            Icons.link_rounded,
                            hint: 'Or paste image URL / pick preset below',
                          ),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Quick Preset Destination Images:',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.black,
                          ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 80,
                          child: ListView(
                            scrollDirection: Axis.horizontal,
                            children: [
                              _presetChip(
                                label: 'Ooty Hills',
                                url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
                              ),
                              _presetChip(
                                label: 'Beach Getaway',
                                url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
                              ),
                              _presetChip(
                                label: 'Luxury Coach',
                                url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
                              ),
                              _presetChip(
                                label: 'Mountain View',
                                url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
                              ),
                              _presetChip(
                                label: 'Night Highway',
                                url: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80',
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),

                        const _SectionLabel('Short Note'),
                        TextFormField(
                          controller: _noteCtrl,
                          decoration: _decoration(Icons.notes,
                              hint: 'e.g. Hill station tour with night halt'),
                        ),

                        if (_error != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.red.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                  color: AppColors.red.withValues(alpha: 0.3)),
                            ),
                            child: Text(_error!,
                                style: const TextStyle(
                                    color: AppColors.red, fontSize: 12.5)),
                          ),
                        ],

                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton.icon(
                            onPressed:
                                _submitting || _vehicles.isEmpty ? null : _submit,
                            icon: _submitting
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2.2, color: Colors.white),
                                  )
                                : const Icon(Icons.add_a_photo_outlined, size: 19),
                            label: Text(
                              _submitting ? 'Posting…' : 'Post Trip Status',
                              style: const TextStyle(
                                  fontSize: 15, fontWeight: FontWeight.bold),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.red,
                              foregroundColor: Colors.white,
                              disabledBackgroundColor: Colors.grey.shade300,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(18)),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }

  Widget _presetChip({required String label, required String url}) {
    final selected = _imageCtrl.text.trim() == url;
    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          setState(() {
            _imageCtrl.text = url;
          });
        },
        child: Container(
          width: 100,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? AppColors.red : Colors.grey.shade300,
              width: selected ? 2.2 : 1,
            ),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.network(
                  url,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(color: Colors.grey.shade300),
                ),
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.transparent, Colors.black.withValues(alpha: 0.7)],
                    ),
                  ),
                ),
                Align(
                  alignment: Alignment.bottomCenter,
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                if (selected)
                  Positioned(
                    top: 4,
                    right: 4,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(
                        color: AppColors.red,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check, color: Colors.white, size: 10),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _emptyFleetNotice() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.amber.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.amber.withValues(alpha: 0.4)),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, size: 18, color: Color(0xFF8A6D00)),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'You have no subscribed vehicles yet. Add a vehicle and pay its '
              'monthly subscription in the admin portal before posting a trip.',
              style: TextStyle(
                  fontSize: 12.5, height: 1.45, color: Color(0xFF8A6D00)),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _decoration(IconData icon, {String? hint}) {
    return InputDecoration(
      hintText: hint,
      prefixIcon: Icon(icon, color: AppColors.red, size: 20),
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.red, width: 1.5),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800),
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.value,
    required this.isSet,
    required this.onTap,
  });

  final String label;
  final String value;
  final bool isSet;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSet ? AppColors.red : Colors.grey.shade200,
            width: isSet ? 1.4 : 1,
          ),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_month, size: 18, color: AppColors.red),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    label,
                    style: TextStyle(fontSize: 10.5, color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isSet ? AppColors.black : Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
