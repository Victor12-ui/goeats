import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../aggregator/models/restaurant.dart';
import '../models/menu_models.dart';

class CatalogData {
  final Restaurant restaurant;
  final List<MenuCategory> categories;

  CatalogData({required this.restaurant, required this.categories});
}

final catalogProvider = FutureProvider.family<CatalogData, String>((ref, slug) async {
  final dio = ref.read(dioProvider);
  final response = await dio.get('/restaurants/public/catalog/$slug');
  
  if (response.data['success']) {
    final restaurant = Restaurant.fromJson(response.data['restaurant']);
    final categoriesList = response.data['menuCategories'] as List;
    final categories = categoriesList.map((e) => MenuCategory.fromJson(e)).toList();
    
    return CatalogData(restaurant: restaurant, categories: categories);
  }
  throw Exception('Failed to load catalog');
});
