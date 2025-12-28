/**
 * Exports centralisés des composants UI réutilisables
 * 
 * Ce fichier permet d'importer plusieurs composants en une seule ligne:
 * import { PageHeader, SearchFilters, DataTable } from "@/components/ui";
 */

// Layout & Structure
export { PageHeader } from "./page-header";
export { SearchFilters, type FilterConfig, type FilterOption } from "./search-filters";

// Tables
export { DataTable, type ColumnDef } from "./data-table";
export { TableActions, CrudActions } from "./table-actions";
export { SortableHeader, useSorting } from "./sortable-header";
export type { SortDirection } from "./sortable-header";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./table";

// Dialogs & Modals
export { FormDialog } from "./form-dialog";
export { DetailsDialog, DetailField } from "./details-dialog";
export { ConfirmDialog } from "./confirm-dialog";
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogTrigger,
} from "./dialog";
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

// Forms
export {
  FormField,
  FormGrid,
  FormSection,
  TextInput,
  TextAreaInput,
  SelectInput,
} from "./form-fields";
export { Input } from "./input";
export { Label } from "./label";
export { Textarea } from "./textarea";
export { Checkbox } from "./checkbox";
export { RadioGroup, RadioGroupItem } from "./radio-group";
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

// Feedback & States
export { LoadingState, LoadingOverlay, InlineLoader } from "./loading-state";
export { EmptyState } from "./empty-state";
export {
  Skeleton,
  PageSkeleton,
  PageHeaderSkeleton,
  SearchFiltersSkeleton,
  TableSkeleton,
  TableRowSkeleton,
  StatCardSkeleton,
  StatsGridSkeleton,
  FormSkeleton,
} from "./skeleton";

// Navigation
export { Pagination, PaginationInfo } from "./pagination";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

// Display
export { Badge } from "./badge";
export { Button } from "./button";
export { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./card";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
