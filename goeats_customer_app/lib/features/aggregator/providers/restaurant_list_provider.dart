import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../models/restaurant.dart';

final restaurantListProvider = FutureProvider<List<Restaurant>>((ref) async {
  final dio = ref.read(dioProvider);
  final response = await dio.get('/restaurants/public/list');
  
  if (response.data['success']) {
    final list = response.data['restaurants'] as List;
    return list.map((e) => Restaurant.fromJson(e)).toList();
  }
  throw Exception('Failed to load restaurants');
});
