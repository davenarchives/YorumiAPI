import { Router } from 'express';
import { AniwatchScraper } from '../../scraper/aniwatch';
import axios from 'axios';

const router = Router();

// Anime scraper search (Aniwatch)
router.get('/search/scraper', async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
        res.status(400).json({ error: 'Query parameter "q" is required' });
        return;
    }

    const scraper = new AniwatchScraper();
    try {
        const results = await scraper.search(query);
        res.json({ data: results });
    } catch (error) {
        console.error('Aniwatch search error:', error);
        res.status(500).json({ error: 'Failed to search anime (scraper)' });
    } finally {
        try {
            await scraper.close();
        } catch {
            // best-effort cleanup
        }
    }
});

// Anime scraper episodes (Aniwatch)
router.get('/episodes/:session', async (req, res) => {
    const session = req.params.session;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const debug = req.query.debug === '1' || req.query.debug === 'true';

    if (!session) {
        res.status(400).json({ error: 'session is required' });
        return;
    }

    const scraper = new AniwatchScraper();
    try {
        const { episodes, lastPage, raw } = await scraper.getEpisodes(session, page, debug);
        const response: any = { episodes, lastPage, page };
        if (debug && raw) response.raw = raw;
        res.json(response);
    } catch (error) {
        console.error('Aniwatch episodes error:', error);
        res.status(500).json({ error: 'Failed to fetch episodes (scraper)' });
    } finally {
        try {
            await scraper.close();
        } catch {
            // best-effort cleanup
        }
    }
});

// Anime scraper episodes (Aniwatch) - fetch all pages
router.get('/episodes/:session/all', async (req, res) => {
    const session = req.params.session;
    if (!session) {
        res.status(400).json({ error: 'session is required' });
        return;
    }

    const scraper = new AniwatchScraper();
    try {
        const allEpisodes: any[] = [];
        let page = 1;
        let lastPage = 1;

        do {
            const result = await scraper.getEpisodes(session, page);
            if (Array.isArray(result.episodes)) {
                allEpisodes.push(...result.episodes);
            }
            lastPage = result.lastPage || page;
            page += 1;
        } while (page <= lastPage);

        res.json({ episodes: allEpisodes, total: allEpisodes.length, pages: lastPage });
    } catch (error) {
        console.error('Aniwatch episodes all-pages error:', error);
        res.status(500).json({ error: 'Failed to fetch episodes (scraper)' });
    } finally {
        try {
            await scraper.close();
        } catch {
            // best-effort cleanup
        }
    }
});
// Anime scraper links (Aniwatch)
router.get('/links/:session/:episode', async (req, res) => {
    const session = req.params.session;
    const episode = req.params.episode;
    
    if (!session || !episode) {
        res.status(400).json({ error: 'session and episode are required' });
        return;
    }

    const scraper = new AniwatchScraper();
    try {
        const streamInfo = await scraper.getLinks(session, episode);
        if (!streamInfo) throw new Error("No stream content");
        res.json({ data: streamInfo.sources, headers: streamInfo.headers, subtitles: streamInfo.subtitles });
    } catch (error) {
        console.error('Aniwatch links error:', error);
        res.status(500).json({ error: 'Failed to fetch links (scraper)' });
    } finally {
        try {
            await scraper.close();
        } catch {
            // best-effort cleanup
        }
    }
});

// Generic stream proxy to bypass hotlink protection
router.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    const referer = req.query.referer as string;
    
    if (!targetUrl) {
        res.status(400).send('Missing url parameter');
        return;
    }

    try {
        const headers: any = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        };
        if (referer) headers['Referer'] = referer;

        const response = await axios({
            method: 'get',
            url: targetUrl,
            headers: headers,
            responseType: 'arraybuffer' // Get as buffer to inspect and modify if it's an m3u8
        });

        const contentType = response.headers['content-type'] || '';
        res.set('Content-Type', contentType);

        // If it's an m3u8 playlist, we need to rewrite relative URLs
        if (contentType.includes('mpegurl') || contentType.includes('m3u8') || targetUrl.includes('.m3u8')) {
            let body = Buffer.from(response.data).toString('utf-8');
            
            // Base URL to resolve relative paths against
            const urlObj = new URL(targetUrl);
            const basePath = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

            const lines = body.split('\n');
            const rewrittenLines = lines.map(line => {
                const trimmed = line.trim();
                // Skip empty lines and comments/tags
                if (!trimmed || trimmed.startsWith('#')) {
                    // special case for URI tags that might have relative paths like #EXT-X-KEY:METHOD=AES-128,URI="relative.key"
                    if (trimmed.startsWith('#EXT-X-STREAM-INF:') || trimmed.startsWith('#EXT-X-MEDIA:') || trimmed.includes('URI=')) {
                        return trimmed.replace(/URI=[\"']([^\"']+)[\"']/, (match, uri) => {
                            // Always proxy ALL URI= values — both relative and absolute.
                            // This covers EXT-X-KEY encryption keys (.key files) which would otherwise
                            // be CORS-blocked when fetched directly by hls.js from the browser.
                            const absoluteUri = uri.startsWith('http')
                                ? uri
                                : (uri.startsWith('/') ? `${urlObj.origin}${uri}` : `${basePath}${uri}`);
                            return `URI="${req.protocol}://${req.get('host')}/api/anime/proxy?url=${encodeURIComponent(absoluteUri)}&referer=${encodeURIComponent(referer)}"`;
                        });
                    }
                    return line; 
                }
                
                // It's a segment URL or nested playlist URL
                if (!trimmed.startsWith('http')) {
                    const absoluteUrl = trimmed.startsWith('/') ? `${urlObj.origin}${trimmed}` : `${basePath}${trimmed}`;
                    
                    if (trimmed.includes('.m3u8')) {
                         // Nested playlist must also be proxied
                         return `${req.protocol}://${req.get('host')}/api/anime/proxy?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}`;
                    } else {
                         // .ts segments usually don't need the strict referer, so we can just return the absolute URL directly
                         // But to be safe against hotlinking protection on segments too, we proxy them as well
                         return `${req.protocol}://${req.get('host')}/api/anime/proxy?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}`;
                    }
                } else if (trimmed.includes('.m3u8')) {
                    // It's absolute but it's an m3u8, proxy it
                    return `${req.protocol}://${req.get('host')}/api/anime/proxy?url=${encodeURIComponent(trimmed)}&referer=${encodeURIComponent(referer)}`;
                }
                
                // Proxy absolute segment URLs too, just in case
                return `${req.protocol}://${req.get('host')}/api/anime/proxy?url=${encodeURIComponent(trimmed)}&referer=${encodeURIComponent(referer)}`;
            });

            res.send(rewrittenLines.join('\n'));
        } else {
            // Not an m3u8 (e.g. a .ts segment), just send the binary data
            res.send(response.data);
        }
    } catch (error: any) {
        console.error('Proxy error for URL:', targetUrl, error.message);
        res.status(error.response?.status || 500).send('Proxy error');
    }
});

export default router;