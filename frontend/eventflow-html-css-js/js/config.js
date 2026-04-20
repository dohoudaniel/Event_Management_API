/* ============================================================
   config.js — Backend API base URL
   Change this ONE line when you deploy to production.

   Development:  http://127.0.0.1:8000
   Production:   https://eventflow-b919.onrender.com
   ============================================================ */

const API_BASE = 'http://127.0.0.1:8000';

window.API_BASE = API_BASE;
window.EventFlowConfig = Object.freeze({
  API_BASE,
});
