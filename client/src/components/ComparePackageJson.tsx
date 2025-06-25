import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCode, X } from "lucide-react";

export const ComparePackageJson = ({package1}) => {
  const [packageFile, setPackageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const InputFileCardComponent = () => {
  return (
    <CardContent className="p-8 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FileCode className="text-blue-600 w-6 h-6" />
      </div>
      <h3 className="font-semibold text-slate-900 mb-2">Compare <code>package.json</code></h3>
      {packageFile ? (
        <div className="space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <p className="text-sm text-green-600 font-medium">{packageFile.name}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="h-6 w-6 p-0 text-slate-500 hover:text-red-600"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <p className="text-xs text-slate-500">{(packageFile.size / 1024).toFixed(1)} KB</p>
          <p className="text-xs text-green-600">File will be used for vulnerability comparison</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600 mb-4">Upload a <code>package.json</code> file to compare vulnerabilities with another version.</p>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => inputRef.current?.click()}>
            Choose package.json
          </Button>
          <p className="text-xs text-slate-500 mt-2">or drag and drop here</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      {error && (
        <div className="text-red-600 text-sm mt-2">{error}</div>
      )}
      <Button
        className="mt-4 bg-blue-600 hover:bg-blue-700"
        onClick={handleCompare}
        disabled={!packageFile}
        type="button"
      >
        Compare
      </Button>
    </CardContent>
  );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.json')) {
      setPackageFile(file);
      setError(null);
    } else {
      setPackageFile(null);
      setError('Please upload a valid package.json file.');
    }
  };

  const handleRemove = () => {
    setPackageFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleCompare = () => {
    if (!packageFile) {
      setError('Please upload a package.json file.');
      return;
    }
    setError(null);
    // Implement compare logic or API call here
  };

  return (
    <div className="mt-12">
      <Card className="shadow-sm">
        <InputFileCardComponent />
      </Card>
    </div>
  );
};

