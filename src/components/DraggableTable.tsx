import React, { useState, useRef, useEffect, useCallback } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, SortingState, ColumnOrderState, VisibilityState, getPaginationRowModel } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUpDown, Lock, ChevronLeft, ChevronRight, UnlockIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toggle } from "@/components/ui/toggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const STORAGE_KEYS = {
  COLUMN_ORDER: 'draggable-table-column-order',
  COLUMN_WIDTHS: 'draggable-table-column-widths',
  COLUMN_VISIBILITY: 'draggable-table-column-visibility',
  LOCKED_COLUMNS: 'draggable-table-locked-columns',
  PAGE_SIZE: 'draggable-table-page-size',
  PAGE_INDEX: 'draggable-table-page-index',
  ALL_COLUMNS_LOCKED: 'draggable-table-all-columns-locked'
};

export interface DraggableTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  caption?: string;
  onRowOrderChange?: (newData: TData[]) => void;
  onColumnOrderChange?: (newOrder: string[]) => void;
  enableRowDragging?: boolean;
  enableColumnDragging?: boolean;
  enableColumnResizing?: boolean;
  storageId?: string;
  enablePersistence?: boolean;
  lockedColumns?: string[];
  onRowDoubleClick?: (row: TData) => void;
  searchValue?: string;
  tableHeight?: string;
}

export function DraggableTable<TData>({
  data,
  columns,
  caption,
  onRowOrderChange,
  onColumnOrderChange,
  enableRowDragging = true,
  enableColumnDragging = true,
  enableColumnResizing = true,
  storageId = 'default',
  enablePersistence = true,
  lockedColumns = ['select', 'actions'],
  onRowDoubleClick,
  searchValue,
  tableHeight = "500px"
}: DraggableTableProps<TData>) {
  const location = useLocation();
  const pageUrl = location.pathname;
  const isMobile = useIsMobile();

  const getStorageKey = useCallback((key: string) => `${key}-${storageId}-${pageUrl.replace(/\//g, '-')}`, [storageId, pageUrl]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pageSize, setPageSize] = useState<number>(() => {
    if (!enablePersistence) return 10;
    try {
      const storedPageSize = localStorage.getItem(getStorageKey(STORAGE_KEYS.PAGE_SIZE));
      if (storedPageSize) {
        return parseInt(storedPageSize, 10);
      }
    } catch (e) {
      console.error("Error loading page size from localStorage:", e);
    }
    return 10;
  });
  const [pageIndex, setPageIndex] = useState<number>(() => {
    if (!enablePersistence) return 0;
    try {
      const storedPageIndex = localStorage.getItem(getStorageKey(STORAGE_KEYS.PAGE_INDEX));
      if (storedPageIndex) {
        return parseInt(storedPageIndex, 10);
      }
    } catch (e) {
      console.error("Error loading page index from localStorage:", e);
    }
    return 0;
  });
  const [userLockedColumns, setUserLockedColumns] = useState<string[]>(() => {
    if (!enablePersistence) return [];
    try {
      const storedLocked = localStorage.getItem(getStorageKey(STORAGE_KEYS.LOCKED_COLUMNS));
      if (storedLocked) {
        return JSON.parse(storedLocked) as string[];
      }
    } catch (e) {
      console.error("Error loading locked columns from localStorage:", e);
    }
    return [];
  });
  
  const [allColumnsLocked, setAllColumnsLocked] = useState<boolean>(() => {
    if (!enablePersistence) return false;
    try {
      const storedAllLocked = localStorage.getItem(getStorageKey(STORAGE_KEYS.ALL_COLUMNS_LOCKED));
      if (storedAllLocked) {
        return JSON.parse(storedAllLocked) as boolean;
      }
    } catch (e) {
      console.error("Error loading all columns locked state from localStorage:", e);
    }
    return false;
  });

  const allLockedColumns = allColumnsLocked
    ? columns.map(col => typeof col.id === 'string' ? col.id : "unknown")
    : [...lockedColumns, ...userLockedColumns];

  const initialColumnOrder = columns.map(col => {
    // Extract the column ID properly
    if (typeof col.id === 'string') {
      return col.id;
    } else if (typeof col.accessorKey === 'string') {
      return col.accessorKey;
    } else {
      console.warn("Column without proper ID:", col);
      return `column-${Math.random().toString(36).substring(2, 9)}`;  // Generate a unique ID instead of "unknown"
    }
  });
  
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => {
    if (!enablePersistence) return initialColumnOrder;
    try {
      const storedOrder = localStorage.getItem(getStorageKey(STORAGE_KEYS.COLUMN_ORDER));
      if (storedOrder) {
        const parsedOrder = JSON.parse(storedOrder) as string[];
        const missingColumns = initialColumnOrder.filter(id => !parsedOrder.includes(id));
        return [...parsedOrder, ...missingColumns];
      }
    } catch (e) {
      console.error("Error loading column order from localStorage:", e);
    }
    return initialColumnOrder;
  });
  
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (!enablePersistence) return {};
    try {
      const storedWidths = localStorage.getItem(getStorageKey(STORAGE_KEYS.COLUMN_WIDTHS));
      if (storedWidths) {
        return JSON.parse(storedWidths) as Record<string, number>;
      }
    } catch (e) {
      console.error("Error loading column widths from localStorage:", e);
    }
    return {};
  });
  
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizingColumnId = useRef<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const initialWidth = useRef<number>(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnOrder,
      columnVisibility
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true
  });

  useEffect(() => {
    if (enablePersistence) {
      localStorage.setItem(getStorageKey(STORAGE_KEYS.PAGE_SIZE), String(pageSize));
      localStorage.setItem(getStorageKey(STORAGE_KEYS.PAGE_INDEX), String(pageIndex));
    }
  }, [pageSize, pageIndex, enablePersistence, getStorageKey]);

  useEffect(() => {
    if (enablePersistence) {
      localStorage.setItem(getStorageKey(STORAGE_KEYS.COLUMN_ORDER), JSON.stringify(columnOrder));
    }
    if (onColumnOrderChange) {
      onColumnOrderChange(columnOrder);
    }
  }, [columnOrder, enablePersistence, getStorageKey, onColumnOrderChange]);

  useEffect(() => {
    if (enablePersistence && Object.keys(columnWidths).length > 0) {
      localStorage.setItem(getStorageKey(STORAGE_KEYS.COLUMN_WIDTHS), JSON.stringify(columnWidths));
    }
  }, [columnWidths, enablePersistence, getStorageKey]);

  useEffect(() => {
    if (enablePersistence) {
      localStorage.setItem(getStorageKey(STORAGE_KEYS.COLUMN_VISIBILITY), JSON.stringify(columnVisibility));
    }
  }, [columnVisibility, enablePersistence, getStorageKey]);

  useEffect(() => {
    if (enablePersistence) {
      localStorage.setItem(getStorageKey(STORAGE_KEYS.LOCKED_COLUMNS), JSON.stringify(userLockedColumns));
    }
  }, [userLockedColumns, enablePersistence, getStorageKey]);
  
  useEffect(() => {
    if (enablePersistence) {
      localStorage.setItem(getStorageKey(STORAGE_KEYS.ALL_COLUMNS_LOCKED), JSON.stringify(allColumnsLocked));
    }
  }, [allColumnsLocked, enablePersistence, getStorageKey]);

  useEffect(() => {
    if (enablePersistence) {
      try {
        const storedVisibility = localStorage.getItem(getStorageKey(STORAGE_KEYS.COLUMN_VISIBILITY));
        if (storedVisibility) {
          setColumnVisibility(JSON.parse(storedVisibility));
        }
      } catch (e) {
        console.error("Error loading column visibility from localStorage:", e);
      }
    }
  }, [enablePersistence, getStorageKey]);

  useEffect(() => {
    if (searchValue !== undefined) {
      table.setPageIndex(0);
    }
  }, [searchValue, table]);

  const handleRowDragStart = (index: number) => {
    if (!enableRowDragging || allColumnsLocked) return;
    setDraggedRowIndex(index);
  };
  
  const handleRowDragOver = (e: React.DragEvent, index: number) => {
    if (!enableRowDragging || draggedRowIndex === null || allColumnsLocked) return;
    e.preventDefault();
    setDragOverRowIndex(index);
  };
  
  const handleRowDragEnd = () => {
    if (!enableRowDragging || draggedRowIndex === null || dragOverRowIndex === null || allColumnsLocked) {
      setDraggedRowIndex(null);
      setDragOverRowIndex(null);
      return;
    }
    const newData = [...data];
    const [movedItem] = newData.splice(draggedRowIndex, 1);
    newData.splice(dragOverRowIndex, 0, movedItem);
    if (onRowOrderChange) {
      onRowOrderChange(newData);
    }
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
    toast.success("Row order updated");
  };

  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    console.log("Drag start:", columnId);
    if (!enableColumnDragging || isLockedColumn(columnId) || allColumnsLocked) return;
    e.stopPropagation();
    setDraggedColumnId(columnId);
    
    // Create better ghost image for dragging
    const element = e.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const ghostElement = element.cloneNode(true) as HTMLElement;
    
    // Style the ghost element
    ghostElement.style.width = `${rect.width}px`;
    ghostElement.style.height = `${rect.height}px`;
    ghostElement.style.backgroundColor = 'rgba(220, 220, 250, 0.8)';
    ghostElement.style.border = '2px dashed #6366f1';
    ghostElement.style.borderRadius = '4px';
    ghostElement.style.padding = '4px';
    ghostElement.style.position = 'absolute';
    ghostElement.style.top = '-1000px';
    ghostElement.style.left = '0';
    ghostElement.style.zIndex = '9999';
    
    // Add ghost to document and set as drag image
    document.body.appendChild(ghostElement);
    e.dataTransfer.setDragImage(ghostElement, rect.width / 2, rect.height / 2);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual style to the dragged column
    element.style.opacity = '0.5';
    element.style.border = '2px dashed #6366f1';
    
    // Clean up the ghost element after drag starts
    setTimeout(() => {
      document.body.removeChild(ghostElement);
    }, 0);
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    if (!enableColumnDragging || draggedColumnId === null || isLockedColumn(columnId) || allColumnsLocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Don't allow dragging to locked columns or self
    if (isLockedColumn(columnId) || draggedColumnId === columnId) return;

    if (draggedColumnId !== columnId) {
      setDragOverColumnId(columnId);

      // Get the current element
      const dropTarget = e.currentTarget as HTMLElement;

      // Add visual indicator for drop target
      const headers = document.querySelectorAll('[data-column-id]');
      headers.forEach(header => {
        (header as HTMLElement).style.border = '';
      });

      // Highlight the drop target
      console.log("Column order:", columnOrder);
      console.log("Dragged column ID:", draggedColumnId);
      console.log("Target column ID:", columnId);

      // Find the indices in the column order array
      const draggedIdx = columnOrder.indexOf(draggedColumnId);
      const targetIdx = columnOrder.indexOf(columnId);

      console.log("Dragged index:", draggedIdx, "Target index:", targetIdx);

      // Only apply border if both indices are valid
      if (draggedIdx !== -1 && targetIdx !== -1) {
        if (draggedIdx < targetIdx) {
          // Dragging right
          dropTarget.style.borderRight = '2px solid #6366f1';
        } else {
          // Dragging left
          dropTarget.style.borderLeft = '2px solid #6366f1';
        }
      } else {
        console.warn(`Column indices not found. Dragged: ${draggedColumnId} (${draggedIdx}), Target: ${columnId} (${targetIdx})`);
      }
    }
  };

  const handleColumnDragEnd = (e: React.DragEvent) => {
    console.log("Drag end. Dragged:", draggedColumnId, "Target:", dragOverColumnId);

    // Reset all column styles
    const headers = document.querySelectorAll('[data-column-id]');
    headers.forEach(header => {
      (header as HTMLElement).style.opacity = '';
      (header as HTMLElement).style.border = '';
    });

    if (!enableColumnDragging || draggedColumnId === null || dragOverColumnId === null || allColumnsLocked) {
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      return;
    }

    // Skip if source and target are the same
    if (draggedColumnId === dragOverColumnId) {
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      return;
    }

    // Get current column order
    const currentIndex = columnOrder.indexOf(draggedColumnId);
    const targetIndex = columnOrder.indexOf(dragOverColumnId);

    console.log("Current index:", currentIndex, "Target index:", targetIndex);

    if (currentIndex !== -1 && targetIndex !== -1) {
      // Create new column order
      const newColumnOrder = [...columnOrder];
      newColumnOrder.splice(currentIndex, 1);
      newColumnOrder.splice(targetIndex, 0, draggedColumnId);

      console.log("New column order:", newColumnOrder);

      // Apply new column order
      table.setColumnOrder(newColumnOrder);

      // Make sure actions column is still last if it exists
      if (newColumnOrder.includes('actions') && newColumnOrder[newColumnOrder.length - 1] !== 'actions') {
        const finalOrder = [...newColumnOrder.filter(id => id !== 'actions'), 'actions'];
        table.setColumnOrder(finalOrder);
        console.log("Final column order with actions last:", finalOrder);
      }

      // Save to localStorage
      if (enablePersistence) {
        const orderToSave = newColumnOrder.includes('actions')
          ? [...newColumnOrder.filter(id => id !== 'actions'), 'actions']
          : newColumnOrder;

        localStorage.setItem(getStorageKey(STORAGE_KEYS.COLUMN_ORDER), JSON.stringify(orderToSave));
        console.log("Saved to localStorage:", orderToSave);
      }

      // Call onColumnOrderChange if provided
      if (onColumnOrderChange) {
        onColumnOrderChange(
          newColumnOrder.includes('actions')
            ? [...newColumnOrder.filter(id => id !== 'actions'), 'actions']
            : newColumnOrder
        );
      }

      toast.success("Column order updated");
    }

    setDraggedColumnId(null);
    setDragOverColumnId(null);
  };

  const handleColumnResizeStart = (e: React.MouseEvent, columnId: string) => {
    if (!enableColumnResizing || isLockedColumn(columnId) || allColumnsLocked) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizingColumnId.current = columnId;
    resizeStartX.current = e.clientX;

    const columnElement = document.querySelector(`[data-column-id="${columnId}"]`);
    if (columnElement) {
      initialWidth.current = columnElement.getBoundingClientRect().width;
    } else {
      initialWidth.current = 150;
    }

    document.addEventListener('mousemove', handleColumnResizeMove);
    document.addEventListener('mouseup', handleColumnResizeEnd);
    
    // Handle touch events for mobile
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleColumnResizeEnd);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isResizing || !resizingColumnId.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    
    const deltaX = touch.clientX - resizeStartX.current;
    const newWidth = Math.max(50, initialWidth.current + deltaX);

    setColumnWidths(prev => ({
      ...prev,
      [resizingColumnId.current!]: newWidth
    }));

    document.body.style.cursor = 'col-resize';
  }, [isResizing]);

  const handleColumnResizeMove = useCallback((e: globalThis.MouseEvent) => {
    if (!isResizing || !resizingColumnId.current) return;
    
    const deltaX = e.clientX - resizeStartX.current;
    const newWidth = Math.max(50, initialWidth.current + deltaX);
    
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumnId.current as string]: newWidth
    }));
  }, [isResizing]);

  const handleColumnResizeEnd = useCallback(() => {
    setIsResizing(false);
    resizingColumnId.current = null;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', handleColumnResizeMove);
    document.removeEventListener('mouseup', handleColumnResizeEnd);
    document.removeEventListener('touchmove', handleTouchMove as EventListener);
    document.removeEventListener('touchend', handleColumnResizeEnd);
    toast.success("Column size updated");
  }, [handleColumnResizeMove, handleTouchMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleColumnResizeMove);
      document.removeEventListener('mouseup', handleColumnResizeEnd);
      document.removeEventListener('touchmove', handleTouchMove as EventListener);
      document.removeEventListener('touchend', handleColumnResizeEnd);
      document.body.style.cursor = '';
    };
  }, [handleColumnResizeMove, handleColumnResizeEnd, handleTouchMove]);

  const isLockedColumn = (columnId: string) => {
    return allLockedColumns.includes(columnId);
  };

  const toggleLockAllColumns = () => {
    setAllColumnsLocked(prev => !prev);
    toast.success(`All columns ${!allColumnsLocked ? "locked" : "unlocked"}`);
  };

  const resetColumnOrder = () => {
    table.setColumnOrder(initialColumnOrder);
    toast.success("Column order reset to default");
  };

  const resetColumnWidths = () => {
    setColumnWidths({});
    localStorage.removeItem(getStorageKey(STORAGE_KEYS.COLUMN_WIDTHS));
    toast.success("Column widths reset to default");
  };

  const resetLockedColumns = () => {
    setUserLockedColumns([]);
    setAllColumnsLocked(false);
    localStorage.removeItem(getStorageKey(STORAGE_KEYS.LOCKED_COLUMNS));
    localStorage.removeItem(getStorageKey(STORAGE_KEYS.ALL_COLUMNS_LOCKED));
    toast.success("All columns unlocked");
  };

  const resetColumnVisibility = () => {
    table.resetColumnVisibility();
    toast.success("Column visibility reset to default");
  };

  // Add CSS classes for column dragging
  useEffect(() => {
    // Add a style tag for the drag-related styles
    const styleTag = document.createElement("style");
    styleTag.textContent = `
      .column-draggable {
        cursor: grab !important;
      }
      .column-draggable:active {
        cursor: grabbing !important;
      }
      .column-drag-over {
        position: relative;
      }
      .column-drag-over::after {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        width: 4px;
        background-color: #6366f1;
        opacity: 0.5;
      }
    `;
    document.head.appendChild(styleTag);

    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between space-y-4 md:space-y-0">
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Lock All Columns:
            </span>
            <Toggle 
              pressed={allColumnsLocked} 
              onPressedChange={toggleLockAllColumns}
              size="sm"
              aria-label="Toggle lock all columns"
            >
              {allColumnsLocked ? <Lock className="h-4 w-4" /> : <UnlockIcon className="h-4 w-4" />}
            </Toggle>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto flex items-center gap-1">
                <EyeIcon className="h-4 w-4" />
                <span>Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter(column => column.id !== 'select' && column.id !== 'actions')
                .map(column => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={value => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
              <DropdownMenuSeparator />
              <div className="p-1">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={resetColumnVisibility}
                >
                  Reset Visibility
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {enableColumnDragging && (
            <Button variant="outline" size="sm" onClick={resetColumnOrder}>
              Reset Column Order
            </Button>
          )}
          
          {enableColumnResizing && (
            <Button variant="outline" size="sm" onClick={resetColumnWidths}>
              Reset Column Widths
            </Button>
          )}
          
          {(userLockedColumns.length > 0 || allColumnsLocked) && (
            <Button variant="outline" size="sm" onClick={resetLockedColumns}>
              Reset Locked Columns
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <div style={{ overflow: 'auto', height: tableHeight }} className="rounded-md border">
          <Table>
            {caption && <TableCaption>{caption}</TableCaption>}
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="h-10">
                  {headerGroup.headers.map((header) => {
                    const columnId = header.column.id;
                    const columnWidth = columnWidths[columnId];
                    const isDraggable = enableColumnDragging && !isLockedColumn(columnId) && !allColumnsLocked;
                    const style: React.CSSProperties = columnWidth 
                      ? { 
                          width: `${columnWidth}px`,
                          maxWidth: `${columnWidth}px`,
                          minWidth: `${columnWidth}px`
                        }
                      : {};

                    return (
                      <TableHead
                        key={header.id}
                        data-column-id={columnId}
                        style={style}
                        className={cn(
                          "relative h-10 py-2 px-2",
                          isLockedColumn(columnId) && "bg-muted/50",
                          draggedColumnId === columnId && "opacity-50",
                          dragOverColumnId === columnId && "bg-muted",
                          isDraggable && "cursor-grab active:cursor-grabbing"
                        )}
                        draggable={isDraggable}
                        onDragStart={(e) => handleColumnDragStart(e, columnId)}
                        onDragOver={(e) => handleColumnDragOver(e, columnId)}
                        onDragEnd={handleColumnDragEnd}
                      >
                        <div className="flex items-center">
                          {!header.isPlaceholder && (
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {isLockedColumn(columnId) && 
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="ml-1 text-muted-foreground">
                                        <Lock className="h-3 w-3" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>This column is locked</p>
                                    </TooltipContent>
                                  </Tooltip>
                                }
                              </div>

                              {header.column.getCanSort() && (
                                <div onClick={e => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="-mr-3 h-8 data-[state=open]:bg-accent"
                                    onClick={() => header.column.toggleSorting()}
                                  >
                                    <ArrowUpDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {enableColumnResizing && !isLockedColumn(columnId) && !allColumnsLocked && (
                          <div
                            className={cn(
                              "absolute right-0 top-0 h-full w-2 cursor-col-resize select-none bg-transparent hover:bg-primary/10 active:bg-primary/20",
                              isResizing && resizingColumnId.current === columnId && "bg-primary/20"
                            )}
                            onMouseDown={e => handleColumnResizeStart(e, columnId)}
                            onTouchStart={e => {
                              e.preventDefault();
                              const touch = e.touches[0];
                              if (touch) {
                                const mouseEvent = new MouseEvent('mousedown', {
                                  clientX: touch.clientX,
                                  clientY: touch.clientY,
                                  bubbles: true,
                                  cancelable: true
                                });
                                handleColumnResizeStart(mouseEvent as unknown as React.MouseEvent<HTMLElement>, columnId);
                              }
                            }}
                          />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "h-6 cursor-pointer hover:bg-muted/50",
                    draggedRowIndex === row.index && "opacity-50",
                    dragOverRowIndex === row.index && "bg-muted"
                  )}
                  draggable={enableRowDragging && !allColumnsLocked}
                  onDragStart={() => handleRowDragStart(row.index)}
                  onDragOver={(e) => handleRowDragOver(e, row.index)}
                  onDragEnd={handleRowDragEnd}
                  onDoubleClick={() => onRowDoubleClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "h-6 py-1 px-2",
                        isLockedColumn(cell.column.id) && "bg-muted/50"
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default DraggableTable;
