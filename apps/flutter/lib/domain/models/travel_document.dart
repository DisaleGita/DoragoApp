class TravelDocument {
  const TravelDocument({
    required this.id,
    required this.tripId,
    required this.fileName,
    required this.mimeType,
    required this.fileSizeBytes,
    required this.category,
    required this.createdAt,
    this.planId,
  });

  factory TravelDocument.fromJson(Map<String, dynamic> json) => TravelDocument(
    id: json['id'] as String,
    tripId: json['trip_id'] as String,
    planId: json['plan_id'] as String?,
    fileName: json['file_name'] as String,
    mimeType: json['mime_type'] as String,
    fileSizeBytes: json['file_size_bytes'] as int,
    category: json['document_category'] as String,
    createdAt: DateTime.parse(json['created_at'] as String),
  );

  final String id;
  final String tripId;
  final String? planId;
  final String fileName;
  final String mimeType;
  final int fileSizeBytes;
  final String category;
  final DateTime createdAt;
}
