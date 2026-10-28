/*
 * SMILE Iloilo: the single frontend API client (window.SmileApi).
 *
 * Every call the frontend makes to the Apps Script backend goes through this file.
 *
 *  SmileApi method                         action=            Returns (fields of the JSON reply)
 *  ──────────────────────────────────────  ─────────────────  ─────────────────────────────────────
 *  places()                                places             { places: [...] }
 *  recommend(q, lang)                      recommend          { reply, places: [...] }
 *  acceptChallenge(user, placeId)          accept_challenge   { ... }
 *  vision(placeId, image)                  vision             { result }
 *  checkin({user, placeId, postcard, vs})  checkin            { stamp: {points}, total, rank }
 *  mailPostcard({user, postcard, placeId}) mail_postcard      { destination: {place, province}, chain_no }
 *  adoptPostcard(user, postcard)           adopt_postcard     { sender, rank, adopter_total }
 *  trackPostcard(postcard)                 track_postcard     { history: [...] }
 *  caption(place, mood)                    caption            { caption }
 *  merchant(name, raw)                     merchant           { listing }
 *  insights(q)                             insights           { insights }
 *  leaderboard()                           leaderboard        { board: [{name, stamps, rank}] }
 *  photobooth({...})                       photobooth         { image, place }
 *
 * Request strategy (Apps Script web apps cannot answer CORS preflight requests):
 *  - POST with Content-Type text/plain;charset=utf-8 and credentials omitted: a "simple request",
 *    so the browser sends it straight away with no preflight.
 *  - Every request has a timeout (AbortController). A timeout or network failure becomes a friendly
 *    message, never a raw browser error.
 *  - Replies may be flat ({ ok:true, places:[...] }) or wrapped ({ ok:true, data:{...} }); both work.
 *  - Non-JSON replies (for example a Google sign-in page because the deployment is not "Anyone")
 *    become BAD_RESPONSE errors.
 */
(function () {
  'use strict';

  var TIMEOUTS = {
    read: 30000,       // places, leaderboard, track
    ai: 60000,         // Isidro, captions, merchant, insights, vision
    write: 45000,      // check-in, mail, adopt, accept
    photobooth: 180000 // Muse moderation + Muse Image edit (+ Gemini backup) can take a while
  };

  var FRIENDLY = {
    NETWORK: 'We could not reach the SMILE server. Check your internet connection and try again.',
    TIMEOUT: 'The server is taking a long time to answer. Please try again.',
    BAD_RESPONSE: 'The server sent something we could not read. Check that the Apps Script Web App is deployed for "Anyone".',
    NOT_CONFIGURED: 'Demo mode: the app is not connected to its server yet (see config.js).',
    SERVER_ERROR: 'Something went wrong on the server. Please try again in a moment.'
  };

  function ApiError(code, message, opts) {
    var e = new Error(message);
    e.name = 'ApiError';
    e.code = code;
    e.isNetwork = !!(opts && opts.isNetwork);
    return e;
  }

  function config() { return window.SMILE_CONFIG || {}; }

  function isConfigured() {
    var url = String(config().API_URL || '');
    return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(url) && url.indexOf('PASTE_') === -1;
  }

  function normalize(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { throw ApiError('BAD_RESPONSE', FRIENDLY.BAD_RESPONSE); }
    if (!data || typeof data !== 'object' || typeof data.ok !== 'boolean') throw ApiError('BAD_RESPONSE', FRIENDLY.BAD_RESPONSE);
    if (data.ok) {
      if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) return Object.assign({}, data, data.data);
      return data;
    }
    var err = data.error;
    var code = (err && err.code) || 'ERROR';
    // SMILE backend error messages are written for visitors ("Postcard already used"), so show them.
    var msg = typeof err === 'string' ? err : (err && err.message) || FRIENDLY[code] || FRIENDLY.SERVER_ERROR;
    throw ApiError(String(code), String(msg));
  }

  function post(action, body, timeoutMs) {
    if (!isConfigured()) return Promise.reject(ApiError('NOT_CONFIGURED', FRIENDLY.NOT_CONFIGURED));
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || TIMEOUTS.read) : null;
    var init = {
      method: 'POST',
      redirect: 'follow',
      credentials: 'omit',
      cache: 'no-store',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({}, body || {}, { action: action }))
    };
    if (controller) init.signal = controller.signal;
    return fetch(config().API_URL, init).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) throw ApiError('HTTP_' + res.status, FRIENDLY.SERVER_ERROR);
      return res.text();
    }, function (err) {
      if (timer) clearTimeout(timer);
      if (err && err.name === 'AbortError') throw ApiError('TIMEOUT', FRIENDLY.TIMEOUT);
      throw ApiError('NETWORK', FRIENDLY.NETWORK, { isNetwork: true });
    }).then(normalize);
  }

  window.SmileApi = {
    ACTIONS: ['places', 'recommend', 'accept_challenge', 'vision', 'checkin', 'mail_postcard', 'adopt_postcard',
      'track_postcard', 'caption', 'merchant', 'insights', 'leaderboard', 'photobooth'],
    TIMEOUTS: TIMEOUTS,
    isConfigured: isConfigured,
    friendly: function (err) {
      if (!err) return FRIENDLY.SERVER_ERROR;
      return err.name === 'ApiError' && err.message ? err.message : FRIENDLY.SERVER_ERROR;
    },

    places: function () { return post('places', {}, TIMEOUTS.read); },
    recommend: function (q, lang) { return post('recommend', { q: q, lang: lang }, TIMEOUTS.ai); },
    acceptChallenge: function (user, placeId) { return post('accept_challenge', { user: user, place_id: placeId }, TIMEOUTS.write); },
    vision: function (placeId, image) { return post('vision', { place_id: placeId, image: image }, TIMEOUTS.ai); },
    checkin: function (o) {
      return post('checkin', { user: o.user, place_id: o.placeId, postcard: o.postcard, vision_status: o.visionStatus }, TIMEOUTS.write);
    },
    mailPostcard: function (o) { return post('mail_postcard', { user: o.user, postcard: o.postcard, place_id: o.placeId }, TIMEOUTS.write); },
    adoptPostcard: function (user, postcard) { return post('adopt_postcard', { user: user, postcard: postcard }, TIMEOUTS.write); },
    trackPostcard: function (postcard) { return post('track_postcard', { postcard: postcard }, TIMEOUTS.read); },
    caption: function (place, mood) { return post('caption', { place: place, mood: mood }, TIMEOUTS.ai); },
    merchant: function (name, raw) { return post('merchant', { merchant: name, raw: raw }, TIMEOUTS.ai); },
    insights: function (q) { return post('insights', { q: q }, TIMEOUTS.ai); },
    leaderboard: function () { return post('leaderboard', {}, TIMEOUTS.read); },
    photobooth: function (o) {
      return post('photobooth', { user: o.user, place_id: o.placeId, mode: 'ai', outfit: o.outfit, image: o.image, mime: o.mime }, TIMEOUTS.photobooth);
    }
  };
})();
