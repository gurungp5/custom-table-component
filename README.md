## Project info

Follow these steps:

```sh
npm install
npm run dev
```

# 🛠 Reusable Table Component

## 📌 Objective

Develop a **reusable and feature-rich table component** designed for high interactivity, smooth user experience, and persistent state handling. Ideal for use in dashboards, admin panels, and complex data-driven interfaces.

---

## ✅ Key Features

### 🔁 Draggable Rows
- Allows reordering of rows via drag-and-drop.
- Triggers a callback or event when a row is dropped into a new position.

### ↔️ Draggable Columns
- Columns can be rearranged through drag-and-drop interactions.

### 💾 Persistent Column Order
- Column arrangement is saved to `localStorage`.
- Automatically restored after page reload.

### ✍️ Editable Rows (Double-Click to Edit)
Supports inline editing of multiple field types:
- **Text**
- **Select**
- **Autocomplete**
- **Multi-select** (Material UI component)

Editing is initiated via double-clicking a row.

### ☑️ Always-Visible Checkboxes
- Checkbox fields are always displayed.
- Can be toggled directly without entering edit mode.

### 🗑️ Row Deletion
- Rows can be removed from the table using a delete action.

### ➕ Add New Row
- Enables users to dynamically insert new rows into the table.

### 🔒 Lockable Columns
- Columns can be locked to prevent reordering via drag-and-drop.

### 📏 Resizable Columns with Lock & Persistence
- Columns can be resized.
- Locked columns are not resizable.
- Column widths are saved in `localStorage` and restored on reload.

### 📤 Field Update Events
- Emits an event when any editable field is modified (text, checkbox, select, etc.).

### 🔍 Column Filtering
- Filters can be applied to individual columns to refine visible data.

### 🔄 Reset Sorting
- Provides a control to reset table sorting to its default state.

### 🧩 Reset Column Order
- Allows users to restore the default column layout.

### 👁 Column Show/Hide Toggle
- Users can select which columns should be visible or hidden in the table.

---