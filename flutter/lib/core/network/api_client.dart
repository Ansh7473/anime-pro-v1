import 'package:dio/dio.dart';

import '../config/backend_config.dart';

/// A thin wrapper around [Dio] that implements the same backend pooling the
/// website uses: every request starts on the next host in round-robin order and
/// transparently fails over to the remaining host(s) on connection errors,
/// timeouts, or 5xx responses. 4xx responses are deterministic and are not
/// retried.
class ApiClient {
  ApiClient() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          options.extra['_hosts'] ??= BackendConfig.ordered();
          options.extra['_attempt'] ??= 0;
          final hosts = options.extra['_hosts'] as List<String>;
          final attempt = options.extra['_attempt'] as int;
          options.baseUrl =
              '${hosts[attempt % hosts.length]}${BackendConfig.apiPath}';
          handler.next(options);
        },
        onError: (e, handler) async {
          final options = e.requestOptions;
          final hosts = (options.extra['_hosts'] as List<String>?) ??
              BackendConfig.ordered();
          final attempt = (options.extra['_attempt'] as int? ?? 0) + 1;
          final status = e.response?.statusCode;
          final retriable = e.type == DioExceptionType.connectionError ||
              e.type == DioExceptionType.connectionTimeout ||
              e.type == DioExceptionType.receiveTimeout ||
              e.type == DioExceptionType.sendTimeout ||
              (status != null && status >= 500);

          if (retriable && attempt < hosts.length) {
            options.extra['_attempt'] = attempt;
            try {
              final r = await _dio.fetch(options);
              return handler.resolve(r);
            } on DioException catch (err) {
              return handler.next(err);
            }
          }
          handler.next(e);
        },
      ),
    );
  }

  final Dio _dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 25),
      // Don't throw on <500 so callers can inspect 4xx bodies (e.g. auth).
      validateStatus: (s) => s != null && s < 500,
    ),
  );

  Dio get dio => _dio;

  Options _auth(String? token) => Options(
        headers: token == null ? null : {'Authorization': 'Bearer $token'},
      );

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? query,
    String? token,
  }) =>
      _dio.get<T>(path, queryParameters: query, options: _auth(token));

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? query,
    String? token,
  }) =>
      _dio.post<T>(path,
          data: data, queryParameters: query, options: _auth(token));

  Future<Response<T>> put<T>(
    String path, {
    Object? data,
    String? token,
  }) =>
      _dio.put<T>(path, data: data, options: _auth(token));

  Future<Response<T>> delete<T>(
    String path, {
    Map<String, dynamic>? query,
    String? token,
  }) =>
      _dio.delete<T>(path, queryParameters: query, options: _auth(token));
}
