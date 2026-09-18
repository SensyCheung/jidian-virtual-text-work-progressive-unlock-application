import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useIsCallerAdmin, useGetAnalyticsSettings } from './hooks/useQueries';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { RouterProvider, createRouter, createRootRoute, createRoute, Outlet, useNavigate, useSearch, useLocation } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ProductList from './components/ProductList';
import ProfileSetupModal from './components/ProfileSetupModal';
import PersonalSettings from './components/PersonalSettings';
import AboutPage from './components/AboutPage';
import ArticleDetailPage from './components/ArticleDetailPage';
import AdminDashboard from './components/AdminDashboard';

// Google Analytics initialization function
function initializeGoogleAnalytics(trackingId: string) {
  // Check if GA is already loaded
  if (window.gtag) {
    console.log('[GA] Google Analytics already loaded');
    return;
  }

  console.log('[GA] Initializing Google Analytics with tracking ID:', trackingId);

  // Create and inject GA script
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${trackingId}', {
      page_path: window.location.pathname,
    });
  `;
  document.head.appendChild(script2);

  console.log('[GA] Google Analytics scripts injected');
}

// Track page view
function trackPageView(path: string) {
  if (window.gtag) {
    console.log('[GA] Tracking page view:', path);
    window.gtag('config', window.GA_TRACKING_ID || '', {
      page_path: path,
    });
  }
}

// Declare gtag global type
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    GA_TRACKING_ID?: string;
    eruda?: {
      init: () => void;
      position: (pos: { x: number; y: number }) => void;
    };
  }
}

// Root layout component
function RootLayout() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();
  const { data: analyticsSettings } = useGetAnalyticsSettings();
  const navigate = useNavigate();
  const search = useSearch({ from: '__root__' });
  const location = useLocation();

  // Track if admin status has been processed to prevent reload loops
  const adminStatusProcessedRef = useRef(false);
  const gaInitializedRef = useRef(false);
  const deepLinkProcessedRef = useRef(false);

  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  // Log app initialization (only once)
  useEffect(() => {
    console.log('[App] Application started');
    console.log('[App] Current URL:', window.location.href);
    console.log('[App] Pathname:', window.location.pathname);
    console.log('[App] Search params:', window.location.search);
  }, []);

  // Initialize Google Analytics when settings are loaded (only once)
  useEffect(() => {
    if (gaInitializedRef.current) {
      return;
    }

    if (analyticsSettings && analyticsSettings.analyticsEnabled && analyticsSettings.gaTrackingId) {
      console.log('[GA] Analytics settings loaded:', analyticsSettings);
      window.GA_TRACKING_ID = analyticsSettings.gaTrackingId;
      initializeGoogleAnalytics(analyticsSettings.gaTrackingId);
      gaInitializedRef.current = true;
    } else if (analyticsSettings) {
      console.log('[GA] Analytics disabled or no tracking ID configured');
      gaInitializedRef.current = true;
    }
  }, [analyticsSettings]);

  // Track page views on route changes
  useEffect(() => {
    if (analyticsSettings?.analyticsEnabled && window.gtag) {
      trackPageView(location.pathname);
    }
  }, [location.pathname, analyticsSettings]);

  // Update admin status in localStorage when isCallerAdmin query completes
  // This effect is carefully designed to prevent infinite reload loops
  useEffect(() => {
    // Skip if already processed or still loading
    if (adminStatusProcessedRef.current || isAdminLoading) {
      return;
    }

    // Only process when authentication state is stable
    if (isAuthenticated && isAdmin !== undefined) {
      const currentStoredValue = localStorage.getItem('isAdmin');
      const newValue = isAdmin.toString();
      
      if (currentStoredValue !== newValue) {
        console.log('[App] Updating admin status in localStorage:', isAdmin);
        localStorage.setItem('isAdmin', newValue);
        adminStatusProcessedRef.current = true;
        
        // Only reload if user just became admin AND Eruda is not loaded
        // This prevents reload loops on subsequent page loads
        if (isAdmin && !window.eruda && currentStoredValue !== 'true') {
          console.log('[App] Admin status granted for first time, reloading to initialize Eruda');
          // Use a flag to prevent repeated reloads
          sessionStorage.setItem('eruداReloadPending', 'true');
          window.location.reload();
        }
      } else {
        // Status matches, mark as processed
        adminStatusProcessedRef.current = true;
      }
    } else if (!isAuthenticated) {
      // Clear admin flag when not authenticated (only if it exists)
      const currentStoredValue = localStorage.getItem('isAdmin');
      if (currentStoredValue !== null) {
        console.log('[App] Clearing admin status from localStorage (user not authenticated)');
        localStorage.removeItem('isAdmin');
      }
      adminStatusProcessedRef.current = true;
    }
  }, [isAuthenticated, isAdmin, isAdminLoading]);

  // Unified deep-link handler: detects query parameters and navigates to corresponding routes
  // This effect includes safeguards to prevent infinite redirect loops
  useEffect(() => {
    // Skip if already processed
    if (deepLinkProcessedRef.current) {
      return;
    }

    console.log('[DeepLink] Deep link check triggered', {
      isInitializing,
      search,
      searchKeys: search ? Object.keys(search) : [],
    });

    // Wait for canister initialization to complete
    if (isInitializing) {
      console.log('[DeepLink] Waiting for canister initialization...');
      return;
    }

    if (!search) {
      console.log('[DeepLink] No search parameters found');
      deepLinkProcessedRef.current = true;
      return;
    }

    // Handle ?article=:id parameter
    if ('article' in search) {
      const workId = (search as any).article;
      console.log('[DeepLink] Article parameter detected:', {
        workId,
        type: typeof workId,
      });

      if (workId) {
        console.log('[DeepLink] Navigating to article detail page:', `/article/${workId}`);
        try {
          // Navigate to article detail page
          navigate({ to: '/article/$id', params: { id: workId } });
          console.log('[DeepLink] Navigation initiated successfully');
          deepLinkProcessedRef.current = true;
        } catch (error) {
          console.error('[DeepLink] Navigation failed:', error);
        }
      } else {
        console.warn('[DeepLink] Article ID is empty or invalid');
        deepLinkProcessedRef.current = true;
      }
      return;
    }

    // Handle ?work=:id parameter (alternative naming)
    if ('work' in search) {
      const workId = (search as any).work;
      console.log('[DeepLink] Work parameter detected:', {
        workId,
        type: typeof workId,
      });

      if (workId) {
        console.log('[DeepLink] Navigating to article detail page:', `/article/${workId}`);
        try {
          navigate({ to: '/article/$id', params: { id: workId } });
          console.log('[DeepLink] Navigation initiated successfully');
          deepLinkProcessedRef.current = true;
        } catch (error) {
          console.error('[DeepLink] Navigation failed:', error);
        }
      } else {
        console.warn('[DeepLink] Work ID is empty or invalid');
        deepLinkProcessedRef.current = true;
      }
      return;
    }

    console.log('[DeepLink] No recognized deep link parameters found');
    deepLinkProcessedRef.current = true;
  }, [isInitializing, search, navigate]);

  if (isInitializing) {
    console.log('[App] Showing initialization loading screen');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  console.log('[App] Initialization complete, rendering main layout');

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {showProfileSetup && <ProfileSetupModal />}
    </div>
  );
}

// Create root route with layout
const rootRoute = createRootRoute({
  component: RootLayout,
  validateSearch: (search: Record<string, unknown>) => {
    console.log('[Router] Validating search params:', search);
    return search;
  },
});

// Create index route (home page - shows paid works list for all users)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ProductList,
});

// Create about route
const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
});

// Create settings route
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: PersonalSettings,
});

// Create article detail route
const articleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/article/$id',
  component: ArticleDetailPage,
});

// Create admin dashboard route
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminDashboard,
});

// Create router
const routeTree = rootRoute.addChildren([indexRoute, aboutRoute, settingsRoute, articleRoute, adminRoute]);
const router = createRouter({ routeTree });

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  console.log('[App] App component rendering');
  
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>
        <RouterProvider router={router} />
        <Toaster />
      </LanguageProvider>
    </ThemeProvider>
  );
}
