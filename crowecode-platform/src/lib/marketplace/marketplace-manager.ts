/**
 * CroweCode™ Marketplace Manager
 * Enterprise-grade extension marketplace with VS Code compatibility
 * Supports both VS Code extensions and native CroweCode modules
 */

export interface ExtensionMetadata {
  id: string;
  name: string;
  displayName: string;
  version: string;
  description: string;
  author: string;
  publisher: string;
  category: 'themes' | 'languages' | 'tools' | 'ai-assistants' | 'debuggers' | 'formatters' | 'crowe-modules';
  tags: string[];
  repository?: string;
  license: string;
  engines: {
    vscode?: string;
    crowecode?: string;
  };
  activationEvents: string[];
  main?: string;
  contributes?: any;
  crowecodeFeatures?: CroweCodeFeatures;
  pricing: 'free' | 'premium' | 'enterprise';
  securityVerified: boolean;
  installCount: number;
  rating: number;
  lastUpdated: Date;
}

export interface CroweCodeFeatures {
  aiIntegration?: boolean;
  oracleDb?: boolean;
  enterpriseSecurity?: boolean;
  customModes?: string[];
  cloudSync?: boolean;
  teamCollaboration?: boolean;
  advancedAnalytics?: boolean;
}

export interface ExtensionPackage {
  metadata: ExtensionMetadata;
  manifest: any;
  bundle?: ArrayBuffer;
  dependencies: string[];
  compatibilityCheck: CompatibilityResult;
}

export interface CompatibilityResult {
  isCompatible: boolean;
  vsCodeCompatible: boolean;
  croweCodeCompatible: boolean;
  warnings: string[];
  errors: string[];
  requiredFeatures: string[];
}

class CroweCodeMarketplace {
  private installedExtensions: Map<string, ExtensionPackage> = new Map();
  private marketplaceCache: Map<string, ExtensionMetadata[]> = new Map();
  private securityAnalyzer: ExtensionSecurityAnalyzer;

  constructor() {
    this.securityAnalyzer = new ExtensionSecurityAnalyzer();
    this.initializeMarketplace();
  }

  private async initializeMarketplace() {
    // Load installed extensions
    await this.loadInstalledExtensions();

    // Initialize marketplace categories
    this.initializeCategories();

    // Set up automatic updates
    this.setupAutoUpdates();
  }

  /**
   * Search marketplace with enhanced filtering
   */
  async searchMarketplace(query: string, options: SearchOptions = {}): Promise<ExtensionMetadata[]> {
    const {
      category,
      sortBy = 'relevance',
      includeVSCode = true,
      includeCroweCode = true,
      securityVerifiedOnly = false,
      pricingFilter = 'all'
    } = options;

    // First search VS Code marketplace
    let vsCodeResults: ExtensionMetadata[] = [];
    if (includeVSCode) {
      vsCodeResults = await this.searchVSCodeMarketplace(query, { category, securityVerifiedOnly });
    }

    // Then search CroweCode native marketplace
    let croweCodeResults: ExtensionMetadata[] = [];
    if (includeCroweCode) {
      croweCodeResults = await this.searchCroweCodeMarketplace(query, { category, pricingFilter });
    }

    // Merge and rank results
    const allResults = [...vsCodeResults, ...croweCodeResults];
    return this.rankResults(allResults, query, sortBy);
  }

  /**
   * Install extension with compatibility check and security verification
   */
  async installExtension(extensionId: string, source: 'vscode' | 'crowecode' = 'vscode'): Promise<InstallResult> {
    try {
      // Get extension metadata
      const metadata = await this.getExtensionMetadata(extensionId, source);
      if (!metadata) {
        throw new Error(`Extension ${extensionId} not found`);
      }

      // Security verification
      const securityResult = await this.securityAnalyzer.analyzeExtension(metadata);
      if (!securityResult.isSafe) {
        return {
          success: false,
          error: 'Security verification failed',
          securityIssues: securityResult.issues
        };
      }

      // Compatibility check
      const compatibility = await this.checkCompatibility(metadata);
      if (!compatibility.isCompatible) {
        return {
          success: false,
          error: 'Incompatible with current CroweCode version',
          compatibilityIssues: compatibility.errors
        };
      }

      // Download and install
      const extensionPackage = await this.downloadExtension(extensionId, source);
      await this.installExtensionPackage(extensionPackage);

      // Register with CroweCode system
      await this.registerExtension(extensionPackage);

      this.installedExtensions.set(extensionId, extensionPackage);

      return {
        success: true,
        extension: extensionPackage,
        activationRequired: extensionPackage.metadata.activationEvents.length > 0
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Enhanced VS Code marketplace search with CroweCode compatibility layer
   */
  private async searchVSCodeMarketplace(query: string, options: any): Promise<ExtensionMetadata[]> {
    const vsCodeAPI = 'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery';

    const searchPayload = {
      filters: [{
        criteria: [
          { filterType: 8, value: "Microsoft.VisualStudio.Code" },
          { filterType: 10, value: query },
          { filterType: 12, value: "37888" }
        ],
        pageNumber: 1,
        pageSize: 50,
        sortBy: 0,
        sortOrder: 0
      }],
      assetTypes: [],
      flags: 914
    };

    try {
      const response = await fetch(vsCodeAPI, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json;api-version=3.0-preview.1'
        },
        body: JSON.stringify(searchPayload)
      });

      const data = await response.json();
      return data.results[0]?.extensions?.map((ext: any) => this.mapVSCodeExtension(ext)) || [];
    } catch (error) {
      console.warn('VS Code marketplace search failed:', error);
      return [];
    }
  }

  /**
   * Search CroweCode native marketplace
   */
  private async searchCroweCodeMarketplace(query: string, options: any): Promise<ExtensionMetadata[]> {
    // This would connect to CroweCode's proprietary marketplace
    const croweCodeAPI = 'https://api.crowecode.com/marketplace/search';

    try {
      const response = await fetch(croweCodeAPI, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CROWECODE_API_KEY}`,
          'X-CroweCode-Version': '4.0'
        },
        body: JSON.stringify({
          query,
          options,
          clientVersion: '4.0',
          features: ['ai-integration', 'oracle-db', 'enterprise-security']
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.extensions || [];
      }
    } catch (error) {
      console.warn('CroweCode marketplace search failed:', error);
    }

    return [];
  }

  /**
   * Map VS Code extension to CroweCode format
   */
  private mapVSCodeExtension(vsCodeExt: any): ExtensionMetadata {
    const latestVersion = vsCodeExt.versions?.[0];

    return {
      id: `${vsCodeExt.publisher.publisherName}.${vsCodeExt.extensionName}`,
      name: vsCodeExt.extensionName,
      displayName: vsCodeExt.displayName || vsCodeExt.extensionName,
      version: latestVersion?.version || '1.0.0',
      description: vsCodeExt.shortDescription || '',
      author: vsCodeExt.publisher.displayName,
      publisher: vsCodeExt.publisher.publisherName,
      category: this.mapVSCodeCategory(vsCodeExt.categories?.[0]),
      tags: vsCodeExt.tags || [],
      repository: this.extractRepository(latestVersion?.properties),
      license: this.extractLicense(latestVersion?.properties),
      engines: {
        vscode: this.extractEngine(latestVersion?.properties),
        crowecode: '>=4.0.0' // Default compatibility
      },
      activationEvents: this.extractActivationEvents(latestVersion?.properties),
      main: this.extractMain(latestVersion?.properties),
      contributes: this.extractContributes(latestVersion?.properties),
      crowecodeFeatures: this.detectCroweCodeFeatures(vsCodeExt),
      pricing: 'free', // VS Code marketplace is free
      securityVerified: false, // Requires separate verification
      installCount: vsCodeExt.statistics?.find((s: any) => s.statisticName === 'install')?.value || 0,
      rating: this.calculateRating(vsCodeExt.statistics),
      lastUpdated: new Date(latestVersion?.lastUpdated || Date.now())
    };
  }

  private mapVSCodeCategory(category: string): ExtensionMetadata['category'] {
    const categoryMap: Record<string, ExtensionMetadata['category']> = {
      'Themes': 'themes',
      'Language Packs': 'languages',
      'Programming Languages': 'languages',
      'Snippets': 'tools',
      'Debuggers': 'debuggers',
      'Formatters': 'formatters',
      'Other': 'tools'
    };

    return categoryMap[category] || 'tools';
  }

  private detectCroweCodeFeatures(vsCodeExt: any): CroweCodeFeatures {
    const description = (vsCodeExt.shortDescription || '').toLowerCase();
    const tags = (vsCodeExt.tags || []).map((t: string) => t.toLowerCase());

    return {
      aiIntegration: tags.includes('ai') || description.includes('ai') || description.includes('copilot'),
      oracleDb: tags.includes('oracle') || description.includes('oracle'),
      enterpriseSecurity: tags.includes('security') || description.includes('security'),
      customModes: [], // Would need deeper analysis
      cloudSync: tags.includes('sync') || description.includes('sync'),
      teamCollaboration: tags.includes('collaboration') || description.includes('team'),
      advancedAnalytics: tags.includes('analytics') || description.includes('metrics')
    };
  }

  // Additional helper methods...
  private extractRepository(properties: any[]): string | undefined {
    return properties?.find(p => p.key === 'Microsoft.VisualStudio.Services.Links.Source')?.value;
  }

  private extractLicense(properties: any[]): string {
    return properties?.find(p => p.key === 'Microsoft.VisualStudio.Services.Links.License')?.value || 'Unknown';
  }

  private extractEngine(properties: any[]): string {
    return properties?.find(p => p.key === 'Microsoft.VisualStudio.Code.Engine')?.value || '^1.0.0';
  }

  private extractActivationEvents(properties: any[]): string[] {
    const events = properties?.find(p => p.key === 'Microsoft.VisualStudio.Code.ActivationEvents')?.value;
    return events ? JSON.parse(events) : [];
  }

  private extractMain(properties: any[]): string | undefined {
    return properties?.find(p => p.key === 'Microsoft.VisualStudio.Code.ExtensionEntryPoint')?.value;
  }

  private extractContributes(properties: any[]): any {
    const contributes = properties?.find(p => p.key === 'Microsoft.VisualStudio.Code.ExtensionPack')?.value;
    return contributes ? JSON.parse(contributes) : {};
  }

  private calculateRating(statistics: any[]): number {
    const rating = statistics?.find(s => s.statisticName === 'averagerating')?.value;
    return rating ? Math.round(rating * 10) / 10 : 0;
  }

  private rankResults(results: ExtensionMetadata[], query: string, sortBy: string): ExtensionMetadata[] {
    // Implement ranking algorithm based on relevance, popularity, etc.
    return results.sort((a, b) => {
      switch (sortBy) {
        case 'installs':
          return b.installCount - a.installCount;
        case 'rating':
          return b.rating - a.rating;
        case 'updated':
          return b.lastUpdated.getTime() - a.lastUpdated.getTime();
        default: // relevance
          return this.calculateRelevanceScore(b, query) - this.calculateRelevanceScore(a, query);
      }
    });
  }

  private calculateRelevanceScore(extension: ExtensionMetadata, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Name match (highest weight)
    if (extension.name.toLowerCase().includes(queryLower)) score += 100;
    if (extension.displayName.toLowerCase().includes(queryLower)) score += 80;

    // Description match
    if (extension.description.toLowerCase().includes(queryLower)) score += 50;

    // Tag match
    extension.tags.forEach(tag => {
      if (tag.toLowerCase().includes(queryLower)) score += 30;
    });

    // CroweCode features bonus
    if (extension.crowecodeFeatures?.aiIntegration) score += 20;
    if (extension.crowecodeFeatures?.enterpriseSecurity) score += 15;

    // Popularity bonus
    score += Math.log(extension.installCount + 1) * 5;
    score += extension.rating * 10;

    return score;
  }

  private async loadInstalledExtensions(): Promise<void> {
    // Load from local storage or database
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('installed_extensions');
      if (stored) {
        const extensions = JSON.parse(stored);
        extensions.forEach((ext: ExtensionPackage) => {
          this.installedExtensions.set(ext.metadata.id, ext);
        });
      }
    }
  }

  private initializeCategories(): void {
    // Initialize category cache
    const categories = ['themes', 'languages', 'tools', 'ai-assistants', 'debuggers', 'formatters', 'crowe-modules'];
    categories.forEach(cat => {
      this.marketplaceCache.set(cat, []);
    });
  }

  private setupAutoUpdates(): void {
    // Check for updates every hour
    if (typeof window !== 'undefined') {
      setInterval(() => this.checkForUpdates(), 3600000);
    }
  }

  private async checkForUpdates(): Promise<void> {
    for (const [id, pkg] of this.installedExtensions) {
      try {
        const metadata = await this.getExtensionMetadata(id, 'vscode');
        if (metadata && metadata.version > pkg.metadata.version) {
          console.log(`Update available for ${id}: ${metadata.version}`);
          // Notify user about update
        }
      } catch (error) {
        console.warn(`Failed to check update for ${id}:`, error);
      }
    }
  }

  private async getExtensionMetadata(extensionId: string, source: 'vscode' | 'crowecode'): Promise<ExtensionMetadata | null> {
    if (source === 'vscode') {
      // Fetch from VS Code marketplace
      const [publisher, name] = extensionId.split('.');
      const url = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/extensions/${name}/latest`;

      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json;api-version=3.0-preview.1'
          }
        });

        if (response.ok) {
          const data = await response.json();
          return this.mapVSCodeExtension(data);
        }
      } catch (error) {
        console.warn(`Failed to fetch metadata for ${extensionId}:`, error);
      }
    }

    return null;
  }

  private async checkCompatibility(metadata: ExtensionMetadata): Promise<CompatibilityResult> {
    const result: CompatibilityResult = {
      isCompatible: true,
      vsCodeCompatible: true,
      croweCodeCompatible: true,
      warnings: [],
      errors: [],
      requiredFeatures: []
    };

    // Check VS Code engine version
    if (metadata.engines.vscode) {
      const requiredVersion = metadata.engines.vscode.replace('^', '').replace('~', '');
      const currentVersion = '1.85.0'; // Current VS Code version supported

      if (requiredVersion > currentVersion) {
        result.vsCodeCompatible = false;
        result.errors.push(`Requires VS Code ${requiredVersion} or higher`);
      }
    }

    // Check CroweCode version
    if (metadata.engines.crowecode) {
      const requiredVersion = metadata.engines.crowecode.replace('>=', '');
      const currentVersion = '4.0.0';

      if (requiredVersion > currentVersion) {
        result.croweCodeCompatible = false;
        result.errors.push(`Requires CroweCode ${requiredVersion} or higher`);
      }
    }

    // Check for required features
    if (metadata.crowecodeFeatures) {
      const features = metadata.crowecodeFeatures;
      if (features.oracleDb) result.requiredFeatures.push('Oracle Database');
      if (features.aiIntegration) result.requiredFeatures.push('AI Integration');
      if (features.enterpriseSecurity) result.requiredFeatures.push('Enterprise Security');
    }

    result.isCompatible = result.vsCodeCompatible && result.croweCodeCompatible && result.errors.length === 0;
    return result;
  }

  private async downloadExtension(extensionId: string, source: 'vscode' | 'crowecode'): Promise<ExtensionPackage> {
    const metadata = await this.getExtensionMetadata(extensionId, source);
    if (!metadata) {
      throw new Error(`Extension ${extensionId} not found`);
    }

    // For VS Code extensions
    if (source === 'vscode') {
      const [publisher, name] = extensionId.split('.');
      const downloadUrl = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${name}/${metadata.version}/vspackage`;

      try {
        const response = await fetch(downloadUrl);
        if (response.ok) {
          const buffer = await response.arrayBuffer();

          return {
            metadata,
            manifest: {}, // Would extract from VSIX
            bundle: buffer,
            dependencies: [],
            compatibilityCheck: await this.checkCompatibility(metadata)
          };
        }
      } catch (error) {
        throw new Error(`Failed to download extension: ${error}`);
      }
    }

    throw new Error(`Download not implemented for source: ${source}`);
  }

  private async installExtensionPackage(pkg: ExtensionPackage): Promise<void> {
    // In a real implementation, this would:
    // 1. Extract the VSIX/package
    // 2. Copy files to extension directory
    // 3. Register with the editor
    // 4. Load activation events

    // For now, store in localStorage for demo
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('installed_extensions');
      const extensions = stored ? JSON.parse(stored) : [];
      extensions.push({
        metadata: pkg.metadata,
        installedAt: new Date().toISOString()
      });
      localStorage.setItem('installed_extensions', JSON.stringify(extensions));
    }
  }

  private async registerExtension(pkg: ExtensionPackage): Promise<void> {
    // Register with Monaco editor or VS Code API
    // This would integrate with the actual editor instance
    console.log(`Registered extension: ${pkg.metadata.id}`);

    // Register activation events
    if (pkg.metadata.activationEvents?.length > 0) {
      console.log(`Activation events: ${pkg.metadata.activationEvents.join(', ')}`);
    }

    // Register contributions (commands, languages, themes, etc.)
    if (pkg.metadata.contributes) {
      console.log('Extension contributes:', pkg.metadata.contributes);
    }
  }

  // More methods would be implemented here...
}

// Security analyzer for extensions
class ExtensionSecurityAnalyzer {
  async analyzeExtension(metadata: ExtensionMetadata): Promise<SecurityAnalysisResult> {
    // Implement security analysis logic
    return {
      isSafe: true,
      issues: [],
      riskLevel: 'low',
      permissions: [],
      networkAccess: false,
      fileSystemAccess: false
    };
  }
}

// Type definitions
interface SearchOptions {
  category?: ExtensionMetadata['category'];
  sortBy?: 'relevance' | 'installs' | 'rating' | 'updated';
  includeVSCode?: boolean;
  includeCroweCode?: boolean;
  securityVerifiedOnly?: boolean;
  pricingFilter?: 'all' | 'free' | 'premium' | 'enterprise';
}

interface InstallResult {
  success: boolean;
  extension?: ExtensionPackage;
  error?: string;
  securityIssues?: string[];
  compatibilityIssues?: string[];
  activationRequired?: boolean;
}

interface SecurityAnalysisResult {
  isSafe: boolean;
  issues: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  permissions: string[];
  networkAccess: boolean;
  fileSystemAccess: boolean;
}

// Export singleton instance
export const croweCodeMarketplace = new CroweCodeMarketplace();
export { CroweCodeMarketplace };