import { Router } from 'express';
import { fetchCVEDetails, fetchSecurityAdvisories } from '../services/cveService';

const router = Router();

// Get detailed CVE information
router.get('/cve/:cveId', async (req, res) => {
  try {
    const { cveId } = req.params;
    
    if (!cveId || !cveId.match(/^CVE-\d{4}-\d{4,}$/)) {
      return res.status(400).json({ 
        error: 'Invalid CVE ID format. Expected format: CVE-YYYY-NNNN' 
      });
    }
    
    console.log(`Fetching CVE details for: ${cveId}`);
    const cveDetails = await fetchCVEDetails(cveId);
    
    if (!cveDetails) {
      return res.status(404).json({ 
        error: 'CVE not found',
        message: `No details found for ${cveId} in available databases`
      });
    }
    
    res.json(cveDetails);
  } catch (error) {
    console.error('Error fetching CVE details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch CVE details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get security advisories for a package
router.get('/advisories/:packageName', async (req, res) => {
  try {
    const { packageName } = req.params;
    
    if (!packageName) {
      return res.status(400).json({ error: 'Package name is required' });
    }
    
    console.log(`Fetching security advisories for: ${packageName}`);
    const advisories = await fetchSecurityAdvisories(packageName);
    
    res.json({
      package: packageName,
      advisories,
      count: advisories.length
    });
  } catch (error) {
    console.error('Error fetching security advisories:', error);
    res.status(500).json({ 
      error: 'Failed to fetch security advisories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Search CVEs by keyword or package
router.get('/search', async (req, res) => {
  try {
    const { q, package: packageName, severity, limit = 20 } = req.query;
    
    if (!q && !packageName) {
      return res.status(400).json({ 
        error: 'Search query or package name is required' 
      });
    }
    
    // This would implement CVE search functionality
    // For now, return a placeholder response
    res.json({
      query: q || packageName,
      results: [],
      message: 'CVE search functionality coming soon'
    });
  } catch (error) {
    console.error('Error searching CVEs:', error);
    res.status(500).json({ 
      error: 'Failed to search CVEs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get CVE statistics and trends
router.get('/stats', async (req, res) => {
  try {
    // This would implement CVE statistics
    res.json({
      totalCVEs: 0,
      recentCVEs: [],
      topSeverities: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      trendingVulnerabilities: [],
      message: 'CVE statistics functionality coming soon'
    });
  } catch (error) {
    console.error('Error fetching CVE stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch CVE statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;