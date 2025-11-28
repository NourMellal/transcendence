// apps/web/src/modules/auth/services/AuthService.ts (NEW)
import { appState, AuthActions } from '@/state';
import { httpClient } from '@/modules/shared/services';  
import { LoginResponse } from '@/types';
class AuthService {
  async login(email: string, password: string): Promise<void> {
    const response = await httpClient.post<LoginResponse>('/api/auth/login', {
      email,
      password,
    });
    // Store tokens
    appState.auth.set({
        user: response.data?.user,
        token: response.data?.accessToken,
        isAuthenticated: true,
        isLoading: false
    });
    
    localStorage.setItem('accessToken',    
            response.data!.accessToken! 
    );
    localStorage.setItem('refreshToken', 
        response.data!.accessToken!  
    ) 
  }
  async register(username: string, email: string, password: string): Promise<void> {
    const response = await httpClient.post<LoginResponse>('/api/auth/register', {
      username,
      email,
      password,
    });

    // Auto-login after registration
    appState.auth.set({
      user: response.data?.user,
      token: response.data?.accessToken,
      isAuthenticated: true, 
      isLoading : false , 
    });
    
    localStorage.setItem('accessToken', response.data!.accessToken!);
    localStorage.setItem('refreshToken', response.data!.refreshToken!);
  }

  logout(): void {
    AuthActions.resetAuth() ;        
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Check if user is logged in (e.g., on app load)
  async checkAuth(): Promise<void> {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {  
      AuthActions.resetAuth() ;   
      return;
    }

    try {
      const user = await httpClient.get<any>('/api/users/me');
      
      appState.auth.set({
        user,
        token,
        isAuthenticated: true, 
        isLoading : false 
      });
    } catch (error) {
      // Token invalid, clear auth
      this.logout();
    }
  }
}

export default  new AuthService();