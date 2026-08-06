import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_service.dart';
import '../../theme/app_colors.dart';

/// Shows the mobile number the agency gave when its account was created, with
/// a one-tap dial action.
void showAgencyContactSheet(BuildContext context, String operatorName) {
  showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (_) => _AgencyContactSheet(operatorName: operatorName),
  );
}

class _AgencyContactSheet extends StatefulWidget {
  const _AgencyContactSheet({required this.operatorName});

  final String operatorName;

  @override
  State<_AgencyContactSheet> createState() => _AgencyContactSheetState();
}

class _AgencyContactSheetState extends State<_AgencyContactSheet> {
  Map<String, dynamic>? _contact;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final contact =
          await ApiService.instance.fetchAgencyContact(widget.operatorName);
      if (!mounted) return;
      setState(() {
        _contact = contact;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      final message = e.toString().replaceFirst('Exception: ', '');
      setState(() {
        _loading = false;
        // A missing account record just means there is no number on file —
        // that reads better than the raw "Agency not found".
        _error = message.contains('Agency not found')
            ? 'No contact number on file for this agency yet.'
            : message;
      });
    }
  }

  Future<void> _dial(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone.replaceAll(RegExp(r'\s+'), ''));
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Dialling is not available here — $phone')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final phone = (_contact?['phone'] as String? ?? '').trim();

    return SafeArea(
      child: Container(
        margin: const EdgeInsets.all(12),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.storefront, color: AppColors.red),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.operatorName,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w900,
                          color: AppColors.black,
                        ),
                      ),
                      if ((_contact?['ownerName'] as String? ?? '').isNotEmpty)
                        Text(
                          _contact!['ownerName'] as String,
                          style:
                              TextStyle(fontSize: 12.5, color: Colors.grey[600]),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.red),
                ),
              )
            else if (_error != null)
              _notice(_error!, isError: true)
            else if (phone.isEmpty)
              _notice(
                'This agency has not added a mobile number yet.',
                isError: false,
              )
            else ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.phone_in_talk,
                        color: AppColors.red, size: 22),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Mobile Number',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey[600],
                            ),
                          ),
                          const SizedBox(height: 2),
                          SelectableText(
                            phone,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: AppColors.black,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if ((_contact?['email'] as String? ?? '').isNotEmpty) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    Icon(Icons.mail_outline, size: 16, color: Colors.grey[600]),
                    const SizedBox(width: 8),
                    Expanded(
                      child: SelectableText(
                        _contact!['email'] as String,
                        style:
                            TextStyle(fontSize: 12.5, color: Colors.grey[700]),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: () => _dial(phone),
                  icon: const Icon(Icons.call, size: 19),
                  label: const Text(
                    'Call Now',
                    style:
                        TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.red,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _notice(String message, {required bool isError}) {
    final color = isError ? AppColors.red : Colors.grey;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        message,
        style: TextStyle(
          fontSize: 12.5,
          height: 1.45,
          color: isError ? AppColors.red : Colors.grey[700],
        ),
      ),
    );
  }
}
