import 'package:flutter_dotenv/flutter_dotenv.dart';

class Constants {
  static String get apiBaseUrl => dotenv.env['API_BASE_URL'] ?? 'http://192.168.101.64:5000/api';
  static String get socketUrl => dotenv.env['SOCKET_URL'] ?? 'http://192.168.101.64:5000';
}
