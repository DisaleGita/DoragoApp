import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AppShell extends StatelessWidget {
  const AppShell({required this.location, required this.child, super.key});
  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final index = location.startsWith('/import')
        ? 1
        : location.startsWith('/profile')
        ? 2
        : 0;
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 760;
        final navigation = NavigationRail(
          selectedIndex: index,
          onDestinationSelected: (value) => _navigate(context, value),
          labelType: NavigationRailLabelType.all,
          leading: const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: _Brand(compact: true),
          ),
          destinations: const [
            NavigationRailDestination(
              icon: Icon(Icons.explore_outlined),
              label: Text('Trips'),
            ),
            NavigationRailDestination(
              icon: Icon(Icons.auto_awesome_outlined),
              label: Text('Import'),
            ),
            NavigationRailDestination(
              icon: Icon(Icons.person_outline),
              label: Text('Profile'),
            ),
          ],
        );
        return Scaffold(
          body: SafeArea(
            child: Row(
              children: [
                if (wide) navigation,
                if (wide) const VerticalDivider(width: 1),
                Expanded(child: child),
              ],
            ),
          ),
          bottomNavigationBar: wide
              ? null
              : NavigationBar(
                  selectedIndex: index,
                  onDestinationSelected: (value) => _navigate(context, value),
                  destinations: const [
                    NavigationDestination(
                      icon: Icon(Icons.explore_outlined),
                      label: 'Trips',
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.auto_awesome_outlined),
                      label: 'Import',
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.person_outline),
                      label: 'Profile',
                    ),
                  ],
                ),
        );
      },
    );
  }

  void _navigate(BuildContext context, int index) =>
      context.go(['/trips', '/import', '/profile'][index]);
}

class _Brand extends StatelessWidget {
  const _Brand({required this.compact});
  final bool compact;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 38,
        height: 38,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Text(
          'D',
          style: TextStyle(fontWeight: FontWeight.w900, color: Colors.black),
        ),
      ),
      if (!compact) ...[
        const SizedBox(width: 10),
        const Text(
          'DORAGO',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
        ),
      ],
    ],
  );
}

class PageFrame extends StatelessWidget {
  const PageFrame({required this.child, this.maxWidth = 1040, super.key});
  final Widget child;
  final double maxWidth;

  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.topCenter,
    child: ConstrainedBox(
      constraints: BoxConstraints(maxWidth: maxWidth),
      child: child,
    ),
  );
}
