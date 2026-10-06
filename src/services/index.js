/* Sikhify — every data service in one import. UI code talks to these, never to fetch() directly. */
export { authService } from './auth/authService.js';
export { userService, postService, commentService, groupService, notificationService, reportService, uploadService } from './community/index.js';
export { mediaService, youtubeService } from './media/mediaService.js';
export { hukamnamaService } from './hukamnama/hukamnamaService.js';
export { entryService, eventService, personalityService, newsService, submissionService } from './content/contentService.js';
export { gurdwaraService } from './gurdwaras/gurdwaraService.js';
export { adminService } from './admin/adminService.js';
export { searchService } from './search/searchService.js';
export { ApiError, isApiUnavailable } from './api/client.js';
