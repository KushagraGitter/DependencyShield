import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCode, FolderOpen, Upload, X, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFilesChange: (files: { packageJson?: File; sourceFiles: File[]; zipFile?: File }) => void;
}

export function FileUpload({ onFilesChange }: FileUploadProps) {
  const [packageJsonFile, setPackageJsonFile] = useState<File | null>(null);
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const packageJsonInputRef = useRef<HTMLInputElement>(null);
  const sourceFilesInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const handlePackageJsonUpload = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name === 'package.json' || file.name.endsWith('.json')) {
        setPackageJsonFile(file);
        onFilesChange({ packageJson: file, sourceFiles, zipFile });
      } else {
        alert('Please select a valid package.json file');
      }
    }
  }, [sourceFiles, zipFile, onFilesChange]);

  const handleSourceFilesUpload = useCallback((files: FileList | null) => {
    if (files) {
      const validFiles = Array.from(files).filter(file => {
        const extension = file.name.toLowerCase();
        return extension.endsWith('.js') || 
               extension.endsWith('.ts') || 
               extension.endsWith('.jsx') || 
               extension.endsWith('.tsx') ||
               extension.endsWith('.mjs');
      });
      
      if (validFiles.length > 0) {
        setSourceFiles(prev => {
          const newFiles = [...prev, ...validFiles];
          onFilesChange({ packageJson: packageJsonFile, sourceFiles: newFiles, zipFile });
          return newFiles;
        });
      } else {
        alert('Please select valid source files (.js, .ts, .jsx, .tsx, .mjs)');
      }
    }
  }, [packageJsonFile, zipFile, onFilesChange]);

  const handleZipUpload = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        setZipFile(file);
        // Clear individual files when zip is uploaded
        setPackageJsonFile(null);
        setSourceFiles([]);
        onFilesChange({ zipFile: file, sourceFiles: [] });
      } else {
        alert('Please select a valid ZIP file');
      }
    }
  }, [onFilesChange]);

  const removeSourceFile = useCallback((index: number) => {
    setSourceFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      onFilesChange({ packageJson: packageJsonFile, sourceFiles: newFiles, zipFile });
      return newFiles;
    });
  }, [packageJsonFile, zipFile, onFilesChange]);

  const removeZipFile = useCallback(() => {
    setZipFile(null);
    onFilesChange({ packageJson: packageJsonFile, sourceFiles, zipFile: undefined });
  }, [packageJsonFile, sourceFiles, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent, type: 'package' | 'source' | 'zip') => {
    e.preventDefault();
    setDragOver(null);
    
    const files = e.dataTransfer.files;
    if (type === 'package') {
      handlePackageJsonUpload(files);
    } else if (type === 'source') {
      handleSourceFilesUpload(files);
    } else if (type === 'zip') {
      handleZipUpload(files);
    }
  }, [handlePackageJsonUpload, handleSourceFilesUpload, handleZipUpload]);

  const handleDragOver = useCallback((e: React.DragEvent, type: 'package' | 'source' | 'zip') => {
    e.preventDefault();
    setDragOver(type);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* ZIP Upload Option */}
      <Card 
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          dragOver === 'zip' ? "border-purple-400 bg-purple-50" : "border-slate-300 hover:border-purple-400"
        )}
        onDrop={(e) => handleDrop(e, 'zip')}
        onDragOver={(e) => handleDragOver(e, 'zip')}
        onDragLeave={handleDragLeave}
        onClick={() => zipInputRef.current?.click()}
      >
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Archive className="text-purple-600 w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Project ZIP File</h3>
          {zipFile ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <p className="text-sm text-green-600 font-medium">{zipFile.name}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeZipFile();
                  }}
                  className="h-6 w-6 p-0 text-slate-500 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-slate-500">{(zipFile.size / 1024 / 1024).toFixed(1)} MB</p>
              <p className="text-xs text-green-600">ZIP file will be extracted and analyzed automatically</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-4">Upload entire project as ZIP (includes package.json and source files)</p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                Choose ZIP File
              </Button>
              <p className="text-xs text-slate-500 mt-2">or drag and drop here</p>
            </>
          )}
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            onChange={(e) => handleZipUpload(e.target.files)}
            className="hidden"
          />
        </CardContent>
      </Card>

      {!zipFile && (
        <>
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              OR upload files individually
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
      {/* Package.json Upload */}
      <Card 
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          dragOver === 'package' ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-blue-400"
        )}
        onDrop={(e) => handleDrop(e, 'package')}
        onDragOver={(e) => handleDragOver(e, 'package')}
        onDragLeave={handleDragLeave}
        onClick={() => packageJsonInputRef.current?.click()}
      >
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileCode className="text-blue-600 w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">package.json</h3>
          {packageJsonFile ? (
            <div className="space-y-2">
              <p className="text-sm text-green-600 font-medium">{packageJsonFile.name}</p>
              <p className="text-xs text-slate-500">{(packageJsonFile.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-4">Upload your package.json file to analyze dependencies</p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Choose File
              </Button>
              <p className="text-xs text-slate-500 mt-2">or drag and drop here</p>
            </>
          )}
          <input
            ref={packageJsonInputRef}
            type="file"
            accept=".json"
            onChange={(e) => handlePackageJsonUpload(e.target.files)}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Source Files Upload */}
      <Card 
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          dragOver === 'source' ? "border-green-400 bg-green-50" : "border-slate-300 hover:border-green-400"
        )}
        onDrop={(e) => handleDrop(e, 'source')}
        onDragOver={(e) => handleDragOver(e, 'source')}
        onDragLeave={handleDragLeave}
        onClick={() => sourceFilesInputRef.current?.click()}
      >
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="text-green-600 w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Source Files</h3>
          {sourceFiles.length > 0 ? (
            <div className="space-y-2 max-h-24 overflow-y-auto">
              {sourceFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between text-sm bg-slate-50 rounded px-2 py-1">
                  <span className="text-slate-700 truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSourceFile(index);
                    }}
                    className="h-6 w-6 p-0 text-slate-500 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-slate-500 mt-2">Click to add more files</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-4">Upload source files for usage analysis (optional)</p>
              <Button className="bg-green-600 hover:bg-green-700">
                Choose Files
              </Button>
              <p className="text-xs text-slate-500 mt-2">Supports .js, .ts, .jsx, .tsx</p>
            </>
          )}
          <input
            ref={sourceFilesInputRef}
            type="file"
            multiple
            accept=".js,.ts,.jsx,.tsx,.mjs"
            onChange={(e) => handleSourceFilesUpload(e.target.files)}
            className="hidden"
          />
        </CardContent>
      </Card>
          </div>
        </>
      )}
    </div>
  );
}
