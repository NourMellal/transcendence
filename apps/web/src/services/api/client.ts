import { API_BASE_URL, HttpClient } from '../../modules/shared/services/HttpClient';

/**
 * Shared HttpClient instance used by vanilla services.
 * Keeping it in its own module avoids confusing the class definition file.
 */
export const httpClient = new HttpClient(API_BASE_URL);
