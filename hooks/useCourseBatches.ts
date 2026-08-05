import { useState, useEffect } from "react";
import { courseBatchesApi } from "@/lib/api";
import { toast } from "sonner";

export type CourseBatch = {
  id: number;
  batch_name: string;
  category: "JUNIOR" | "SENIOR";
};

export function useCourseBatches() {
  const [batches, setBatches] = useState<CourseBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res: any = await courseBatchesApi.getAll();
      if (res.success) {
        setBatches(res.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch batches:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const juniorBatches = batches.filter(b => b.category === "JUNIOR").map(b => b.batch_name);
  const seniorBatches = batches.filter(b => b.category === "SENIOR").map(b => b.batch_name);
  const allBatches = batches.map(b => b.batch_name);

  return {
    batches,
    juniorBatches,
    seniorBatches,
    allBatches,
    loading,
    refreshBatches: fetchBatches
  };
}
