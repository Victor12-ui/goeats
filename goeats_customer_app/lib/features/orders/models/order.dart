class Order {
  final int id;
  final String type; // DINE_IN, DELIVERY, TAKEOUT
  final String status; // PENDING, PREPARING, READY, DELIVERING, DELIVERED, CANCELLED
  final String customerName;
  final double total;
  final DateTime createdAt;

  Order({
    required this.id,
    required this.type,
    required this.status,
    required this.customerName,
    required this.total,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'],
      type: json['type'],
      status: json['status'],
      customerName: json['customerName'] ?? '',
      total: (json['total'] as num).toDouble(),
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
