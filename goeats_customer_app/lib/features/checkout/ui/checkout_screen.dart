import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/network/api_client.dart';
import '../../cart/providers/cart_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../../aggregator/providers/restaurant_list_provider.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  String _orderType = 'DELIVERY';
  String _paymentMethod = 'CASH';
  
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();
  final _tableIdController = TextEditingController(); // Simulating QR table id
  
  File? _receiptImage;
  bool _isSubmitting = false;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked != null) {
      setState(() => _receiptImage = File(picked.path));
    }
  }

  Future<void> _submitOrder() async {
    final cartState = ref.read(cartProvider);
    final authState = ref.read(authProvider);
    
    if (cartState.items.isEmpty) return;
    if (cartState.restaurantId == null) return;
    
    // Validations
    if (_orderType == 'DELIVERY' && (_addressController.text.isEmpty || _phoneController.text.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Por favor completa dirección y teléfono')));
      return;
    }
    if (_orderType == 'DINE_IN' && _tableIdController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Por favor ingresa el número de mesa (simulado)')));
      return;
    }
    if (_paymentMethod == 'TRANSFER' && _receiptImage == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Por favor adjunta el comprobante de transferencia')));
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final dio = ref.read(dioProvider);
      
      // We need the restaurant slug to make the request. Find it from the list.
      final restaurantsAsync = ref.read(restaurantListProvider);
      final restaurant = restaurantsAsync.value?.firstWhere((r) => r.id == cartState.restaurantId);
      
      if (restaurant == null) throw Exception('Restaurante no encontrado');

      String? receiptBase64;
      if (_receiptImage != null) {
        final bytes = await _receiptImage!.readAsBytes();
        receiptBase64 = 'data:image/jpeg;base64,${base64Encode(bytes)}';
      }

      final payload = {
        'type': _orderType,
        'tableId': _orderType == 'DINE_IN' ? int.tryParse(_tableIdController.text) : null,
        'customerName': authState.user?.name ?? 'Cliente Web',
        'comments': 'Pedido App Flutter',
        'deliveryAddress': _orderType == 'DELIVERY' ? _addressController.text : null,
        'deliveryPhone': _orderType == 'DELIVERY' ? _phoneController.text : null,
        'shippingCost': _orderType == 'DELIVERY' ? 2.50 : 0.0, // Hardcoded for demo
        'restaurantId': restaurant.id,
        'paymentMethod': _paymentMethod,
        'paymentReceipt': receiptBase64,
        'items': cartState.items.map((i) => {
          'variantId': i.variantId,
          'quantity': i.quantity,
          'comments': i.comments,
        }).toList(),
      };

      final response = await dio.post('/restaurants/public/catalog/${restaurant.slug}/order', data: payload);

      if (response.data['success']) {
        ref.read(cartProvider.notifier).clear();
        if (mounted) {
          context.go('/orders'); // Navegar a mis pedidos
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('¡Pedido enviado con éxito!')));
        }
      } else {
        throw Exception(response.data['message']);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartState = ref.watch(cartProvider);
    
    if (cartState.items.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: const Center(child: Text('El carrito está vacío')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Completar Pedido')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Resumen del Pedido', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ...cartState.items.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Row(
                children: [
                  Text('${item.quantity}x ', style: const TextStyle(fontWeight: FontWeight.bold)),
                  Expanded(child: Text('${item.itemName} (${item.name})')),
                  Text('\$${(item.price * item.quantity).toStringAsFixed(2)}'),
                ],
              ),
            )),
            const Divider(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total a Pagar', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                Text('\$${cartState.total.toStringAsFixed(2)}', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary)),
              ],
            ),
            
            const SizedBox(height: 32),
            const Text('Tipo de Pedido', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'DELIVERY', label: Text('Delivery')),
                ButtonSegment(value: 'TAKEOUT', label: Text('Para Llevar')),
                ButtonSegment(value: 'DINE_IN', label: Text('En Mesa (QR)')),
              ],
              selected: {_orderType},
              onSelectionChanged: (set) => setState(() => _orderType = set.first),
            ),
            
            const SizedBox(height: 24),
            if (_orderType == 'DELIVERY') ...[
              TextField(
                controller: _addressController,
                decoration: const InputDecoration(labelText: 'Dirección de Entrega', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Teléfono', border: OutlineInputBorder()),
              ),
            ],
            
            if (_orderType == 'DINE_IN') ...[
              TextField(
                controller: _tableIdController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'ID de la Mesa (Simulación QR)', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 8),
              const Text('En la app real, este ID se obtiene escaneando el código QR de la mesa.', style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
            
            const SizedBox(height: 32),
            const Text('Método de Pago', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _paymentMethod,
              decoration: const InputDecoration(border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'CASH', child: Text('Efectivo')),
                DropdownMenuItem(value: 'TRANSFER', child: Text('Transferencia Bancaria')),
              ],
              onChanged: (val) => setState(() => _paymentMethod = val!),
            ),
            
            if (_paymentMethod == 'TRANSFER') ...[
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: _pickImage,
                icon: const Icon(Icons.upload_file),
                label: const Text('Subir Comprobante (Obligatorio)'),
              ),
              if (_receiptImage != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text('Imagen seleccionada', style: TextStyle(color: Colors.green[700], fontWeight: FontWeight.bold)),
                ),
            ],
            
            const SizedBox(height: 48),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submitOrder,
              child: _isSubmitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Confirmar Pedido'),
            ),
          ],
        ),
      ),
    );
  }
}
