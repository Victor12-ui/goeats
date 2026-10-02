import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/order.dart';

class OrderCard extends StatelessWidget {
  final Order order;

  const OrderCard({super.key, required this.order});

  Color _getStatusColor() {
    switch (order.status) {
      case 'PENDING': return Colors.orange;
      case 'PREPARING': return Colors.blue;
      case 'READY': return Colors.cyan;
      case 'DELIVERING': return Colors.purple;
      case 'DELIVERED': return Colors.green;
      case 'CANCELLED': return Colors.red;
      default: return Colors.grey;
    }
  }

  String _getStatusText() {
    switch (order.status) {
      case 'PENDING': return 'Pendiente';
      case 'PREPARING': return 'En Preparación';
      case 'READY': return 'Listo';
      case 'DELIVERING': return 'En Camino';
      case 'DELIVERED': return 'Entregado';
      case 'CANCELLED': return 'Cancelado';
      default: return order.status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Pedido #${order.id}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStatusColor().withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _getStatusColor().withOpacity(0.5)),
                  ),
                  child: Text(
                    _getStatusText(),
                    style: TextStyle(color: _getStatusColor(), fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                )
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.receipt_long, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Text('Tipo: ${order.type}', style: const TextStyle(color: Colors.grey)),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.access_time, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Text('Fecha: ${DateFormat('dd/MM/yyyy HH:mm').format(order.createdAt)}', style: const TextStyle(color: Colors.grey)),
              ],
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total:', style: TextStyle(fontWeight: FontWeight.w600)),
                Text('\$${order.total.toStringAsFixed(2)}', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Theme.of(context).colorScheme.primary)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
