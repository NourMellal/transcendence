var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class HttpClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('authToken');
    }
    request(endpoint_1) {
        return __awaiter(this, arguments, void 0, function* (endpoint, options = {}) {
            const url = `${this.baseURL}${endpoint}`;
            const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers);
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            const config = Object.assign(Object.assign({}, options), { headers });
            try {
                const response = yield fetch(url, config);
                if (!response.ok) {
                    let errorMessage = `HTTP ${response.status}`;
                    try {
                        const errorData = yield response.json();
                        errorMessage = errorData.message || errorData.error || errorMessage;
                    }
                    catch (_a) {
                        errorMessage = response.statusText || errorMessage;
                    }
                    throw new Error(errorMessage);
                }
                if (response.status === 204) {
                    return null;
                }
                return yield response.json();
            }
            catch (error) {
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error('Network error occurred');
            }
        });
    }
    get(endpoint) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(endpoint);
        });
    }
    post(endpoint, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(endpoint, {
                method: 'POST',
                body: JSON.stringify(data),
            });
        });
    }
    put(endpoint, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(endpoint, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        });
    }
    delete(endpoint, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(endpoint, Object.assign({ method: 'DELETE' }, (options || {})));
        });
    }
    uploadFormData(endpoint_1, formData_1) {
        return __awaiter(this, arguments, void 0, function* (endpoint, formData, method = 'POST') {
            const url = `${this.baseURL}${endpoint}`;
            const headers = {};
            if (this.token)
                headers['Authorization'] = `Bearer ${this.token}`;
            const response = yield fetch(url, {
                method,
                headers,
                body: formData,
                credentials: 'include',
            });
            if (!response.ok) {
                let body = null;
                try {
                    body = yield response.json();
                }
                catch (_a) { }
                const err = new Error((body === null || body === void 0 ? void 0 : body.message) || response.statusText || `HTTP ${response.status}`);
                err.status = response.status;
                err.body = body;
                throw err;
            }
            const text = yield response.text();
            return (text ? JSON.parse(text) : null);
        });
    }
    upload(endpoint, formData) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${this.baseURL}${endpoint}`;
            const headers = {};
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            try {
                const response = yield fetch(url, {
                    method: 'POST',
                    headers,
                    body: formData,
                });
                if (!response.ok) {
                    let errorMessage = `HTTP ${response.status}`;
                    try {
                        const errorData = yield response.json();
                        errorMessage = errorData.message || errorData.error || errorMessage;
                    }
                    catch (_a) {
                        errorMessage = response.statusText || errorMessage;
                    }
                    throw new Error(errorMessage);
                }
                return yield response.json();
            }
            catch (error) {
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error('Network error occurred');
            }
        });
    }
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }
    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }
    isAuthenticated() {
        return !!this.token;
    }
}
