import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCode, X } from "lucide-react";

export const ComparePackageJson = ({ package1 }) => {
  const [packageIn, setPackageIn] = useState<File | null>(null);
  const [packageFile, setPackageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if(package1) {
      setPackageIn(package1);
    }
  }, [package1]);

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

  const handleCompare = async () => {
    if (!packageIn || !packageFile) {
      setError('Please upload a package.json file.');
      return;
    }
    setError(null);
    setLoading(true);
    setCompareResult(null);

    try {
      const formData = new FormData();
      // package1 is the original (from analysisResult), packageFile is the new uploaded one
    
      formData.append("package1", package1, packageIn.name);
      formData.append("package2", packageFile, packageFile.name);
      const res = await fetch("/api/compare-packages", {
        method: "POST",
        body: formData,
      });


      if (!res.ok) {
        throw new Error("Failed to compare packages");
      }

      const data = await res.json();

      setCompareResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to compare packages");
    } finally {
      setLoading(false);
    }
  };

  const ComparisonTable = () => {
    return (
        <div className="mt-8 text-left">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-slate-200 rounded bg-white">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-3 py-2 border-b text-left">Dependency</th>
                  <th className="px-3 py-2 border-b text-left">Added Vulns</th>
                  <th className="px-3 py-2 border-b text-left">Removed Vulns</th>
                </tr>
              </thead>
              <tbody>
                {/* Shared Different Version */}
                {compareResult.sharedDifferentVersion &&
                  Object.entries(compareResult.sharedDifferentVersion).map(
                    ([dep, { added, removed }]: any, idx: number) => (
                      <tr key={dep} className={idx % 2 === 0 ? "bg-slate-50" : ""}>
                        <td className="px-3 py-2 border-b font-medium">{dep}</td>
                        <td className="px-3 py-2 border-b">
                          {added && added.length > 0 ? (
                            <ul className="list-disc ml-4">
                              {added.map((v: any) => (
                                <li key={v.id}>
                                  <span className="font-mono">{v.id}</span>
                                  {v.cve && (
                                    <span className="ml-2 text-blue-700 font-mono">{v.cve}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-b">
                          {removed && removed.length > 0 ? (
                            <ul className="list-disc ml-4">
                              {removed.map((v: any) => (
                                <li key={v.id}>
                                  <span className="font-mono">{v.id}</span>
                                  {v.cve && (
                                    <span className="ml-2 text-blue-700 font-mono">{v.cve}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                      </tr>
                    )
                  )}

                {/* Shared Same Version: show as both added and removed columns */}
                {compareResult.sharedSameVersion &&
                  Object.entries(compareResult.sharedSameVersion).map(
                    ([dep, vulns]: any, idx: number) => (
                      <tr key={dep + "-same"} className={idx % 2 === 0 ? "bg-slate-50" : ""}>
                        <td className="px-3 py-2 border-b font-medium">{dep} <span className="text-xs text-yellow-700">(same version)</span></td>
                        <td className="px-3 py-2 border-b">
                          {vulns && vulns.length > 0 ? (
                            <ul className="list-disc ml-4">
                              {vulns.map((v: any) => (
                                <li key={v.id}>
                                  <span className="font-mono">{v.id}</span>
                                  {v.cve && (
                                    <span className="ml-2 text-blue-700 font-mono">{v.cve}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-b">
                          <span className="text-slate-400">None</span>
                        </td>
                      </tr>
                    )
                  )}

                {/* Only in Package 2: show as added */}
                {compareResult.onlyInPackage2 &&
                  Object.entries(compareResult.onlyInPackage2).map(
                    ([dep, vulns]: any, idx: number) => (
                      <tr key={dep + "-added"} className={idx % 2 === 0 ? "bg-slate-50" : ""}>
                        <td className="px-3 py-2 border-b font-medium">{dep} <span className="text-xs text-green-700">(new dep)</span></td>
                        <td className="px-3 py-2 border-b">
                          {vulns && vulns.length > 0 ? (
                            <ul className="list-disc ml-4">
                              {vulns.map((v: any) => (
                                <li key={v.id}>
                                  <span className="font-mono">{v.id}</span>
                                  {v.cve && (
                                    <span className="ml-2 text-blue-700 font-mono">{v.cve}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400">No vulnerabilities</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-b">
                          <span className="text-slate-400">None</span>
                        </td>
                      </tr>
                    )
                  )}

                {/* Only in Package 1: show as removed */}
                {compareResult.onlyInPackage1 &&
                  Object.entries(compareResult.onlyInPackage1).map(
                    ([dep, vulns]: any, idx: number) => (
                      <tr key={dep + "-removed"} className={idx % 2 === 0 ? "bg-slate-50" : ""}>
                        <td className="px-3 py-2 border-b font-medium">{dep} <span className="text-xs text-red-700">(removed dep)</span></td>
                        <td className="px-3 py-2 border-b">
                          <span className="text-slate-400">None</span>
                        </td>
                        <td className="px-3 py-2 border-b">
                          {vulns && vulns.length > 0 ? (
                            <ul className="list-disc ml-4">
                              {vulns.map((v: any) => (
                                <li key={v.id}>
                                  <span className="font-mono">{v.id}</span>
                                  {v.cve && (
                                    <span className="ml-2 text-blue-700 font-mono">{v.cve}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400">No vulnerabilities</span>
                          )}
                        </td>
                      </tr>
                    )
                  )}
              </tbody>
            </table>
          </div>
        </div>
      )
  }

  const InputFileCardComponent = () => (
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
        disabled={!packageFile || loading}
        type="button"
      >
        {loading ? "Comparing..." : "Compare"}
      </Button>
    </CardContent>
  );

  return (
    <div className="mt-12">
      <Card className="shadow-sm">
        <InputFileCardComponent />
        {compareResult && <ComparisonTable />}
      </Card>
    </div>
  );
};

