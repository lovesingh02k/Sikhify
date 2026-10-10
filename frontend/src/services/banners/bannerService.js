/* Sikhify — bannerService: homepage banners (public read; staff management is in adminService). */
import { get } from '../api/client.js';

export const bannerService = {
  /** Published banners inside their date window, in display order (at most a few). */
  home: () => get('/api/banners/home'),
};
