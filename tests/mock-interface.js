import { render } from '@testing-library/react';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';

import { PrimerThemeProvider } from '@/TabNewsUI';

const createMockRouter = (router) => {
  return {
    route: '/',
    pathname: '',
    query: {},
    asPath: '',
    push: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn().mockResolvedValue(undefined),
    beforePopState: vi.fn(),
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
    isFallback: false,
    basePath: '',
    ...router,
  };
};

export const rendering = (ui, { route = '/', query = {} } = {}) => {
  window.matchMedia =
    window.matchMedia ||
    function () {
      return {
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      };
    };

  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  const router = createMockRouter({ route, query });

  return render(
    <PrimerThemeProvider>
      <RouterContext.Provider value={router}>{ui}</RouterContext.Provider>
    </PrimerThemeProvider>,
  );
};
