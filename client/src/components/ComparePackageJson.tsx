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
  const [detailedAnalysis, setDetailedAnalysis] = useState<any>(null);
  const [detailedLoading, setDetailedLoading] = useState(false);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Modal for detailed comparison
  const [showDetailedModal, setShowDetailedModal] = useState(false);

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
      // Package1 is the current package, package2 is the previous version package
      formData.append("package1", packageFile, packageFile.name);
      formData.append("package2", packageIn, packageIn.name);
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

  const handleDetailedComparison = async () => {
    setDetailedLoading(true);
    setDetailedError(null);
    setDetailedAnalysis(null);
    try {
      const formData = new FormData();
      formData.append("package1", packageFile, packageFile.name);
      formData.append("package2", package1, package1.name);
      const res = await fetch("/api/compare-changelogs", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to get detailed comparison analysis");
      const data = await res.json();
      setDetailedAnalysis(data);
      setShowDetailedModal(true);
    } catch (err: any) {
      setDetailedError(err.message || "Failed to get detailed comparison analysis");
    } finally {
      setDetailedLoading(false);
    }
  };

  const ComparisonTable = () => {
    return (
      <div className="mt-8 text-left">
        {/* Button for detailed comparison placed above the table */}
        <div className="mb-4 text-center">
          <Button
            className="bg-purple-700 hover:bg-purple-800"
            onClick={handleDetailedComparison}
            disabled={detailedLoading}
            type="button"
          >
            {detailedLoading ? "Loading detailed analysis..." : "Click to get detailed comparison analysis"}
          </Button>
          {detailedError && (
            <div className="text-red-600 text-sm mt-2">{detailedError}</div>
          )}
        </div>
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
      <div className="mb-3 text-xs text-slate-600">
        <span>
          <strong>Note:</strong> This tool compares your current <code>package.json</code> with a previous version.
          Please upload the <span className="font-semibold">previous version</span> of your <code>package.json</code> below.
        </span>
      </div>
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

  const DetailedComparison = () => {
    if (!detailedAnalysis) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
          <button
            className="absolute top-3 right-3 text-slate-500 hover:text-red-600"
            onClick={() => setShowDetailedModal(false)}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <h4 className="font-semibold text-slate-900 mb-4 text-lg">Detailed Comparison Analysis</h4>
          <div className="space-y-8">
            {Object.entries(detailedAnalysis).map(([pkg, details]: any) => (
              <div key={pkg} className="border border-slate-200 rounded-lg p-5 bg-slate-50">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-bold text-blue-800">{details.packageName}</span>
                  <span className="text-xs text-slate-500">
                    {details.currentVersion} → {details.recommendedVersion}
                  </span>
                  <span className="ml-2 px-2 py-0.5 rounded bg-slate-200 text-xs text-slate-700">
                    Complexity: <span className="font-semibold">{details.migrationComplexity}</span>
                  </span>
                  <span className="ml-2 px-2 py-0.5 rounded bg-slate-200 text-xs text-slate-700">
                    Est. Time: <span className="font-semibold">{details.estimatedMigrationTime}</span>
                  </span>
                </div>
                <div className="mb-2 text-slate-800">{details.summary}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-semibold text-slate-700 mb-1">Security Fixes</h5>
                    {details.securityFixes && details.securityFixes.length > 0 ? (
                      <ul className="list-disc ml-5 text-green-800">
                        {details.securityFixes.map((fix: string, i: number) => (
                          <li key={i}>{fix}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-700 mb-1">Bug Fixes</h5>
                    {details.bugFixes && details.bugFixes.length > 0 ? (
                      <ul className="list-disc ml-5 text-blue-800">
                        {details.bugFixes.map((fix: string, i: number) => (
                          <li key={i}>{fix}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-700 mb-1">New Features</h5>
                    {details.newFeatures && details.newFeatures.length > 0 ? (
                      <ul className="list-disc ml-5 text-purple-800">
                        {details.newFeatures.map((f: string, i: number) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-700 mb-1">Deprecations</h5>
                    {details.deprecations && details.deprecations.length > 0 ? (
                      <ul className="list-disc ml-5 text-orange-800">
                        {details.deprecations.map((d: string, i: number) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <h5 className="font-semibold text-slate-700 mb-1">Breaking Changes</h5>
                    {details.breakingChanges && details.breakingChanges.length > 0 ? (
                      <ul className="list-disc ml-5 text-red-800">
                        {details.breakingChanges.map((bc: any, i: number) => (
                          <li key={i}>
                            <span className="font-semibold">{bc.type}:</span> {bc.description}
                            {bc.migrationRequired && (
                              <span className="ml-2 text-xs text-red-600">(Migration required)</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <h5 className="font-semibold text-slate-700 mb-1">Recommendations</h5>
                    {details.recommendations && details.recommendations.length > 0 ? (
                      <ul className="list-disc ml-5 text-slate-800">
                        {details.recommendations.map((rec: string, i: number) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-12">
      <Card className="shadow-sm">
        <InputFileCardComponent />
        {compareResult && <ComparisonTable />}
        {showDetailedModal && detailedAnalysis && <DetailedComparison />}
      </Card>
    </div>
  );
};

