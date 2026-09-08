import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth-context';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test component that uses useAuth hook
function TestComponent() {
  const { user, token, login, logout, signup } = useAuth();

  return (
    <div>
      <div data-testid="user-info">
        {user ? `${user.id}-${user.email}` : 'no user'}
      </div>
      <div data-testid="token-info">{token || 'no token'}</div>
      <button
        data-testid="login-btn"
        onClick={() =>
          login('test-token', { id: 1, email: 'test@example.com', role: 'admin' })
        }
      >
        Login
      </button>
      <button
        data-testid="signup-btn"
        onClick={() =>
          signup('signup-token', { id: 2, email: 'signup@example.com', role: 'admin' })
        }
      >
        Signup
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should initialize with null user and token', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-info')).toHaveTextContent('no user');
    expect(screen.getByTestId('token-info')).toHaveTextContent('no token');
  });

  it('should login user and store token', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginBtn = screen.getByTestId('login-btn');

    act(() => {
      loginBtn.click();
    });

    expect(screen.getByTestId('user-info')).toHaveTextContent('1-test@example.com');
    expect(screen.getByTestId('token-info')).toHaveTextContent('test-token');
    expect(localStorageMock.getItem('token')).toBe('test-token');
    expect(JSON.parse(localStorageMock.getItem('user')!)).toEqual({
      id: 1,
      email: 'test@example.com',
      role: 'admin',
    });
  });

  it('should signup user and store token', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const signupBtn = screen.getByTestId('signup-btn');

    act(() => {
      signupBtn.click();
    });

    expect(screen.getByTestId('user-info')).toHaveTextContent('2-signup@example.com');
    expect(screen.getByTestId('token-info')).toHaveTextContent('signup-token');
  });

  it('should logout user and clear token', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginBtn = screen.getByTestId('login-btn');
    const logoutBtn = screen.getByTestId('logout-btn');

    act(() => {
      loginBtn.click();
    });

    expect(screen.getByTestId('user-info')).toHaveTextContent('1-test@example.com');

    act(() => {
      logoutBtn.click();
    });

    expect(screen.getByTestId('user-info')).toHaveTextContent('no user');
    expect(screen.getByTestId('token-info')).toHaveTextContent('no token');
    expect(localStorageMock.getItem('token')).toBeNull();
    expect(localStorageMock.getItem('user')).toBeNull();
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    const TestComponentWithoutProvider = () => {
      try {
        useAuth();
        return <div>No error</div>;
      } catch (error) {
        return <div>{(error as Error).message}</div>;
      }
    };

    render(<TestComponentWithoutProvider />);
    expect(screen.getByText('useAuth must be used within AuthProvider')).toBeInTheDocument();
  });

  it('should persist user data across provider instances', () => {
    // Set initial data
    localStorageMock.setItem('token', 'persisted-token');
    localStorageMock.setItem('user', JSON.stringify({ id: 3, email: 'persisted@example.com', role: 'admin' }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-info')).toHaveTextContent('3-persisted@example.com');
    expect(screen.getByTestId('token-info')).toHaveTextContent('persisted-token');
  });
});
