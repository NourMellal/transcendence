var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { HttpClient } from '../api/HttpClient';
export class AuthService {
    constructor(baseURL = '/api') {
        this.http = new HttpClient(baseURL);
    }
    login(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.http.post('/auth/login', credentials);
                if (response.token) {
                    this.http.setToken(response.token);
                }
                return response;
            }
            catch (error) {
                throw this.handleError(error);
            }
        });
    }
    register(userData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.http.post('/auth/register', userData);
            }
            catch (error) {
                throw this.handleError(error);
            }
        });
    }
    logout() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.http.post('/auth/logout', {});
            }
            catch (error) {
                console.error('Logout error:', error);
            }
            finally {
                this.http.clearToken();
            }
        });
    }
    getCurrentUser() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.http.get('/auth/me');
            }
            catch (error) {
                throw this.handleError(error);
            }
        });
    }
    isAuthenticated() {
        return this.http.isAuthenticated();
    }
    handleError(error) {
        var _a;
        if (error instanceof Error) {
            const anyErr = error;
            const message = ((_a = anyErr === null || anyErr === void 0 ? void 0 : anyErr.body) === null || _a === void 0 ? void 0 : _a.message) || anyErr.message || 'Request failed';
            const e = new Error(message);
            try {
                e.status = anyErr.status;
                e.body = anyErr.body;
            }
            catch (_b) {
                // ignore
            }
            return e;
        }
        return new Error('An unexpected error occurred');
    }
}
