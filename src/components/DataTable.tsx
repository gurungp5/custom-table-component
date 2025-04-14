import React, { useState, useEffect, useRef } from "react";
import { DraggableTable } from "./DraggableTable";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Ellipsis, Plus, Trash, Search, Lock, Unlock } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Define the data type
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "pending";
  lastActive: string;
  verified: boolean;
};

export function DataTable() {
  // State for selected rows
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  
  // State for users data
  const [users, setUsers] = useState<User[]>([]);
  
  // State for filtered users data
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  
  // State for search term
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for form data in add/edit dialog
  const [formData, setFormData] = useState<Partial<User>>({
    name: "",
    email: "",
    role: "user",
    status: "active",
    verified: false,
  });
  
  // State for bulk count
  const [bulkCount, setBulkCount] = useState(1);
  
  // Dialog open state
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Edit mode (true for edit, false for add)
  const [editMode, setEditMode] = useState(false);
  
  // Popover state for column lock controls
  const [lockPopoverOpen, setLockPopoverOpen] = useState(false);
  
  // State for columns that can be locked/unlocked
  const [lockableColumns, setLockableColumns] = useState<string[]>([]);
  
  // State for user locked columns
  const [userLockedColumns, setUserLockedColumns] = useState<string[]>([]);

  // Load initial data
  useEffect(() => {
    // Mock data
    const initialUsers: User[] = [
      {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        role: "Admin",
        status: "active",
        lastActive: "2023-06-10T10:00:00",
        verified: true,
      },
      {
        id: "2",
        name: "Jane Smith",
        email: "jane@example.com",
        role: "User",
        status: "active",
        lastActive: "2023-06-09T14:30:00",
        verified: false,
      },
      {
        id: "3",
        name: "Mike Johnson",
        email: "mike@example.com",
        role: "User",
        status: "inactive",
        lastActive: "2023-05-28T09:15:00",
        verified: true,
      },
      {
        id: "4",
        name: "Sarah Williams",
        email: "sarah@example.com",
        role: "Editor",
        status: "pending",
        lastActive: "2023-06-11T11:45:00",
        verified: false,
      },
      {
        id: "5",
        name: "Alex Brown",
        email: "alex@example.com",
        role: "User",
        status: "active",
        lastActive: "2023-06-10T16:20:00",
        verified: true,
      },
    ];
    
    setUsers(initialUsers);
    setFilteredUsers(initialUsers);
  }, []);

  // Filter users when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const lowercaseSearch = searchTerm.toLowerCase();
    const filtered = users.filter(
      user => 
        user.name.toLowerCase().includes(lowercaseSearch) ||
        user.email.toLowerCase().includes(lowercaseSearch) ||
        user.role.toLowerCase().includes(lowercaseSearch) ||
        user.status.toLowerCase().includes(lowercaseSearch)
    );
    
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  // Initialize lockable columns based on table columns
  useEffect(() => {
    const columnIds = columns
      .map(col => typeof col.id === 'string' ? col.id : '')
      .filter(id => id && !['select', 'actions'].includes(id));
      
    setLockableColumns(columnIds);
  }, []);

  // Reset form data
  const resetFormData = () => {
    setFormData({
      name: "",
      email: "",
      role: "user",
      status: "active",
      verified: false,
    });
    setBulkCount(1);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle bulk count changes
  const handleBulkCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value);
    if (!isNaN(count) && count > 0 && count <= 100) {
      setBulkCount(count);
    }
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submit (add or edit user)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editMode && formData.id) {
      // Update existing user
      setUsers((prev) =>
        prev.map((user) => (user.id === formData.id ? { ...user, ...formData } as User : user))
      );
      toast.success("User updated successfully");
    } else {
      // Create new users (bulk option)
      const newUsers = Array.from({ length: bulkCount }, (_, i) => ({
        id: crypto.randomUUID(),
        name: formData.name || "",
        email: i > 0 ? `${formData.name?.toLowerCase().replace(/\s+/g, '.')}.${i}@example.com` : formData.email || "",
        role: formData.role || "User",
        status: (formData.status as "active" | "inactive" | "pending") || "active",
        lastActive: new Date().toISOString(),
        verified: formData.verified || false,
      }));
      
      setUsers((prev) => [...prev, ...newUsers]);
      toast.success(`${bulkCount} user${bulkCount > 1 ? 's' : ''} added successfully`);
    }
    
    // Close dialog and reset form
    setDialogOpen(false);
    resetFormData();
  };

  // Handle edit user
  const handleEditUser = (user: User) => {
    setFormData(user);
    setEditMode(true);
    setDialogOpen(true);
  };

  // Handle add new user
  const handleAddUser = () => {
    resetFormData();
    setEditMode(false);
    setDialogOpen(true);
  };

  // Handle delete user
  const handleDeleteUser = (id: string) => {
    setUsers((prev) => prev.filter((user) => user.id !== id));
    toast.success("User deleted successfully");
  };

  // Handle delete selected users
  const handleDeleteSelected = () => {
    // Filter out selected users
    setUsers((prev) => prev.filter((user) => !selectedRowIds[user.id]));
    
    // Clear selection
    setSelectedRowIds({});
    
    toast.success("Selected users deleted successfully");
  };

  // Handle row order change
  const handleRowOrderChange = (newData: User[]) => {
    setUsers(newData);
  };

  // Handle column order change
  const handleColumnOrderChange = (newOrder: string[]) => {
    console.log("Column order changed:", newOrder);
  };

  // Handle row double click (for inline editing)
  const handleRowDoubleClick = (row: User) => {
    handleEditUser(row);
  };

  // Toggle column lock status
  const toggleColumnLock = (columnId: string) => {
    setUserLockedColumns(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  // Column definitions
  const columns: ColumnDef<User>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getRowModel().rows.length > 0 &&
            table.getRowModel().rows.every((row) => selectedRowIds[row.original.id])
          }
          onCheckedChange={(checked) => {
            const newSelectedRows = { ...selectedRowIds };
            
            table.getRowModel().rows.forEach((row) => {
              newSelectedRows[row.original.id] = !!checked;
            });
            
            setSelectedRowIds(newSelectedRows);
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={!!selectedRowIds[row.original.id]}
          onCheckedChange={(checked) => {
            setSelectedRowIds((prev) => ({
              ...prev,
              [row.original.id]: !!checked,
            }));
          }}
          aria-label="Select row"
        />
      ),
      size: 40,
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Role",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            className={cn(
              status === "active" && "bg-green-500",
              status === "inactive" && "bg-gray-500",
              status === "pending" && "bg-yellow-500",
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "lastActive",
      header: "Last Active",
      cell: ({ row }) => {
        const date = new Date(row.getValue("lastActive"));
        return <div>{date.toLocaleDateString()}</div>;
      },
    },
    {
      accessorKey: "verified",
      header: "Verified",
      cell: ({ row, table }) => {
        const [isChecked, setIsChecked] = useState(row.original.verified);
        
        const handleChange = (checked: boolean) => {
          setIsChecked(checked);
          const updatedUsers = users.map(user => 
            user.id === row.original.id ? { ...user, verified: checked } : user
          );
          setUsers(updatedUsers);
        };

        return (
          <Checkbox
            checked={isChecked}
            onCheckedChange={handleChange}
            aria-label="Verified status"
          />
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Ellipsis className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => handleEditUser(row.original)}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => handleDeleteUser(row.original.id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Count selected rows
  const selectedCount = Object.values(selectedRowIds).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <h2 className="text-2xl font-bold">Users</h2>
        
        {/* Table controls */}
        <div className="flex flex-wrap gap-2">
          {/* Search bar */}
          <div className="relative grow">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full md:w-64"
            />
          </div>
          
          {/* Delete selected button */}
          {selectedCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Trash className="h-4 w-4" />
                  Delete Selected ({selectedCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete{" "}
                    {selectedCount} selected{" "}
                    {selectedCount === 1 ? "user" : "users"}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSelected}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {/* Add user button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddUser} className="gap-2">
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editMode ? "Edit User" : "Add New User"}</DialogTitle>
                <DialogDescription>
                  {editMode 
                    ? "Make changes to the user details." 
                    : "Fill in the information for the new user."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleInputChange}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={handleInputChange}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Role
                    </Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => handleSelectChange("role", value)}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">
                      Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleSelectChange("status", value)}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Bulk creation option - only show when adding new users */}
                  {!editMode && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="bulkCount" className="text-right">
                        Create Count
                      </Label>
                      <Input
                        id="bulkCount"
                        name="bulkCount"
                        type="number"
                        min="1"
                        max="100"
                        value={bulkCount}
                        onChange={handleBulkCountChange}
                        className="col-span-3"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit">{editMode ? "Update" : "Add"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DraggableTable
        data={filteredUsers}
        columns={columns}
        onRowOrderChange={handleRowOrderChange}
        onColumnOrderChange={handleColumnOrderChange}
        enableRowDragging={true}
        enableColumnDragging={true}
        enableColumnResizing={true}
        enablePersistence={true}
        storageId="user-table"
        lockedColumns={['select']}
        onRowDoubleClick={handleRowDoubleClick}
        tableHeight="500px"
      />
    </div>
  );
}

export default DataTable;
