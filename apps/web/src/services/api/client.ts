import { HttpClient } from '../../modules/shared/services/HttpClient';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '/api';

/**
 * Shared HttpClient instance used by vanilla services.
 * Keeping it in its own module avoids confusing the class definition file.
 */
export const httpClient = new HttpClient(API_BASE);
