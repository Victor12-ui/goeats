import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../../core/network/api_client.dart';
import '../../../core/constants/constants.dart';
import '../models/order.dart';

class OrdersNotifier extends AsyncNotifier<List<Order>> {
  io.Socket? _socket;

  @override
  Future<List<Order>> build() async {
    _initSocket();
    
    ref.onDispose(() {
      _socket?.disconnect();
      _socket?.dispose();
    });
    
    return _fetchOrders();
  }

  Future<List<Order>> _fetchOrders() async {
    final dio = ref.read(dioProvider);
    final response = await dio.get('/orders/customer/my-orders');
    
    if (response.data['success']) {
      final list = response.data['orders'] as List;
      return list.map((e) => Order.fromJson(e)).toList();
    } else {
      throw Exception('Failed to load orders');
    }
  }

  Future<void> fetchOrders() async {
    state = const AsyncValue.loading();
    try {
      final orders = await _fetchOrders();
      state = AsyncValue.data(orders);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  void _initSocket() {
    _socket = io.io(Constants.socketUrl, io.OptionBuilder()
      .setTransports(['websocket'])
      .disableAutoConnect()
      .build()
    );

    _socket?.connect();

    _socket?.onConnect((_) {
      // Socket connected
    });

    _socket?.on('orderUpdated', (data) {
      if (data != null && data['orderId'] != null) {
        _updateOrderStatus(data['orderId'], data['status']);
      }
    });
    
    _socket?.on('orderStatusChanged', (data) {
       if (data != null && data['orderId'] != null) {
        _updateOrderStatus(data['orderId'], data['status']);
      }
    });
  }

  void _updateOrderStatus(int orderId, String newStatus) {
    if (state.value != null) {
      final currentOrders = state.value!;
      final index = currentOrders.indexWhere((o) => o.id == orderId);
      
      if (index >= 0) {
        final updatedOrder = Order(
          id: currentOrders[index].id,
          type: currentOrders[index].type,
          status: newStatus,
          customerName: currentOrders[index].customerName,
          total: currentOrders[index].total,
          createdAt: currentOrders[index].createdAt,
        );
        
        final newOrders = List<Order>.from(currentOrders);
        newOrders[index] = updatedOrder;
        state = AsyncValue.data(newOrders);
      }
    }
  }
}

final ordersProvider = AsyncNotifierProvider<OrdersNotifier, List<Order>>(() {
  return OrdersNotifier();
});
