import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyzeResume } from "@/lib/services/gemini";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ResumeAnalyzerProps {
  onAnalysisComplete: (data: {
    full_name: string;
    region_tags: string[];
    tech_tags: string[];
    languages: string[];
    experience: string;
  }) => void;
}

export function ResumeAnalyzer({ onAnalysisComplete }: ResumeAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      toast.error("Please select a PDF file");
      event.target.value = "";
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error("Please select a resume PDF file first");
      return;
    }

    try {
      setIsAnalyzing(true);
      const fileBuffer = await selectedFile.arrayBuffer();
      const result = await analyzeResume(fileBuffer);
      onAnalysisComplete(result);
      toast.success("Resume analyzed successfully");
    } catch (error) {
      console.error("Error analyzing resume:", error);
      toast.error("Failed to analyze resume");
    } finally {
      setIsAnalyzing(false);
      setSelectedFile(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 mb-8">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={isAnalyzing}
          className="flex-1"
        />
        <Button
          onClick={handleAnalyze}
          disabled={!selectedFile || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze Resume"
          )}
        </Button>
      </div>
      {selectedFile && (
        <p className="text-sm text-muted-foreground">
          Selected file: {selectedFile.name}
        </p>
      )}
    </div>
  );
} 