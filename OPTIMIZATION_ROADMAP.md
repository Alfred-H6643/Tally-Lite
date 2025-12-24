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

### Phase 2: Offline Persistence & Battery Optimization
- **Problem**: Constant radio usage for real-time Firebase listeners can cause "phone heating."
- **Solution**: 
    - Enable [Firestore Offline Persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline).
    - Switch from `onSnapshot` (real-time) to `getDoc/getDocs` (pull-on-demand) for historical data (years before the current one).
- **Impact**: Reduces network overhead and improves battery life.

### Phase 3: Off-Main-Thread Calculations (Web Workers)
- **Problem**: Precomputing complex subcategory data for the Report page can block the UI thread for several milliseconds.
- **Solution**: Move data aggregation and currency conversion logic to a **Web Worker**. The UI sends the raw data, and the Worker returns the processed chart data.
- **Impact**: Keeps the UI perfectly responsive even during heavy data processing.

### Phase 4: Module Splitting & Code Organization
- **Problem**: `Report.tsx` and `AddTransaction.tsx` are becoming large (600-900 lines), which can slightly slow down initial JS parsing.
- **Solution**: Break down large components into a multi-file directory structure (e.g., `src/components/Report/Chart.tsx`, `src/components/Report/ItemList.tsx`).
- **Impact**: Improves maintainability and allows for better React code-splitting if needed.
