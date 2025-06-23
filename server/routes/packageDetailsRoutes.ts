import { Router } from "express";
import axios from "axios";

const router = Router();

interface PackageInfo {
  name: string;
  "dist-tags": {
    latest: string;
  };
  time: Record<string, string>;
  versions: Record<string, any>;
}

interface NpmDownloads {
  downloads: number;
  start: string;
  end: string;
  package: string;
}

async function getPackageInfo(packageName: string): Promise<PackageInfo | null> {
  try {
    const response = await axios.get(`https://registry.npmjs.org/${packageName}`, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch package info for ${packageName}:`, error);
    return null;
  }
}

async function getPackageDownloads(packageName: string): Promise<number> {
  try {
    const response = await axios.get<NpmDownloads>(
      `https://api.npmjs.org/downloads/point/last-week/${packageName}`,
      { timeout: 10000 }
    );
    return response.data.downloads;
  } catch (error) {
    console.error(`Failed to fetch downloads for ${packageName}:`, error);
    return 0;
  }
}

function analyzeMaintenanceStatus(packageInfo: PackageInfo): 'active' | 'inactive' | 'deprecated' {
  const latestVersion = packageInfo["dist-tags"].latest;
  const lastPublished = new Date(packageInfo.time[latestVersion]);
  const now = new Date();
  const monthsSinceUpdate = (now.getTime() - lastPublished.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsSinceUpdate < 6) return 'active';
  if (monthsSinceUpdate < 24) return 'inactive';
  return 'deprecated';
}

function hasBreakingChanges(fromVersion: string, toVersion: string): boolean {
  try {
    const fromMajor = parseInt(fromVersion.split('.')[0]);
    const toMajor = parseInt(toVersion.split('.')[0]);
    return toMajor > fromMajor;
  } catch {
    return false;
  }
}

function calculateUpgradeComplexity(
  hasBreaking: boolean, 
  filesAffected: number, 
  methodsUsed: number
): 'low' | 'medium' | 'high' {
  if (hasBreaking && filesAffected > 5) return 'high';
  if (hasBreaking || filesAffected > 3 || methodsUsed > 5) return 'medium';
  return 'low';
}

function estimateWork(complexity: 'low' | 'medium' | 'high', filesAffected: number): string {
  switch (complexity) {
    case 'low':
      return '1-2 hours';
    case 'medium':
      return filesAffected > 5 ? '4-8 hours' : '2-4 hours';
    case 'high':
      return filesAffected > 10 ? '1-2 days' : '8-16 hours';
    default:
      return '2-4 hours';
  }
}

router.get('/package-details/:packageName', async (req, res) => {
  try {
    const { packageName } = req.params;
    
    const [packageInfo, weeklyDownloads] = await Promise.all([
      getPackageInfo(packageName),
      getPackageDownloads(packageName)
    ]);

    if (!packageInfo) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const latestVersion = packageInfo["dist-tags"].latest;
    const lastPublished = packageInfo.time[latestVersion];
    const maintainerStatus = analyzeMaintenanceStatus(packageInfo);
    
    // Mock usage data - in real implementation, this would come from AST analysis
    const usageData = {
      filesAffected: Math.floor(Math.random() * 8) + 1,
      methodsUsed: ['get', 'pick', 'merge', 'clone'].slice(0, Math.floor(Math.random() * 4) + 1),
      importPatterns: [
        `require("${packageName}")`,
        `import _ from "${packageName}"`
      ]
    };

    const currentVersion = "4.17.19"; // This should come from the vulnerability data
    const recommendedVersion = latestVersion;
    const hasBreaking = hasBreakingChanges(currentVersion, recommendedVersion);
    const upgradeComplexity = calculateUpgradeComplexity(
      hasBreaking, 
      usageData.filesAffected, 
      usageData.methodsUsed.length
    );

    const packageDetails = {
      name: packageName,
      currentVersion,
      latestVersion,
      recommendedVersion,
      weeklyDownloads,
      lastPublished: new Date(lastPublished).toISOString().split('T')[0],
      maintainerStatus,
      hasBreakingChanges: hasBreaking,
      usageInProject: usageData,
      upgradeComplexity,
      estimatedWork: estimateWork(upgradeComplexity, usageData.filesAffected)
    };

    res.json(packageDetails);
  } catch (error) {
    console.error('Failed to get package details:', error);
    res.status(500).json({ error: 'Failed to fetch package details' });
  }
});

export default router;