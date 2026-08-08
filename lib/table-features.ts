import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_arrIncludes,
  filterFn_equals,
  filterFn_inDateRange,
  filterFn_inNumberRange,
  filterFn_includesString,
  filterFn_weakEquals,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";

/**
 * The feature set shared by every TanStack table in the app.
 *
 * v9 no longer bundles features automatically — each one has to be registered
 * here before the row-model slot that depends on it. This object is also the
 * source of the `TFeatures` generic that threads through `ColumnDef`, `Column`,
 * `Row`, `Cell` and `Table`, so exporting it once keeps the column definitions
 * and the shared table components readable.
 *
 * There is no `paginatedRowModel` slot on purpose: both tables set
 * `manualPagination: true` and let the server slice the rows.
 */
export const tableFeatureSet = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  columnFacetingFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  // The whole-registry `filterFns`/`sortFns` exports are deprecated in v9
  // because they pull every built-in into the bundle. Name resolution only
  // finds what is registered here, so these are exactly the functions
  // `filterFn: "auto"` and `sortFn: "auto"` can resolve to — every other
  // built-in is reachable only by a name no column in this app uses.
  filterFns: {
    arrIncludes: filterFn_arrIncludes,
    equals: filterFn_equals,
    inDateRange: filterFn_inDateRange,
    inNumberRange: filterFn_inNumberRange,
    includesString: filterFn_includesString,
    weakEquals: filterFn_weakEquals,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
});

export type AppTableFeatures = typeof tableFeatureSet;
