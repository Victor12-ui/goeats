class MenuItemVariant {
  final int id;
  final String name;
  final double price;
  final int? stockLimit;
  final String? options;

  MenuItemVariant({
    required this.id,
    required this.name,
    required this.price,
    this.stockLimit,
    this.options,
  });

  factory MenuItemVariant.fromJson(Map<String, dynamic> json) {
    return MenuItemVariant(
      id: json['id'],
      name: json['name'],
      price: (json['price'] as num).toDouble(),
      stockLimit: json['stockLimit'],
      options: json['options'],
    );
  }
}

class MenuItem {
  final int id;
  final String name;
  final String? description;
  final String? image;
  final List<MenuItemVariant> variants;

  MenuItem({
    required this.id,
    required this.name,
    this.description,
    this.image,
    required this.variants,
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) {
    var variantsList = json['variants'] as List? ?? [];
    return MenuItem(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      image: json['image'],
      variants: variantsList.map((v) => MenuItemVariant.fromJson(v)).toList(),
    );
  }
}

class MenuCategory {
  final int id;
  final String name;
  final String? description;
  final List<MenuItem> items;

  MenuCategory({
    required this.id,
    required this.name,
    this.description,
    required this.items,
  });

  factory MenuCategory.fromJson(Map<String, dynamic> json) {
    var itemsList = json['items'] as List? ?? [];
    return MenuCategory(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      items: itemsList.map((i) => MenuItem.fromJson(i)).toList(),
    );
  }
}
