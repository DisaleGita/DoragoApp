/**
 * Dorago Travel Document Service
 * Handles uploading, linking to trips/plans, signed URLs and storage
 */

import { TravelDocument, DocumentCategory } from '../types';
import { ClientStorage } from '../storage/clientStorage';
import { AnalyticsService } from './analyticsService';

export class DocumentService {
  static getDocumentsForTrip(tripId: string): TravelDocument[] {
    return ClientStorage.getDocuments().filter((d) => d.tripId === tripId);
  }

  static getDocumentsForPlan(planId: string): TravelDocument[] {
    return ClientStorage.getDocuments().filter((d) => d.planId === planId);
  }

  static getAllDocuments(): TravelDocument[] {
    return ClientStorage.getDocuments();
  }

  static async uploadDocument(
    file: File,
    options: {
      tripId?: string;
      planId?: string;
      category?: DocumentCategory;
    }
  ): Promise<TravelDocument> {
    const session = ClientStorage.getSession();
    const userId = session?.userId || 'usr_local';

    // In a production backend, this posts to Supabase Storage.
    // For client resilience, we generate a local blob URL and document record.
    const fileUrl = URL.createObjectURL(file);

    const newDoc: TravelDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      tripId: options.tripId,
      planId: options.planId,
      fileName: file.name,
      fileType: file.name.split('.').pop() || 'file',
      fileSizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
      storagePath: `/documents/${userId}/${file.name}`,
      downloadUrl: fileUrl,
      documentCategory: options.category || this.inferCategory(file.name),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docs = ClientStorage.getDocuments();
    docs.unshift(newDoc);
    ClientStorage.setDocuments(docs);

    AnalyticsService.track('document_uploaded', {
      category: newDoc.documentCategory,
      fileType: newDoc.fileType,
      tripId: options.tripId,
    });

    return newDoc;
  }

  static deleteDocument(docId: string): boolean {
    const docs = ClientStorage.getDocuments();
    const filtered = docs.filter((d) => d.id !== docId);
    if (filtered.length === docs.length) return false;

    ClientStorage.setDocuments(filtered);
    AnalyticsService.track('document_deleted', { docId });
    return true;
  }

  private static inferCategory(fileName: string): DocumentCategory {
    const name = fileName.toLowerCase();
    if (name.includes('boarding') || name.includes('pass')) return 'boarding_pass';
    if (name.includes('ticket')) return 'ticket';
    if (name.includes('hotel') || name.includes('voucher')) return 'hotel_voucher';
    if (name.includes('rental') || name.includes('car')) return 'rental_agreement';
    if (name.includes('receipt') || name.includes('invoice')) return 'receipt';
    if (name.includes('insurance')) return 'insurance_policy';
    if (name.includes('qr') || name.includes('barcode')) return 'qr_screenshot';
    return 'other';
  }
}
