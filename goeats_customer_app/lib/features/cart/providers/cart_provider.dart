import 'package:flutter_riverpod/flutter_riverpod.dart';

class CartItem {
  final int variantId;
  final String name;
  final String itemName;
  final double price;
  final int quantity;
  final String comments;

  CartItem({
    required this.variantId,
    required this.name,
    required this.itemName,
    required this.price,
    required this.quantity,
    this.comments = '',
  });

  CartItem copyWith({int? quantity}) {
    return CartItem(
      variantId: variantId,
      name: name,
      itemName: itemName,
      price: price,
      quantity: quantity ?? this.quantity,
      comments: comments,
    );
  }
}

class CartState {
  final List<CartItem> items;
  final int? restaurantId;

  CartState({this.items = const [], this.restaurantId});

  double get total => items.fold(0, (sum, item) => sum + (item.price * item.quantity));
  int get itemCount => items.fold(0, (sum, item) => sum + item.quantity);
}

class CartNotifier extends Notifier<CartState> {
  @override
  CartState build() {
    return CartState();
  }

  void setRestaurant(int id) {
    if (state.restaurantId != null && state.restaurantId != id) {
      state = CartState(restaurantId: id);
    } else {
      state = CartState(items: state.items, restaurantId: id);
    }
  }

  void addItem({
    required int variantId,
    required String name,
    required String itemName,
    required double price,
    required int quantity,
    required String comments,
  }) {
    final existingIndex = state.items.indexWhere((i) => i.variantId == variantId);
    
    if (existingIndex >= 0) {
      final newItems = List<CartItem>.from(state.items);
      newItems[existingIndex] = newItems[existingIndex].copyWith(
        quantity: newItems[existingIndex].quantity + quantity
      );
      state = CartState(items: newItems, restaurantId: state.restaurantId);
    } else {
      state = CartState(
        items: [
          ...state.items,
          CartItem(variantId: variantId, name: name, itemName: itemName, price: price, quantity: quantity, comments: comments)
        ],
        restaurantId: state.restaurantId
      );
    }
  }

  void updateQuantity(int variantId, int delta) {
    final existingIndex = state.items.indexWhere((i) => i.variantId == variantId);
    if (existingIndex >= 0) {
      final newItems = List<CartItem>.from(state.items);
      final newQty = newItems[existingIndex].quantity + delta;
      
      if (newQty <= 0) {
        newItems.removeAt(existingIndex);
      } else {
        newItems[existingIndex] = newItems[existingIndex].copyWith(quantity: newQty);
      }
      
      state = CartState(items: newItems, restaurantId: state.restaurantId);
    }
  }

  void clear() {
    state = CartState(restaurantId: state.restaurantId);
  }
}

final cartProvider = NotifierProvider<CartNotifier, CartState>(() {
  return CartNotifier();
});
