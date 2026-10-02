class Restaurant {
  final int id;
  final String name;
  final String slug;
  final String? logo;
  final String? address;
  final String? phone;
  final String? coverImage;
  final String? description;
  final bool qrOrderingEnabled;

  Restaurant({
    required this.id,
    required this.name,
    required this.slug,
    this.logo,
    this.address,
    this.phone,
    this.coverImage,
    this.description,
    this.qrOrderingEnabled = false,
  });

  factory Restaurant.fromJson(Map<String, dynamic> json) {
    return Restaurant(
      id: json['id'],
      name: json['name'],
      slug: json['slug'],
      logo: json['logo'],
      address: json['address'],
      phone: json['phone'],
      coverImage: json['coverImage'],
      description: json['description'],
      qrOrderingEnabled: json['qrOrderingEnabled'] ?? false,
    );
  }
}
