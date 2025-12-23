/**
 * EPG (Electronic Program Guide) Service
 * Handles EPG source management, fetching, parsing and channel mapping
 */

import pako from 'pako';

const EPG_STORAGE_KEY = 'epg_sources';
const EPG_DATA_KEY = 'epg_data';
const EPG_SETTINGS_KEY = 'epg_settings';

/**
 * Get all EPG sources from localStorage
 */
export const getEpgSources = () => {
  try {
    const sources = localStorage.getItem(EPG_STORAGE_KEY);
    return sources ? JSON.parse(sources) : [];
  } catch (error) {
    console.error('[EPG] Error loading sources:', error);
    return [];
  }
};

/**
 * Save EPG sources to localStorage
 */
export const saveEpgSources = (sources) => {
  try {
    localStorage.setItem(EPG_STORAGE_KEY, JSON.stringify(sources));
    return true;
  } catch (error) {
    console.error('[EPG] Error saving sources:', error);
    return false;
  }
};

/**
 * Add a new EPG source
 */
export const addEpgSource = (source) => {
  const sources = getEpgSources();
  const newSource = {
    id: Date.now().toString(),
    name: source.name,
    url: source.url,
    enabled: true,
    lastFetch: null,
    lastSuccess: null,
    channelCount: 0,
    programCount: 0,
    createdAt: new Date().toISOString()
  };
  sources.push(newSource);
  saveEpgSources(sources);
  return newSource;
};

/**
 * Update an existing EPG source
 */
export const updateEpgSource = (id, updates) => {
  const sources = getEpgSources();
  const index = sources.findIndex(s => s.id === id);
  if (index !== -1) {
    sources[index] = { ...sources[index], ...updates };
    saveEpgSources(sources);
    return sources[index];
  }
  return null;
};

/**
 * Delete an EPG source
 */
export const deleteEpgSource = (id) => {
  const sources = getEpgSources();
  const filtered = sources.filter(s => s.id !== id);
  saveEpgSources(filtered);
  return true;
};

/**
 * Get EPG settings
 */
export const getEpgSettings = () => {
  try {
    const settings = localStorage.getItem(EPG_SETTINGS_KEY);
    return settings ? JSON.parse(settings) : {
      autoUpdate: true,
      updateInterval: 6, // hours
      lastAutoUpdate: null,
      corsProxyUrl: 'https://api.allorigins.win/raw?url={URL}', // Default CORS proxy
      useCorsProxy: true
    };
  } catch (error) {
    console.error('[EPG] Error loading settings:', error);
    return {
      autoUpdate: true,
      updateInterval: 6,
      lastAutoUpdate: null,
      corsProxyUrl: 'https://api.allorigins.win/raw?url={URL}',
      useCorsProxy: true
    };
  }
};

/**
 * Save EPG settings
 */
export const saveEpgSettings = (settings) => {
  try {
    localStorage.setItem(EPG_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('[EPG] Error saving settings:', error);
    return false;
  }
};

/**
 * Download and decompress XML.gz file
 */
export const downloadEpgFile = async (url, onProgress) => {
  try {
    onProgress?.({ stage: 'downloading', progress: 0, message: 'Downloading EPG file...' });

    // Get EPG settings to check for CORS proxy configuration
    const settings = getEpgSettings();

    // Use configured CORS proxy if enabled
    let finalUrl = url;
    if (settings.useCorsProxy && settings.corsProxyUrl) {
      // Replace {URL} placeholder with the actual URL
      finalUrl = settings.corsProxyUrl.replace('{URL}', encodeURIComponent(url));
    }

    console.log('[EPG] Downloading from:', finalUrl);

    const response = await fetch(finalUrl, {
      mode: 'cors',
      headers: {
        'Accept': 'application/gzip, application/xml, */*'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;

      if (total > 0) {
        const progress = Math.round((loaded / total) * 100);
        onProgress?.({ stage: 'downloading', progress, message: `Downloading... ${progress}%` });
      }
    }

    // Combine chunks into single Uint8Array
    const compressedData = new Uint8Array(loaded);
    let position = 0;
    for (const chunk of chunks) {
      compressedData.set(chunk, position);
      position += chunk.length;
    }

    onProgress?.({ stage: 'decompressing', progress: 0, message: 'Decompressing...' });

    // Decompress using pako
    const decompressed = pako.ungzip(compressedData, { to: 'string' });

    onProgress?.({ stage: 'decompressing', progress: 100, message: 'Decompressed successfully' });

    return decompressed;
  } catch (error) {
    console.error('[EPG] Download error:', error);
    throw error;
  }
};

/**
 * Parse XMLTV format EPG data
 */
export const parseEpgXml = (xmlString, onProgress) => {
  try {
    onProgress?.({ stage: 'parsing', progress: 0, message: 'Parsing XML...' });

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('XML parsing error');
    }

    const channels = [];
    const programs = [];

    // Parse channels
    const channelElements = xmlDoc.querySelectorAll('channel');
    channelElements.forEach((channelEl, index) => {
      const channelId = channelEl.getAttribute('id');
      const displayName = channelEl.querySelector('display-name')?.textContent || '';
      const icon = channelEl.querySelector('icon')?.getAttribute('src') || '';

      channels.push({
        id: channelId,
        displayName,
        icon
      });

      if ((index + 1) % 10 === 0) {
        const progress = Math.round(((index + 1) / channelElements.length) * 50);
        onProgress?.({ stage: 'parsing', progress, message: `Parsing channels... ${index + 1}/${channelElements.length}` });
      }
    });

    // Parse programs
    const programElements = xmlDoc.querySelectorAll('programme');
    programElements.forEach((programEl, index) => {
      const channelId = programEl.getAttribute('channel');
      const start = programEl.getAttribute('start');
      const stop = programEl.getAttribute('stop');
      const title = programEl.querySelector('title')?.textContent || '';
      const desc = programEl.querySelector('desc')?.textContent || '';
      const category = programEl.querySelector('category')?.textContent || '';
      const icon = programEl.querySelector('icon')?.getAttribute('src') || '';

      programs.push({
        channelId,
        start: parseXmltvTime(start),
        stop: parseXmltvTime(stop),
        title,
        desc,
        category,
        icon
      });

      if ((index + 1) % 100 === 0) {
        const progress = 50 + Math.round(((index + 1) / programElements.length) * 50);
        onProgress?.({ stage: 'parsing', progress, message: `Parsing programs... ${index + 1}/${programElements.length}` });
      }
    });

    onProgress?.({ stage: 'parsing', progress: 100, message: `Parsed ${channels.length} channels, ${programs.length} programs` });

    return { channels, programs };
  } catch (error) {
    console.error('[EPG] Parse error:', error);
    throw error;
  }
};

/**
 * Parse XMLTV datetime format (YYYYMMDDHHmmss +ZZZZ)
 */
const parseXmltvTime = (timeStr) => {
  if (!timeStr) return null;

  // Format: 20231201120000 +0100
  const year = timeStr.substr(0, 4);
  const month = timeStr.substr(4, 2);
  const day = timeStr.substr(6, 2);
  const hour = timeStr.substr(8, 2);
  const minute = timeStr.substr(10, 2);
  const second = timeStr.substr(12, 2);

  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
};

/**
 * Store EPG data
 */
export const saveEpgData = (sourceId, data) => {
  try {
    const allData = getEpgData();
    allData[sourceId] = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(EPG_DATA_KEY, JSON.stringify(allData));
    return true;
  } catch (error) {
    console.error('[EPG] Error saving EPG data:', error);
    return false;
  }
};

/**
 * Get all EPG data
 */
export const getEpgData = () => {
  try {
    const data = localStorage.getItem(EPG_DATA_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('[EPG] Error loading EPG data:', error);
    return {};
  }
};

/**
 * Get EPG data for a specific source
 */
export const getEpgDataForSource = (sourceId) => {
  const allData = getEpgData();
  return allData[sourceId] || null;
};

/**
 * Get current and upcoming programs for a channel
 */
export const getChannelPrograms = (channelName, hours = 24) => {
  try {
    const allData = getEpgData();
    const now = new Date();
    const endTime = new Date(now.getTime() + (hours * 60 * 60 * 1000));

    const programs = [];

    // Search through all EPG sources
    Object.values(allData).forEach(sourceData => {
      if (!sourceData.programs) return;

      // Find matching channel by name (fuzzy match)
      const normalizedChannelName = channelName.toLowerCase().trim();

      sourceData.programs.forEach(program => {
        // Find channel info
        const channel = sourceData.channels.find(c => c.id === program.channelId);
        if (!channel) return;

        const normalizedDisplayName = channel.displayName.toLowerCase().trim();

        // Check if channel names match (fuzzy)
        if (normalizedDisplayName.includes(normalizedChannelName) ||
            normalizedChannelName.includes(normalizedDisplayName)) {

          const programStart = new Date(program.start);
          const programStop = new Date(program.stop);

          // Include programs that are current or upcoming within the time range
          if (programStop > now && programStart < endTime) {
            programs.push({
              ...program,
              channelName: channel.displayName
            });
          }
        }
      });
    });

    // Sort by start time
    programs.sort((a, b) => new Date(a.start) - new Date(b.start));

    return programs;
  } catch (error) {
    console.error('[EPG] Error getting channel programs:', error);
    return [];
  }
};

/**
 * Get current program for a channel
 */
export const getCurrentProgram = (channelName) => {
  const programs = getChannelPrograms(channelName, 1);
  const now = new Date();

  return programs.find(p => {
    const start = new Date(p.start);
    const stop = new Date(p.stop);
    return start <= now && stop > now;
  }) || null;
};

/**
 * Fetch and process EPG source
 */
export const fetchEpgSource = async (source, onProgress) => {
  try {
    // Download
    const xmlString = await downloadEpgFile(source.url, onProgress);

    // Parse
    const { channels, programs } = parseEpgXml(xmlString, onProgress);

    // Save
    onProgress?.({ stage: 'saving', progress: 0, message: 'Saving EPG data...' });
    saveEpgData(source.id, { channels, programs });

    // Update source metadata
    updateEpgSource(source.id, {
      lastFetch: new Date().toISOString(),
      lastSuccess: new Date().toISOString(),
      channelCount: channels.length,
      programCount: programs.length
    });

    onProgress?.({ stage: 'complete', progress: 100, message: 'EPG update complete!' });

    return { success: true, channels, programs };
  } catch (error) {
    // Update source with error
    updateEpgSource(source.id, {
      lastFetch: new Date().toISOString(),
      lastError: error.message
    });

    throw error;
  }
};

/**
 * Test EPG source (just download, don't save)
 */
export const testEpgSource = async (url, onProgress) => {
  try {
    const xmlString = await downloadEpgFile(url, onProgress);
    const { channels, programs } = parseEpgXml(xmlString, onProgress);

    return {
      success: true,
      channelCount: channels.length,
      programCount: programs.length,
      message: `Successfully parsed ${channels.length} channels and ${programs.length} programs`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  getEpgSources,
  saveEpgSources,
  addEpgSource,
  updateEpgSource,
  deleteEpgSource,
  getEpgSettings,
  saveEpgSettings,
  downloadEpgFile,
  parseEpgXml,
  saveEpgData,
  getEpgData,
  getEpgDataForSource,
  getChannelPrograms,
  getCurrentProgram,
  fetchEpgSource,
  testEpgSource
};
