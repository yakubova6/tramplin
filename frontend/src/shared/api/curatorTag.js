import { httpJson, toQuery } from './http';

const BASE_URL = '/api/curator/tags';

export async function getModerationTags(params = {}) {
  const query = toQuery(params);
  return httpJson(`${BASE_URL}${query ? `?${query}` : ''}`);
}

export async function createCuratorTag(payload) {
  return httpJson(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getModerationTagById(id) {
  return httpJson(`${BASE_URL}/${id}`);
}

export async function getModerationTask(id) {
  return httpJson(`${BASE_URL}/${id}/moderation-task`);
}

export async function approveModerationTag(id) {
  return httpJson(`${BASE_URL}/${id}/approve`, {
    method: 'POST',
  });
}

export async function rejectModerationTag(id) {
  return httpJson(`${BASE_URL}/${id}/reject`, {
    method: 'POST',
  });
}