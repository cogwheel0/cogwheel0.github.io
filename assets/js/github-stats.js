/**
 * GitHub Repository Stats Fetcher
 * Dynamically fetches and displays repository statistics
 */

class GitHubStats {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.apiBase = 'https://api.github.com/repos';
  }

  /**
   * Extract repository owner and name from GitHub URL
   */
  parseGitHubUrl(url) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return null;
    
    return {
      owner: match[1],
      repo: match[2]
    };
  }

  /**
   * Fetch repository data from GitHub API
   */
  async fetchRepoData(owner, repo) {
    const cacheKey = `${owner}/${repo}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      // Fetch repository data and README in parallel
      const [repoResponse, readmeResponse] = await Promise.all([
        fetch(`${this.apiBase}/${owner}/${repo}`),
        fetch(`${this.apiBase}/${owner}/${repo}/readme`)
      ]);
      
      if (!repoResponse.ok) {
        if (repoResponse.status === 403) {
          console.warn('GitHub API rate limit exceeded');
          return null;
        }
        throw new Error(`GitHub API error: ${repoResponse.status}`);
      }

      const repoData = await repoResponse.json();
      let readmeTitle = null;

      // Try to get README title if available
      if (readmeResponse.ok) {
        try {
          const readmeData = await readmeResponse.json();
          readmeTitle = await this.extractReadmeTitle(readmeData.content);
        } catch (error) {
          console.log('Could not fetch README title:', error);
        }
      }

      // Combine repo data with README title
      const combinedData = {
        ...repoData,
        readmeTitle: readmeTitle
      };
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: combinedData,
        timestamp: Date.now()
      });

      return combinedData;
    } catch (error) {
      console.error('Error fetching GitHub data:', error);
      return null;
    }
  }

  /**
   * Extract title from README content
   */
  async extractReadmeTitle(base64Content) {
    try {
      // Decode base64 content
      const content = atob(base64Content);
      
      // Look for the first H1 heading (# Title)
      const h1Match = content.match(/^#\s+(.+)$/m);
      if (h1Match) {
        const title = h1Match[1].trim();
        console.log('Found README H1 title:', title);
        return title;
      }

      // Fallback: look for HTML h1 tags
      const htmlH1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (htmlH1Match) {
        const title = htmlH1Match[1].trim();
        console.log('Found README HTML H1 title:', title);
        return title;
      }

      console.log('No H1 title found in README');
      return null;
    } catch (error) {
      console.error('Error parsing README content:', error);
      return null;
    }
  }

  /**
   * Format large numbers (e.g., 1234 -> 1.2k)
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  /**
   * Update project card with GitHub data
   */
  updateProjectCard(card, data) {
    // Update project title if it exists
    const titleLink = card.querySelector('.project-title .project-link');
    if (titleLink && data) {
      let projectName;
      
      // Prefer README H1 title, fallback to repository name
      if (data.readmeTitle) {
        projectName = data.readmeTitle;
      } else if (data.name) {
        // Use the formatted repository name as fallback
        projectName = data.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      } else {
        projectName = 'Unknown Project';
      }
      
      titleLink.textContent = projectName;
    }

    // Update project description
    const descriptionElement = card.querySelector('.project-description');
    if (descriptionElement && data.description) {
      descriptionElement.textContent = data.description;
    } else if (descriptionElement) {
      descriptionElement.textContent = 'No description available.';
    }

    // Create and add stats
    const metaDiv = card.querySelector('.project-meta');
    if (metaDiv) {
      // Remove any existing content
      metaDiv.innerHTML = '';

      // Add GitHub stats
      const statsEl = this.createStatsElement(data);
      metaDiv.appendChild(statsEl);
    }
  }
  createStatsElement(data) {
    const stats = document.createElement('div');
    stats.className = 'project-stats';
    
    const items = [];
    
    // Stars
    if (data.stargazers_count !== undefined) {
      items.push(`
        <span class="stat-item">
          <svg class="stat-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
          </svg>
          ${this.formatNumber(data.stargazers_count)}
        </span>
      `);
    }
    
    // Forks
    if (data.forks_count !== undefined) {
      items.push(`
        <span class="stat-item">
          <svg class="stat-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.25 2.25 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z"/>
          </svg>
          ${this.formatNumber(data.forks_count)}
        </span>
      `);
    }
    
    // Language
    if (data.language) {
      items.push(`
        <span class="stat-item stat-language">
          <span class="language-dot"></span>
          ${data.language}
        </span>
      `);
    }
    
    stats.innerHTML = items.join('');
    return stats;
  }

  /**
   * Add loading state to project card
   */
  createLoadingElement() {
    const loading = document.createElement('div');
    loading.className = 'project-stats project-stats--loading';
    loading.innerHTML = `
      <span class="stat-item">
        <span class="loading-dot"></span>
        Loading stats...
      </span>
    `;
    return loading;
  }

  /**
   * Initialize GitHub stats for all project cards
   */
  async init() {
    const projectCards = document.querySelectorAll('.project-card');
    
    for (const card of projectCards) {
      const link = card.querySelector('.project-link[href*="github.com"]');
      if (!link) continue;

      const repoInfo = this.parseGitHubUrl(link.href);
      if (!repoInfo) continue;

      // Add loading state
      const loadingEl = this.createLoadingElement();
      const metaDiv = card.querySelector('.project-meta');
      if (metaDiv) {
        metaDiv.appendChild(loadingEl);
      }

      // Fetch and display stats
      try {
        const data = await this.fetchRepoData(repoInfo.owner, repoInfo.repo);
        
        // Remove loading state
        if (loadingEl && loadingEl.parentNode) {
          loadingEl.parentNode.removeChild(loadingEl);
        }

        if (data && metaDiv) {
          this.updateProjectCard(card, data);
        }
      } catch (error) {
        console.error('Error processing repository stats:', error);
        
        // Remove loading state on error
        if (loadingEl && loadingEl.parentNode) {
          loadingEl.parentNode.removeChild(loadingEl);
        }
      }
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const githubStats = new GitHubStats();
  githubStats.init();
});
