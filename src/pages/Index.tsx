
import { DataTable } from "@/components/DataTable";

const Index = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Draggable Data Table</h1>
        <p className="text-muted-foreground">
          A feature-rich, interactive data table with draggable rows, draggable columns, 
          resizable columns, and persistent layout settings.
        </p>
      </div>
      
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <DataTable />
      </div>
      
      <div className="mt-6 text-sm text-muted-foreground">
        <h2 className="font-semibold mb-2">Features:</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Drag rows to reorder them</li>
          <li>Drag column headers to rearrange columns</li>
          <li>Resize columns by dragging the column edges</li>
          <li>Column order and sizes are saved to localStorage</li>
          <li>Full CRUD operations (Create, Read, Update, Delete)</li>
          <li>Multi-select and batch delete</li>
          <li>Locked columns (select and actions) cannot be moved or resized</li>
        </ul>
      </div>
    </div>
  );
};

export default Index;
