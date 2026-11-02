# Architecture Review & Future Optimization Roadmap

## 1. Architectural Integrity Check

After a comprehensive review of the current codebase, the following conclusions have been drawn regarding the stability and efficiency of the application:

### Data Flow & Context
- **Stability**: The `AppContext` efficiently manages global state. The implementation of `transactionFilter` with superset/subset checking significantly reduces unnecessary Firebase re-fetches.
- **Consistency**: Centralized logic for TWD conversion and budget aggregation (Subcategory -> Category) ensures data consistency across the Dashboard and Report pages.

### Component Performance
- **Memoization**: Competitive use of `React.memo` and `useCallback` in `Report.tsx`, `Dashboard.tsx`, and `AddTransaction.tsx` has successfully mitigated mobile interaction issues (double-clicks) and input lag.
- **Computation**: Heavy calculations (like `allSubcategoryData`) are correctly wrapped in `useMemo`, ensuring they only run when relevant data (categories, transactions) or filters change.

### Potential Risks
- **Large Dataset**: As the number of transactions grows (e.g., >1000 per month), the local filtering logic in `useMemo` will eventually hit a ceiling on low-end mobile devices.
- **Firestore Listeners**: Real-time snapshots are convenient but consume battery if the app stays open. Scaling to many years of data may require more aggressive pagination.

---

## 2. Future Optimization Roadmap

If the application begins to experience lag, long loading times, or causes devices to heat up as data volume increases, I recommend the following optimization phases:

### Phase 1: List Virtualization (Priority: High)
- **Problem**: Rendering hundreds of DOM nodes (transaction rows) on the Dashboard creates "jank" during scrolling.
- **Solution**: Implement "Virtual Scrolling" using libraries like `react-window` or `react-virtuoso`. Only render the rows currently visible on the screen.
- **Impact**: Dramatically reduces memory usage and GPU load during scrolling.

### Phase 2: Offline Bookkeeping (Future Direction, Not Started)
- **Problem**: The app can't open without a network, because there is no service worker. Firestore's device cache already keeps data and queues writes, but the app shell itself isn't available offline.
- **Solution**: Add a service worker (e.g. `vite-plugin-pwa`) that caches the app shell.
- **Impact**: Bookkeeping works in weak-signal or offline situations.

### Phase 3: Off-Main-Thread Calculations (Web Workers)
- **Problem**: Precomputing complex subcategory data for the Report page can block the UI thread for several milliseconds.
- **Solution**: Move data aggregation and currency conversion logic to a **Web Worker**. The UI sends the raw data, and the Worker returns the processed chart data.
- **Impact**: Keeps the UI perfectly responsive even during heavy data processing.

### Phase 4: Code Cleanup (After the Current Feature Round, as Its Own Commit)
- **Problem**: `Report.tsx` is over 1,000 lines, and `npm run lint` reports dozens of problems, mostly type annotations.
- **Solution**: Break large components into smaller files and clear the lint errors, with no behavior change.
- **Impact**: Improves maintainability. No user-visible change.
