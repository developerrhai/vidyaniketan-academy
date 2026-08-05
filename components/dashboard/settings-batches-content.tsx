"use client";

import { useState } from "react";
import { useCourseBatches, CourseBatch } from "@/hooks/useCourseBatches";
import { courseBatchesApi } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";

export function SettingsBatchesContent() {
  const { batches, loading, refreshBatches } = useCourseBatches();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [batchName, setBatchName] = useState("");
  const [category, setCategory] = useState<"JUNIOR" | "SENIOR">("JUNIOR");

  const openAddModal = () => {
    setEditingId(null);
    setBatchName("");
    setCategory("JUNIOR");
    setIsModalOpen(true);
  };

  const openEditModal = (b: CourseBatch) => {
    setEditingId(b.id);
    setBatchName(b.batch_name);
    setCategory(b.category);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!batchName.trim()) {
      toast.error("Batch name is required");
      return;
    }

    try {
      if (editingId) {
        const res: any = await courseBatchesApi.update(editingId, { batch_name: batchName, category });
        if (res.success) toast.success("Batch updated successfully");
      } else {
        const res: any = await courseBatchesApi.create({ batch_name: batchName, category });
        if (res.success) toast.success("Batch created successfully");
      }
      setIsModalOpen(false);
      refreshBatches();
    } catch (err: any) {
      toast.error(err.message || "Failed to save batch");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this batch? It might be used by existing students.")) return;
    try {
      const res: any = await courseBatchesApi.remove(id);
      if (res.success) toast.success("Batch deleted");
      refreshBatches();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete batch");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading batches...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Course Batches</h2>
          <p className="text-sm text-slate-500 mt-1">Manage junior and senior batches available across the platform</p>
        </div>
        <Button onClick={openAddModal} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 mr-2" /> Add Batch
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium text-slate-700">{b.batch_name}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    b.category === "JUNIOR" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                  }`}>
                    {b.category}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEditModal(b)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDelete(b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {batches.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-slate-500">No batches found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Batch" : "Add New Batch"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Batch Name</label>
              <Input 
                placeholder="e.g. 10th Elite" 
                value={batchName} 
                onChange={(e) => setBatchName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={(val: "JUNIOR"|"SENIOR") => setCategory(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JUNIOR">JUNIOR (Up to 10th)</SelectItem>
                  <SelectItem value="SENIOR">SENIOR (11th & 12th)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSave}>
              Save Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
