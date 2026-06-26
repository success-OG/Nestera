import { useState } from "react";

export type DateRange = {
    from: Date;
    to: Date;
};

interface UseExportOptions {
    onSuccess?: (format: string, filename: string) => void;
    onError?: (error: Error) => void;
}

export function useExport(options?: UseExportOptions) {
    const [loading, setLoading] = useState(false);

    const exportData = async (data: any[], format: "csv" | "json", filename: string) => {
        try {
            setLoading(true);

            let content: string;
            let mimeType: string;

            if (format === "csv") {
                // Simple CSV export
                const headers = Object.keys(data[0] || {});
                const csv = [
                    headers.join(","),
                    ...data.map(row => headers.map(h => JSON.stringify(row[h] || "")).join(","))
                ].join("\n");

                content = csv;
                mimeType = "text/csv;charset=utf-8;";
            } else {
                // JSON export
                content = JSON.stringify(data, null, 2);
                mimeType = "application/json";
            }

            // Download file
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `${filename}.${format}`);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            options?.onSuccess?.(format, filename);
        } catch (error) {
            options?.onError?.(error as Error);
        } finally {
            setLoading(false);
        }
    };

    return { exportData, loading };
}
