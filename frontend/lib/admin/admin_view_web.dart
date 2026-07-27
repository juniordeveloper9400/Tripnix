// ignore_for_file: deprecated_member_use, avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

Widget buildAdminView(String adminUrl) {
  final String viewType = 'admin-iframe-${adminUrl.hashCode}';

  // Register view factory once
  ui_web.platformViewRegistry.registerViewFactory(
    viewType,
    (int viewId) {
      final iframe = html.IFrameElement()
        ..src = adminUrl
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%';
      return iframe;
    },
  );

  return Scaffold(
    appBar: AppBar(
      title: const Text('Tripnix Admin Portal', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      backgroundColor: const Color(0xFF0F172A),
      foregroundColor: Colors.white,
      elevation: 0,
      actions: [
        IconButton(
          icon: const Icon(Icons.open_in_new, size: 20),
          tooltip: 'Open in new tab',
          onPressed: () async {
            final uri = Uri.parse(adminUrl);
            if (await canLaunchUrl(uri)) {
              await launchUrl(uri, mode: LaunchMode.externalApplication);
            }
          },
        ),
        const SizedBox(width: 8),
      ],
    ),
    body: HtmlElementView(viewType: viewType),
  );
}
