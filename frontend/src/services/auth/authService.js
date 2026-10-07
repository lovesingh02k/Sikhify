/* Sikhify — authService: sign up, sign in, sign out, password reset. */
import { get, post } from '../api/client.js';

export const authService = {
  me: () => get('/api/auth/me').then((d) => d.user),
  signup: (input) => post('/api/auth/signup', input).then((d) => d.user),
  login: (identifier, password) => post('/api/auth/login', { identifier, password }).then((d) => d.user),
  logout: () => post('/api/auth/logout'),
  logoutEverywhere: () => post('/api/auth/logout-all'),
  forgotPassword: (email) => post('/api/auth/forgot-password', { email }),
  resetPassword: (token, password) => post('/api/auth/reset-password', { token, password }),
  changePassword: (current, next) => post('/api/auth/change-password', { current, next }),
  publicSettings: () => get('/api/settings/public'),
};
