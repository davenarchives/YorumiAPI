import 'dotenv/config';
import axios from 'axios';
import express from 'express';
import cors from 'cors';

// Inject browser-like headers on every outgoing axios request.
// This applies to all axios calls including those made internally by @consumet/extensions,
// which helps bypass Cloudflare bot detection when running on cloud server IPs (Render etc.)
axios.interceptors.request.use((config) => {
    config.headers = config.headers || {};
    if (!config.headers['User-Agent']) {
        config.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    }
    if (!config.headers['Accept-Language']) {
        config.headers['Accept-Language'] = 'en-US,en;q=0.9';
    }
    if (!config.headers['Accept']) {
        config.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';
    }
    return config;
});

import anilistRoutes from './api/anilist/anilist.routes';
import { anilistService } from './api/anilist/anilist.service';
import mangaScraperRoutes from './api/scraper/mangascraper.routes';
import mangaAnilistRoutes from './api/manga/manga.anilist.routes';
import hianimeRoutes from './api/scraper/hianime.routes';
import animeScraperRoutes from './api/anime/anime.scraper.routes';
import userRoutes from './api/user/user.routes';

import { mappingService } from './api/mapping/mapping.service';
import { getAniListId } from './api/mapping/mapper';

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());


app.use('/api/anime', anilistRoutes);
app.use('/api/manga', mangaAnilistRoutes);
app.use('/api/manga/scraper', mangaScraperRoutes);
app.use('/api/anime', hianimeRoutes);
app.use('/api/anime', animeScraperRoutes);
app.use('/api/user', userRoutes);

// Legacy top aliases
app.get('/api/top/anime', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const perPage = req.query.limit ? parseInt(req.query.limit as string) : 24;
        const data = await anilistService.getTopAnime(page, perPage);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch top anime' });
    }
});

app.get('/api/top/manga', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const perPage = req.query.limit ? parseInt(req.query.limit as string) : 24;
        const data = await anilistService.getTopManga(page, perPage);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch top manga' });
    }
});

// Legacy seasonal alias
app.get('/api/anime/seasonal', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const perPage = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const data = await anilistService.getPopularThisSeason(page, perPage);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch seasonal anime' });
    }
});


app.get('/api/top/manga', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const perPage = req.query.limit ? parseInt(req.query.limit as string) : 24;
        const data = await anilistService.getTopManga(page, perPage);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch top manga' });
    }
});


app.get('/api/top/manga', (req, res, next) => {
    req.url = '/top' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    mangaAnilistRoutes(req, res, next as any);
});


// Mapping Routes
app.get('/api/mapping/:id', async (req, res) => {
    const mapping = await mappingService.getMapping(req.params.id);
    if (mapping) {
        res.json(mapping);
    } else {
        res.status(404).json({ message: 'Mapping not found' });
    }
});

app.post('/api/mapping', async (req, res) => {
    const { anilistId, scraperId, title } = req.body;
    if (!anilistId || !scraperId) {
        return res.status(400).json({ message: 'Missing anilistId or scraperId' });
    }
    const success = await mappingService.saveMapping(anilistId, scraperId, title);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ message: 'Failed to save mapping' });
    }
});

app.delete('/api/mapping/:id', async (req, res) => {
    const success = await mappingService.deleteMapping(req.params.id);
    if (success) {
        res.json({ success: true, deleted: req.params.id });
    } else {
        res.status(500).json({ message: 'Failed to delete mapping' });
    }
});

app.post('/api/mapping/identify', async (req, res) => {
    const { slug, title } = req.body;
    if (!slug || !title) {
        return res.status(400).json({ message: 'Missing slug or title' });
    }
    const anilistId = await getAniListId(slug, title);
    if (anilistId) {
        res.json({ anilistId });
    } else {
        res.status(404).json({ message: 'AniList ID not found' });
    }
});

app.get('/', (_req, res) => {
    res.send('Yorumi API is running');
});

app.listen(port, () => {
    console.log(`Yorumi API listening on http://localhost:${port}`);
});

export default app;